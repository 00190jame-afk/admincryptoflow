import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Create Supabase client for user authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    })

    // Get current user from JWT
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log('User ID:', user.id)

    // Check admin permissions using service role client
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: adminProfile, error: adminError } = await supabaseService
      .from('admin_profiles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminProfile) {
      console.log('Admin check failed:', adminError)
      return new Response(
        JSON.stringify({ error: 'Access denied: Not an admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin profile:', adminProfile)

    // Get trade ID from request body
    const { tradeId } = await req.json()
    if (!tradeId) {
      throw new Error('Trade ID is required')
    }

    console.log('Setting trade as win:', tradeId)

    // Get the full trade details
    const { data: trade, error: tradeError } = await supabaseService
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('status', 'pending')
      .single()

    if (tradeError || !trade) {
      return new Response(
        JSON.stringify({ error: 'Trade not found or not pending' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For regular admins, check if they have permission for this user's trade
    if (adminProfile.role !== 'super_admin') {
      const { data: assignedUsers, error: assignedError } = await supabaseService
        .rpc('get_admin_assigned_users', { p_admin_user_id: user.id })

      if (assignedError) {
        console.error('Error checking assigned users:', assignedError)
        throw new Error('Permission check failed')
      }

      const hasPermission = assignedUsers.some((assignedUser: any) => assignedUser.user_id === trade.user_id)
      
      if (!hasPermission) {
        return new Response(
          JSON.stringify({ error: 'Access denied: You can only manage trades from your assigned users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const now = new Date()
    const endsAt = trade.ends_at ? new Date(trade.ends_at) : null

    // Check if trade period has ended
    if (endsAt && now >= endsAt) {
      // Finalize immediately - trade period is over
      console.log('Trade period ended, finalizing WIN immediately')
      
      // Step 1: Get positions for this trade
      const { data: positions, error: posError } = await supabaseService
        .from('positions_orders')
        .select('*')
        .eq('trade_id', tradeId)

      if (posError) {
        console.error('Error fetching positions:', posError)
        throw new Error('Failed to fetch positions')
      }

      console.log('Found positions:', positions?.length || 0)

      // Step 2: Calculate profit amount (profit_rate is stored as percentage, e.g. 30 = 30%)
      const profitAmount = trade.stake_amount * ((trade.profit_rate || 85) / 100)
      const totalPayout = trade.stake_amount + profitAmount

      console.log('Profit calculation:', { 
        stake: trade.stake_amount, 
        profitRate: trade.profit_rate, 
        profitAmount, 
        totalPayout 
      })

      // Step 3: Create closing orders from positions
      if (positions && positions.length > 0) {
        const closingOrders = positions.map(po => ({
          user_id: po.user_id,
          symbol: po.symbol,
          side: po.side,
          leverage: po.leverage,
          entry_price: po.entry_price,
          exit_price: trade.current_price || po.mark_price || po.entry_price,
          quantity: po.quantity,
          realized_pnl: Math.round(profitAmount * 100) / 100,
          original_trade_id: tradeId,
          stake: po.stake,
          scale: po.scale
        }))

        const { error: closeError } = await supabaseService
          .from('closing_orders')
          .insert(closingOrders)

        if (closeError) {
          console.error('Error creating closing orders:', closeError)
          throw new Error('Failed to create closing orders')
        }

        console.log('Created closing orders:', closingOrders.length)

        // Step 4: Delete positions
        const { error: deleteError } = await supabaseService
          .from('positions_orders')
          .delete()
          .eq('trade_id', tradeId)

        if (deleteError) {
          console.error('Error deleting positions:', deleteError)
          throw new Error('Failed to delete positions')
        }

        console.log('Deleted positions')
      }

      // Step 5: Pay user (stake was already deducted, now return stake + profit)
      const { error: balanceError } = await supabaseService
        .rpc('update_user_balance', {
          p_user_id: trade.user_id,
          p_amount: totalPayout,
          p_transaction_type: 'system_trade',
          p_description: 'Trade win payout',
          p_trade_id: tradeId
        })

      if (balanceError) {
        console.error('Error updating balance:', balanceError)
        throw new Error('Failed to update user balance')
      }

      console.log('User balance updated with payout:', totalPayout)

      // Step 6: Mark trade as complete
      const { data: updatedTrade, error: updateError } = await supabaseService
        .from('trades')
        .update({
          status: 'win',
          result: 'win',
          decision: 'win',
          profit_loss_amount: profitAmount,
          completed_at: new Date().toISOString(),
          status_indicator: '⚪️ COMPLETED'
        })
        .eq('id', tradeId)
        .select('id, status, result, profit_loss_amount, completed_at')
        .single()

      if (updateError) {
        console.error('Error updating trade:', updateError)
        throw new Error(`Failed to update trade: ${updateError.message}`)
      }

      console.log('Trade finalized as WIN:', updatedTrade)

      return new Response(
        JSON.stringify({ success: true, data: updatedTrade, finalized: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // Trade period not over yet - just set decision, don't finalize
      console.log('Trade period not ended yet, setting decision=win only')
      
      const { data: updatedTrade, error: updateError } = await supabaseService
        .from('trades')
        .update({
          decision: 'win',
          status_indicator: '🟢 WIN PENDING'
        })
        .eq('id', tradeId)
        .select('id, decision, status_indicator, ends_at')
        .single()

      if (updateError) {
        console.error('Error updating trade decision:', updateError)
        throw new Error(`Failed to update trade: ${updateError.message}`)
      }

      console.log('Trade decision set to WIN (pending finalization at ends_at):', updatedTrade)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedTrade, 
          finalized: false,
          message: `Trade will be finalized as WIN when period ends at ${trade.ends_at}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in set-trade-win function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

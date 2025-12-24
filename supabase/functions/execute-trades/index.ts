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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Executing pending trades...')

    // Find all trades ready to execute
    const { data: pendingTrades, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('status', 'pending')
      .not('execute_at', 'is', null)
      .lte('execute_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching pending trades:', fetchError)
      throw new Error(`Failed to fetch pending trades: ${fetchError.message}`)
    }

    console.log(`Found ${pendingTrades?.length || 0} trades ready to execute`)

    const results = []

    for (const trade of pendingTrades || []) {
      try {
      // Determine result based on decision (default to loss if no decision)
        const result = trade.decision || 'lose'
        
        // Calculate profit/loss amount
        // profit_rate is stored as percentage (e.g., 30 means 30%), so divide by 100
        let profitAmount: number
        if (result === 'win') {
          profitAmount = trade.stake_amount * (trade.profit_rate / 100)
        } else {
          profitAmount = -trade.stake_amount
        }

        console.log(`Processing trade ${trade.id}: decision=${trade.decision}, result=${result}, profit_rate=${trade.profit_rate}%, profit=${profitAmount}`)

        // Update the trade
        const { error: updateError } = await supabase
          .from('trades')
          .update({
            status: result,
            result: result,
            profit_loss_amount: profitAmount,
            completed_at: new Date().toISOString(),
            status_indicator: '⚪️ COMPLETED'
          })
          .eq('id', trade.id)
          .eq('status', 'pending') // Safety check

        if (updateError) {
          console.error(`Error updating trade ${trade.id}:`, updateError)
          results.push({ tradeId: trade.id, success: false, error: updateError.message })
          continue
        }

        // Delete the position from positions_orders after trade completes
        const { error: positionDeleteError } = await supabase
          .from('positions_orders')
          .delete()
          .eq('trade_id', trade.id)

        if (positionDeleteError) {
          console.error(`Error deleting position for trade ${trade.id}:`, positionDeleteError)
          // Continue anyway, position cleanup is not critical
        } else {
          console.log(`Position deleted for trade ${trade.id}`)
        }

        // Update user balance for win (stake was already deducted on trade creation)
        if (result === 'win') {
          // Return stake + profit
          const payout = trade.stake_amount + profitAmount
          
          const { error: balanceError } = await supabase.rpc('update_user_balance', {
            p_user_id: trade.user_id,
            p_amount: payout,
            p_transaction_type: 'system_trade',
            p_description: 'Trade win payout',
            p_trade_id: trade.id
          })

          if (balanceError) {
            console.error(`Error updating balance for trade ${trade.id}:`, balanceError)
            // Trade is already marked as complete, log the balance error
            results.push({ tradeId: trade.id, success: true, balanceError: balanceError.message })
            continue
          }
        }
        // For loss, stake was already deducted, so no balance update needed

        results.push({ tradeId: trade.id, success: true, result })
        console.log(`Trade ${trade.id} executed successfully: ${result}`)

      } catch (tradeError) {
        console.error(`Error processing trade ${trade.id}:`, tradeError)
        results.push({ tradeId: trade.id, success: false, error: tradeError.message })
      }
    }

    console.log('Trade execution complete:', results)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in execute-trades function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

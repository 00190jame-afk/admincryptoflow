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

    // For regular admins, check if they have permission for this user's trade
    if (adminProfile.role !== 'super_admin') {
      // Get trade to check user_id
      const { data: trade, error: tradeError } = await supabaseService
        .from('trades')
        .select('user_id')
        .eq('id', tradeId)
        .single()

      if (tradeError || !trade) {
        throw new Error('Trade not found')
      }

      // Check if this admin has permission for this user (through assigned invite codes)
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

    // Update trade using service role to bypass RLS
    const { data, error } = await supabaseService
      .from('trades')
      .update({
        status: 'win',
        result: 'win',
      })
      .eq('id', tradeId)
      .eq('status', 'pending')
      .select('id, status, result')
      .maybeSingle()

    if (error) {
      console.error('Error updating trade:', error)
      throw new Error(`Failed to update trade: ${error.message}`)
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Trade not updated. It may no longer be pending.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Trade updated successfully:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in set-trade-win function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
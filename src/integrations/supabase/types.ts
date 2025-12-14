export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          role: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          primary_invite_code: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          primary_invite_code?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          primary_invite_code?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      closing_orders: {
        Row: {
          closed_at: string
          created_at: string
          entry_price: number
          exit_price: number
          id: string
          leverage: number
          original_trade_id: string | null
          quantity: number
          realized_pnl: number
          scale: string | null
          side: string
          stake: number | null
          symbol: string
          user_id: string
        }
        Insert: {
          closed_at?: string
          created_at?: string
          entry_price: number
          exit_price: number
          id?: string
          leverage: number
          original_trade_id?: string | null
          quantity: number
          realized_pnl: number
          scale?: string | null
          side: string
          stake?: number | null
          symbol: string
          user_id: string
        }
        Update: {
          closed_at?: string
          created_at?: string
          entry_price?: number
          exit_price?: number
          id?: string
          leverage?: number
          original_trade_id?: string | null
          quantity?: number
          realized_pnl?: number
          scale?: string | null
          side?: string
          stake?: number | null
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          subject?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          admin_name: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
          used_by: string | null
        }
        Insert: {
          admin_name?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_by?: string | null
        }
        Update: {
          admin_name?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      positions_orders: {
        Row: {
          created_at: string
          entry_price: number
          id: string
          leverage: number
          mark_price: number | null
          quantity: number
          realized_pnl: number | null
          scale: string | null
          side: string
          stake: number | null
          symbol: string
          trade_id: string | null
          unrealized_pnl: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_price: number
          id?: string
          leverage: number
          mark_price?: number | null
          quantity: number
          realized_pnl?: number | null
          scale?: string | null
          side: string
          stake?: number | null
          symbol: string
          trade_id?: string | null
          unrealized_pnl?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_price?: number
          id?: string
          leverage?: number
          mark_price?: number | null
          quantity?: number
          realized_pnl?: number | null
          scale?: string | null
          side?: string
          stake?: number | null
          symbol?: string
          trade_id?: string | null
          unrealized_pnl?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_orders_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          credit_score: number | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          last_name: string | null
          phone: string | null
          postal_code: string | null
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_score?: number | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credit_score?: number | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      recharge_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          id: string
          redeemed_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          id?: string
          redeemed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trade_rules: {
        Row: {
          created_at: string
          id: string
          max_stake: number
          min_stake: number
          profit_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_stake: number
          min_stake: number
          profit_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          max_stake?: number
          min_stake?: number
          profit_rate?: number
        }
        Relationships: []
      }
      trades: {
        Row: {
          completed_at: string | null
          created_at: string
          current_price: number | null
          direction: string
          email: string | null
          ends_at: string | null
          entry_price: number
          id: string
          leverage: number
          modified_by_admin: boolean
          profit_loss_amount: number | null
          profit_rate: number
          result: string | null
          stake_amount: number
          status: string
          status_indicator: string | null
          trade_duration: number | null
          trading_pair: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction: string
          email?: string | null
          ends_at?: string | null
          entry_price: number
          id?: string
          leverage: number
          modified_by_admin?: boolean
          profit_loss_amount?: number | null
          profit_rate: number
          result?: string | null
          stake_amount: number
          status?: string
          status_indicator?: string | null
          trade_duration?: number | null
          trading_pair: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_price?: number | null
          direction?: string
          email?: string | null
          ends_at?: string | null
          entry_price?: number
          id?: string
          leverage?: number
          modified_by_admin?: boolean
          profit_loss_amount?: number | null
          profit_rate?: number
          result?: string | null
          stake_amount?: number
          status?: string
          status_indicator?: string | null
          trade_duration?: number | null
          trading_pair?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          email: string | null
          external_transaction_id: string | null
          id: string
          payment_method: string | null
          processed_by: string | null
          status: string | null
          trade_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method?: string | null
          processed_by?: string | null
          status?: string | null
          trade_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          email?: string | null
          external_transaction_id?: string | null
          id?: string
          payment_method?: string | null
          processed_by?: string | null
          status?: string | null
          trade_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          balance: number | null
          created_at: string
          currency: string | null
          email: string | null
          frozen: number | null
          id: string
          on_hold: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          frozen?: number | null
          id?: string
          on_hold?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          currency?: string | null
          email?: string | null
          frozen?: number | null
          id?: string
          on_hold?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          identifier: string
          max_attempts: number | null
          type: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          identifier: string
          max_attempts?: number | null
          type: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          max_attempts?: number | null
          type?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      withdraw_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          email: string | null
          id: string
          processed_at: string | null
          status: string
          user_id: string
          withdraw_code: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          email?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
          withdraw_code?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          email?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          user_id?: string
          withdraw_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_balance: {
        Args: {
          p_balance?: number
          p_description?: string
          p_frozen?: number
          p_on_hold?: number
          p_user_id: string
        }
        Returns: undefined
      }
      create_verification_code: {
        Args: { p_identifier: string; p_type: string }
        Returns: string
      }
      create_withdrawal_request: {
        Args: { p_amount: number; p_user_id: string }
        Returns: string
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_recharge_code: { Args: never; Returns: string }
      get_admin_assigned_users: {
        Args: { p_admin_user_id: string }
        Returns: {
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_any_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_description: string
          p_new_values?: Json
          p_old_values?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      redeem_recharge_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: {
          amount: number
          currency: string
        }[]
      }
      register_admin_with_invite: {
        Args: {
          p_admin_invite_code: string
          p_email: string
          p_full_name: string
          p_user_id: string
        }
        Returns: Json
      }
      update_frozen_balance: {
        Args: { p_action: string; p_amount: number; p_user_id: string }
        Returns: undefined
      }
      update_user_balance:
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_transaction_type?: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_trade_id?: string
              p_transaction_type?: string
              p_user_id: string
            }
            Returns: undefined
          }
      use_invite_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_invite_code: { Args: { p_code: string }; Returns: boolean }
      verify_code: {
        Args: { p_code: string; p_identifier: string; p_type: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

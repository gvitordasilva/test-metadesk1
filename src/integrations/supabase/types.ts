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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendant_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          last_assigned_at: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          last_assigned_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          last_assigned_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_contact: string
          recipient_name: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_contact: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_contact?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          completed_at: string | null
          content: string
          created_at: string
          created_by: string | null
          delivered: number | null
          description: string | null
          failed: number | null
          id: string
          name: string
          opened: number | null
          recipients: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          subject: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          channel: string
          completed_at?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          delivered?: number | null
          description?: string | null
          failed?: number | null
          id?: string
          name: string
          opened?: number | null
          recipients?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          channel?: string
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          delivered?: number | null
          description?: string | null
          failed?: number | null
          id?: string
          name?: string
          opened?: number | null
          recipients?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          subject?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_flows: {
        Row: {
          channel: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chatbot_node_options: {
        Row: {
          created_at: string
          id: string
          next_node_id: string | null
          node_id: string
          option_key: string
          option_order: number
          option_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          next_node_id?: string | null
          node_id: string
          option_key?: string
          option_order?: number
          option_text?: string
        }
        Update: {
          created_at?: string
          id?: string
          next_node_id?: string | null
          node_id?: string
          option_key?: string
          option_order?: number
          option_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_node_options_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "chatbot_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_nodes: {
        Row: {
          action_config: Json | null
          action_type: string | null
          content: string | null
          created_at: string
          flow_id: string
          id: string
          is_active: boolean
          is_entry_point: boolean
          name: string
          next_node_id: string | null
          node_order: number
          node_type: string
          options: Json | null
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type?: string | null
          content?: string | null
          created_at?: string
          flow_id: string
          id?: string
          is_active?: boolean
          is_entry_point?: boolean
          name?: string
          next_node_id?: string | null
          node_order?: number
          node_type?: string
          options?: Json | null
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string | null
          content?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          is_active?: boolean
          is_entry_point?: boolean
          name?: string
          next_node_id?: string | null
          node_order?: number
          node_type?: string
          options?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_audit_log: {
        Row: {
          action: string
          complaint_id: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          complaint_id: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          complaint_id?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_audit_log_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          ai_triage: Json | null
          assigned_to: string | null
          attachments: Json | null
          category: string
          channel: string | null
          created_at: string
          current_workflow_step_id: string | null
          description: string
          first_viewed_at: string | null
          first_viewed_by: string | null
          id: string
          internal_notes: string | null
          involved_parties: string | null
          is_anonymous: boolean
          last_sentiment: string | null
          location: string | null
          occurred_at: string | null
          protocol_number: string
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          status: string
          type: string
          updated_at: string
          waiting_since: string | null
        }
        Insert: {
          ai_triage?: Json | null
          assigned_to?: string | null
          attachments?: Json | null
          category: string
          channel?: string | null
          created_at?: string
          current_workflow_step_id?: string | null
          description: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          internal_notes?: string | null
          involved_parties?: string | null
          is_anonymous?: boolean
          last_sentiment?: string | null
          location?: string | null
          occurred_at?: string | null
          protocol_number: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          type: string
          updated_at?: string
          waiting_since?: string | null
        }
        Update: {
          ai_triage?: Json | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          channel?: string | null
          created_at?: string
          current_workflow_step_id?: string | null
          description?: string
          first_viewed_at?: string | null
          first_viewed_by?: string | null
          id?: string
          internal_notes?: string | null
          involved_parties?: string | null
          is_anonymous?: boolean
          last_sentiment?: string | null
          location?: string | null
          occurred_at?: string | null
          protocol_number?: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string
          type?: string
          updated_at?: string
          waiting_since?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_current_workflow_step_id_fkey"
            columns: ["current_workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          account_type: string
          created_at: string | null
          display_name: string | null
          email_address: string
          id: string
          imap_host: string | null
          imap_port: number | null
          is_active: boolean | null
          is_default: boolean | null
          last_poll_at: string | null
          last_poll_error: string | null
          oauth_access_token: string | null
          oauth_provider_data: Json | null
          oauth_refresh_token: string | null
          oauth_token_expires_at: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string | null
          display_name?: string | null
          email_address: string
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_poll_at?: string | null
          last_poll_error?: string | null
          oauth_access_token?: string | null
          oauth_provider_data?: Json | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string | null
          display_name?: string | null
          email_address?: string
          id?: string
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_poll_at?: string | null
          last_poll_error?: string | null
          oauth_access_token?: string | null
          oauth_provider_data?: Json | null
          oauth_refresh_token?: string | null
          oauth_token_expires_at?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_addresses: string[] | null
          complaint_id: string
          created_at: string | null
          direction: string
          email_account_id: string | null
          error_message: string | null
          from_address: string
          id: string
          in_reply_to: string | null
          message_id: string | null
          metadata: Json | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          thread_id: string | null
          to_addresses: string[]
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          complaint_id: string
          created_at?: string | null
          direction?: string
          email_account_id?: string | null
          error_message?: string | null
          from_address: string
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          thread_id?: string | null
          to_addresses: string[]
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[] | null
          complaint_id?: string
          created_at?: string | null
          direction?: string
          email_account_id?: string | null
          error_message?: string | null
          from_address?: string
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          thread_id?: string | null
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          comment: string | null
          complaint_id: string | null
          created_at: string
          id: string
          score: number
          session_id: string | null
        }
        Insert: {
          comment?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          score: number
          session_id?: string | null
        }
        Update: {
          comment?: string | null
          complaint_id?: string | null
          created_at?: string
          id?: string
          score?: number
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "service_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_messages: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          sender_type: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_type: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "service_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_queue: {
        Row: {
          assigned_to: string | null
          channel: string
          complaint_id: string | null
          created_at: string
          customer_avatar: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          last_message: string | null
          priority: number
          status: string
          subject: string | null
          unread_count: number
          updated_at: string
          voice_session_id: string | null
          waiting_since: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          complaint_id?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message?: string | null
          priority?: number
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          voice_session_id?: string | null
          waiting_since?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          complaint_id?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message?: string | null
          priority?: number
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          voice_session_id?: string | null
          waiting_since?: string
        }
        Relationships: []
      }
      service_sessions: {
        Row: {
          ai_sentiment: string | null
          ai_summary: string | null
          attendant_id: string | null
          complaint_id: string | null
          conversation_id: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          forward_notes: string | null
          forwarded_to_step_id: string | null
          id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_sentiment?: string | null
          ai_summary?: string | null
          attendant_id?: string | null
          complaint_id?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          forward_notes?: string | null
          forwarded_to_step_id?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_sentiment?: string | null
          ai_summary?: string | null
          attendant_id?: string | null
          complaint_id?: string | null
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          forward_notes?: string | null
          forwarded_to_step_id?: string | null
          id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_sessions_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_sessions_forwarded_to_step_id_fkey"
            columns: ["forwarded_to_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          created_at: string
          current_flow_id: string | null
          current_node_id: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          session_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          current_flow_id?: string | null
          current_node_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          session_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          current_flow_id?: string | null
          current_node_id?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          session_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_current_flow_id_fkey"
            columns: ["current_flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "chatbot_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_responsibles: {
        Row: {
          created_at: string | null
          department: string
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          position: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department: string
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          position: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          position?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          responsible_id: string | null
          sla_days: number | null
          step_order: number
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          responsible_id?: string | null
          sla_days?: number | null
          step_order: number
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          responsible_id?: string | null
          sla_days?: number | null
          step_order?: number
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "workflow_responsibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          workflow_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          workflow_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          workflow_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_access: { Args: never; Returns: boolean }
      generate_complaint_protocol: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "atendente"
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
    Enums: {
      app_role: ["admin", "atendente"],
    },
  },
} as const

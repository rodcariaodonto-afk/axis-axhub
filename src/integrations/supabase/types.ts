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
      activities: {
        Row: {
          contact_id: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          done_at: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          owner_user_id: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          owner_user_id?: string | null
          tenant_id: string
          title: string
          type?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          owner_user_id?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          balance: number
          bank_code: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          account_number?: string | null
          balance?: number
          bank_code?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          account_number?: string | null
          balance?: number
          bank_code?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          description: string
          id: string
          payable_id: string | null
          receivable_id: string | null
          reconciled: boolean
          tenant_id: string
          transaction_date: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          description: string
          id?: string
          payable_id?: string | null
          receivable_id?: string | null
          reconciled?: boolean
          tenant_id: string
          transaction_date: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          description?: string
          id?: string
          payable_id?: string | null
          receivable_id?: string | null
          reconciled?: boolean
          tenant_id?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cadence_steps: {
        Row: {
          cadence_id: string
          created_at: string
          delay_days: number
          description: string | null
          email_template_id: string | null
          id: string
          step_number: number
          tenant_id: string
          type: string
        }
        Insert: {
          cadence_id: string
          created_at?: string
          delay_days?: number
          description?: string | null
          email_template_id?: string | null
          id?: string
          step_number?: number
          tenant_id: string
          type?: string
        }
        Update: {
          cadence_id?: string
          created_at?: string
          delay_days?: number
          description?: string | null
          email_template_id?: string | null
          id?: string
          step_number?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadence_steps_cadence_id_fkey"
            columns: ["cadence_id"]
            isOneToOne: false
            referencedRelation: "sales_cadences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_steps_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string | null
          phone: string | null
          position: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          phone?: string | null
          position?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string | null
          phone?: string | null
          position?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_accounts: {
        Row: {
          address_json: Json | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner_user_id: string | null
          phone: string | null
          segment: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          phone?: string | null
          segment?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          segment?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_json: Json | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address_json?: Json | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address_json?: Json | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_forecasts: {
        Row: {
          committed_amount: number
          created_at: string
          forecast_amount: number
          id: string
          period: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          committed_amount?: number
          created_at?: string
          forecast_amount?: number
          id?: string
          period: string
          tenant_id: string
          user_id: string
        }
        Update: {
          committed_amount?: number
          created_at?: string
          forecast_amount?: number
          id?: string
          period?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          contact_id: string | null
          created_at: string
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          name: string
          pipeline_id: string
          responsible_user_id: string | null
          stage_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name: string
          pipeline_id: string
          responsible_user_id?: string | null
          stage_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name?: string
          pipeline_id?: string
          responsible_user_id?: string | null
          stage_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "sales_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          tenant_id: string
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          tenant_id: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          tenant_id?: string
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_outbox: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_name: string
          id: string
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
          tenant_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          tenant_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          platform: string
          tenant_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          tenant_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          tenant_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          created_at: string
          criteria: string
          id: string
          is_active: boolean
          points: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          criteria: string
          id?: string
          is_active?: boolean
          points?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          criteria?: string
          id?: string
          is_active?: boolean
          points?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          channel: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_user_id: string | null
          phone: string | null
          score: number | null
          source: string | null
          status: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_user_id?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_timeline: {
        Row: {
          attachments_json: Json | null
          channel: string
          contact_id: string | null
          content: string
          created_at: string
          direction: string
          id: string
          raw_json: Json | null
          synced_from: string | null
          tenant_id: string
        }
        Insert: {
          attachments_json?: Json | null
          channel?: string
          contact_id?: string | null
          content: string
          created_at?: string
          direction?: string
          id?: string
          raw_json?: Json | null
          synced_from?: string | null
          tenant_id: string
        }
        Update: {
          attachments_json?: Json | null
          channel?: string
          contact_id?: string | null
          content?: string
          created_at?: string
          direction?: string
          id?: string
          raw_json?: Json | null
          synced_from?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_timeline_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          notes: string | null
          number: string
          paid_status: string
          shipping_address_json: Json | null
          source: string
          status: string
          subtotal: number
          tax: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number: string
          paid_status?: string
          shipping_address_json?: Json | null
          source?: string
          status?: string
          subtotal?: number
          tax?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          notes?: string | null
          number?: string
          paid_status?: string
          shipping_address_json?: Json | null
          source?: string
          status?: string
          subtotal?: number
          tax?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          id: string
          paid_at: string | null
          payment_method: string | null
          po_id: string | null
          status: string
          supplier_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          po_id?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          po_id?: string | null
          status?: string
          supplier_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          order: number
          pipeline_id: string
          probability: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order?: number
          pipeline_id: string
          probability?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order?: number
          pipeline_id?: string
          probability?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "sales_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      po_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity: number
          received_quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          quantity?: number
          received_quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          received_quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: string[] | null
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: string[] | null
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_values: {
        Row: {
          created_at: string | null
          field_id: string
          id: string
          product_id: string
          tenant_id: string
          value: string | null
        }
        Insert: {
          created_at?: string | null
          field_id: string
          id?: string
          product_id: string
          tenant_id: string
          value?: string | null
        }
        Update: {
          created_at?: string | null
          field_id?: string
          id?: string
          product_id?: string
          tenant_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "product_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_custom_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_custom_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          id: string
          min_quantity: number
          product_id: string
          quantity: number
          tenant_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          min_quantity?: number
          product_id: string
          quantity?: number
          tenant_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          min_quantity?: number
          product_id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sku: string
          tenant_id: string
          type: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sku: string
          tenant_id: string
          type?: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sku?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          number: string
          pdf_url: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          total_amount: number
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          number: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
          total_amount?: number
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          number?: string
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_delivery_date: string | null
          id: string
          number: string
          status: string
          supplier_id: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          number: string
          status?: string
          supplier_id: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          number?: string
          status?: string
          supplier_id?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          description: string
          due_date: string
          id: string
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          description: string
          due_date: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          description?: string
          due_date?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_cadences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cadences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_pipelines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          tenant_id: string
          type: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          tenant_id: string
          type: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          tenant_id?: string
          type?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address_json: Json | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          name: string
          segment: string | null
          status: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          segment?: string | null
          status?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          segment?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address_json: Json | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          address_json?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          address_json?: Json | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "sales"
        | "finance"
        | "operations"
        | "accounting"
        | "readonly"
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
      app_role: [
        "admin",
        "sales",
        "finance",
        "operations",
        "accounting",
        "readonly",
      ],
    },
  },
} as const

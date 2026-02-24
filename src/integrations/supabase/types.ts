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
          account_id: string | null
          contact_id: string | null
          contract_id: string | null
          created_at: string
          created_by_id: string | null
          deal_id: string | null
          description: string | null
          done_at: string | null
          due_at: string | null
          id: string
          is_active: boolean
          lead_id: string | null
          opportunity_id: string | null
          owner_user_id: string | null
          priority: string
          status: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by_id?: string | null
          deal_id?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean
          lead_id?: string | null
          opportunity_id?: string | null
          owner_user_id?: string | null
          priority?: string
          status?: string
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by_id?: string | null
          deal_id?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          is_active?: boolean
          lead_id?: string | null
          opportunity_id?: string | null
          owner_user_id?: string | null
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
      activity_types: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_types_tenant_id_fkey"
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
      bi_alert_logs: {
        Row: {
          alert_id: string
          condition: string
          id: string
          tenant_id: string
          threshold: number
          triggered_at: string
          triggered_value: number
        }
        Insert: {
          alert_id: string
          condition: string
          id?: string
          tenant_id: string
          threshold: number
          triggered_at?: string
          triggered_value: number
        }
        Update: {
          alert_id?: string
          condition?: string
          id?: string
          tenant_id?: string
          threshold?: number
          triggered_at?: string
          triggered_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bi_alert_logs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "bi_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_alert_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_alerts: {
        Row: {
          condition: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          threshold: number
          updated_at: string
          widget_id: string
        }
        Insert: {
          condition?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          threshold?: number
          updated_at?: string
          widget_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          threshold?: number
          updated_at?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_alerts_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "bi_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_dashboards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_manual_adjustments: {
        Row: {
          adjustment_date: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          tenant_id: string
          user_id: string
          value: number
          widget_id: string | null
        }
        Insert: {
          adjustment_date: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          tenant_id: string
          user_id: string
          value?: number
          widget_id?: string | null
        }
        Update: {
          adjustment_date?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          tenant_id?: string
          user_id?: string
          value?: number
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bi_manual_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_manual_adjustments_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "bi_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      bi_widgets: {
        Row: {
          aggregation: string | null
          chart_type: string
          created_at: string
          dashboard_id: string
          dimension: string | null
          filters: Json | null
          id: string
          layout_config: Json | null
          metric: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          aggregation?: string | null
          chart_type?: string
          created_at?: string
          dashboard_id: string
          dimension?: string | null
          filters?: Json | null
          id?: string
          layout_config?: Json | null
          metric?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          aggregation?: string | null
          chart_type?: string
          created_at?: string
          dashboard_id?: string
          dimension?: string | null
          filters?: Json | null
          id?: string
          layout_config?: Json | null
          metric?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bi_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "bi_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bi_widgets_tenant_id_fkey"
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
      campanhas: {
        Row: {
          created_at: string
          descricao: string | null
          funil_id: string | null
          id: string
          mensagem_template: string
          nome: string
          session_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          funil_id?: string | null
          id?: string
          mensagem_template?: string
          nome: string
          session_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          funil_id?: string | null
          id?: string
          mensagem_template?: string
          nome?: string
          session_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_configuracoes: {
        Row: {
          campanha_id: string
          delay_maximo_segundos: number
          delay_minimo_segundos: number
          hora_fim_disparo: string
          hora_inicio_disparo: string
          id: string
          nao_disparar_domingos: boolean
          nao_disparar_feriados: boolean
          nao_disparar_sabados: boolean
          tenant_id: string
          usar_sequencia_aleatoria: boolean
        }
        Insert: {
          campanha_id: string
          delay_maximo_segundos?: number
          delay_minimo_segundos?: number
          hora_fim_disparo?: string
          hora_inicio_disparo?: string
          id?: string
          nao_disparar_domingos?: boolean
          nao_disparar_feriados?: boolean
          nao_disparar_sabados?: boolean
          tenant_id: string
          usar_sequencia_aleatoria?: boolean
        }
        Update: {
          campanha_id?: string
          delay_maximo_segundos?: number
          delay_minimo_segundos?: number
          hora_fim_disparo?: string
          hora_inicio_disparo?: string
          id?: string
          nao_disparar_domingos?: boolean
          nao_disparar_feriados?: boolean
          nao_disparar_sabados?: boolean
          tenant_id?: string
          usar_sequencia_aleatoria?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_configuracoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_configuracoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_contatos: {
        Row: {
          campanha_id: string
          created_at: string
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          nome: string | null
          status: string
          telefone: string
          tempo_espera_segundos: number | null
          tenant_id: string
        }
        Insert: {
          campanha_id: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          nome?: string | null
          status?: string
          telefone: string
          tempo_espera_segundos?: number | null
          tenant_id: string
        }
        Update: {
          campanha_id?: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          nome?: string | null
          status?: string
          telefone?: string
          tempo_espera_segundos?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_contatos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_contatos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas_historico_envios: {
        Row: {
          campanha_id: string
          contato_telefone: string
          created_at: string
          enviado_em: string | null
          erro_mensagem: string | null
          id: string
          mensagem_texto: string
          status: string
          tempo_espera_segundos: number
          tenant_id: string
        }
        Insert: {
          campanha_id: string
          contato_telefone: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem_texto?: string
          status?: string
          tempo_espera_segundos?: number
          tenant_id: string
        }
        Update: {
          campanha_id?: string
          contato_telefone?: string
          created_at?: string
          enviado_em?: string | null
          erro_mensagem?: string | null
          id?: string
          mensagem_texto?: string
          status?: string
          tempo_espera_segundos?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_historico_envios_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanhas_historico_envios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      category_import_logs: {
        Row: {
          created_at: string | null
          errors: Json | null
          failed_imports: number | null
          file_name: string | null
          id: string
          status: string | null
          successful_imports: number | null
          tenant_id: string
          total_rows: number | null
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          id?: string
          status?: string | null
          successful_imports?: number | null
          tenant_id: string
          total_rows?: number | null
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          file_name?: string | null
          id?: string
          status?: string | null
          successful_imports?: number | null
          tenant_id?: string
          total_rows?: number | null
        }
        Relationships: []
      }
      category_templates: {
        Row: {
          allowed_variations: string[] | null
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          icon: string | null
          id: string
          is_popular: boolean | null
          name: string
          niche: string | null
          product_type: string
          sku_required: boolean | null
          track_inventory: boolean | null
          usage_count: number | null
        }
        Insert: {
          allowed_variations?: string[] | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id: string
          is_popular?: boolean | null
          name: string
          niche?: string | null
          product_type?: string
          sku_required?: boolean | null
          track_inventory?: boolean | null
          usage_count?: number | null
        }
        Update: {
          allowed_variations?: string[] | null
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_popular?: boolean | null
          name?: string
          niche?: string | null
          product_type?: string
          sku_required?: boolean | null
          track_inventory?: boolean | null
          usage_count?: number | null
        }
        Relationships: []
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
          whatsapp_jid: string | null
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
          whatsapp_jid?: string | null
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
          whatsapp_jid?: string | null
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
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          ip_address: string | null
          is_valid: boolean
          signature_token: string | null
          signature_url: string | null
          signed_at: string
          signer_id: string | null
          tenant_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          signature_token?: string | null
          signature_url?: string | null
          signed_at?: string
          signer_id?: string | null
          tenant_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          is_valid?: boolean
          signature_token?: string | null
          signature_url?: string | null
          signed_at?: string
          signer_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_versions: {
        Row: {
          change_description: string | null
          changed_by_id: string | null
          contract_id: string
          contract_type: string | null
          created_at: string
          currency: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          renewal_date: string | null
          start_date: string | null
          status: string
          tenant_id: string
          value: number | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          changed_by_id?: string | null
          contract_id: string
          contract_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          renewal_date?: string | null
          start_date?: string | null
          status: string
          tenant_id: string
          value?: number | null
          version_number?: number
        }
        Update: {
          change_description?: string | null
          changed_by_id?: string | null
          contract_id?: string
          contract_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          value?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          account_id: string | null
          contract_type: string | null
          created_at: string
          currency: string
          deal_id: string | null
          description: string | null
          document_url: string | null
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          renewal_date: string | null
          signature_status: string
          signature_token: string | null
          signed_at: string | null
          signed_by_id: string | null
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          contract_type?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          renewal_date?: string | null
          signature_status?: string
          signature_token?: string | null
          signed_at?: string | null
          signed_by_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          contract_type?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          renewal_date?: string | null
          signature_status?: string
          signature_token?: string | null
          signed_at?: string | null
          signed_by_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
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
          is_active: boolean | null
          name: string
          owner_user_id: string | null
          phone: string | null
          segment: string | null
          tenant_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          segment?: string | null
          tenant_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address_json?: Json | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          segment?: string | null
          tenant_id?: string
          updated_at?: string | null
          website?: string | null
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
      custom_field_values: {
        Row: {
          created_at: string | null
          custom_field_id: string
          id: string
          record_id: string
          tenant_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id: string
          id?: string
          record_id: string
          tenant_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string
          id?: string
          record_id?: string
          tenant_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          object_name: string
          picklist_values: Json | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          object_name: string
          picklist_values?: Json | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          object_name?: string
          picklist_values?: Json | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_tenant_id_fkey"
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
          crm_contact_id: string | null
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
          crm_contact_id?: string | null
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
          crm_contact_id?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
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
      deal_history: {
        Row: {
          campo_alterado: string | null
          coluna_destino_id: string | null
          coluna_origem_id: string | null
          comentario: string | null
          created_at: string
          deal_id: string
          id: string
          tenant_id: string
          tipo_acao: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          coluna_destino_id?: string | null
          coluna_origem_id?: string | null
          comentario?: string | null
          created_at?: string
          deal_id: string
          id?: string
          tenant_id: string
          tipo_acao: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          coluna_destino_id?: string | null
          coluna_origem_id?: string | null
          comentario?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          tenant_id?: string
          tipo_acao?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_history_coluna_destino_id_fkey"
            columns: ["coluna_destino_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_history_coluna_origem_id_fkey"
            columns: ["coluna_origem_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_history_tenant_id_fkey"
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
          descricao: string | null
          estimated_value: number | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          name: string
          observacoes: string | null
          payment_status: string | null
          pipeline_id: string
          posicao_na_coluna: number | null
          prioridade: string | null
          probabilidade_percentual: number | null
          responsible_user_id: string | null
          stage_id: string
          status: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          descricao?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name: string
          observacoes?: string | null
          payment_status?: string | null
          pipeline_id: string
          posicao_na_coluna?: number | null
          prioridade?: string | null
          probabilidade_percentual?: number | null
          responsible_user_id?: string | null
          stage_id: string
          status?: string
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          created_at?: string
          descricao?: string | null
          estimated_value?: number | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name?: string
          observacoes?: string | null
          payment_status?: string | null
          pipeline_id?: string
          posicao_na_coluna?: number | null
          prioridade?: string | null
          probabilidade_percentual?: number | null
          responsible_user_id?: string | null
          stage_id?: string
          status?: string
          tags?: string[] | null
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
      dim_customers: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          name: string
          segment: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          name: string
          segment?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          name?: string
          segment?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dim_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_event_types: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_event_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_products: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          product_id: string | null
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          product_id?: string | null
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          product_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation: {
        Row: {
          category: string
          content: string
          content_html: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          niche: string
          order_index: number | null
          previous_version_id: string | null
          search_vector: unknown
          slug: string
          subcategory: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          updated_by: string
          version: number | null
        }
        Insert: {
          category: string
          content: string
          content_html?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          niche: string
          order_index?: number | null
          previous_version_id?: string | null
          search_vector?: unknown
          slug: string
          subcategory?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          updated_by: string
          version?: number | null
        }
        Update: {
          category?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          niche?: string
          order_index?: number | null
          previous_version_id?: string | null
          search_vector?: unknown
          slug?: string
          subcategory?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_faqs: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          created_by: string
          id: string
          is_published: boolean | null
          niche: string
          order_index: number | null
          question: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string | null
          created_by: string
          id?: string
          is_published?: boolean | null
          niche?: string
          order_index?: number | null
          question: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_published?: boolean | null
          niche?: string
          order_index?: number | null
          question?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_faqs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          documentation_id: string
          id: string
          is_helpful: boolean | null
          rating: number
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          documentation_id: string
          id?: string
          is_helpful?: boolean | null
          rating: number
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          documentation_id?: string
          id?: string
          is_helpful?: boolean | null
          rating?: number
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_feedback_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_translations: {
        Row: {
          content: string
          content_html: string | null
          created_at: string | null
          description: string | null
          documentation_id: string
          id: string
          language: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          documentation_id: string
          id?: string
          language: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          documentation_id?: string
          id?: string
          language?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_translations_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_translations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_videos: {
        Row: {
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          niche: string
          order_index: number | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          niche?: string
          order_index?: number | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          niche?: string
          order_index?: number | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentation_videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_views: {
        Row: {
          created_at: string | null
          documentation_id: string
          helpful_no: number | null
          helpful_yes: number | null
          id: string
          last_viewed_at: string | null
          tenant_id: string
          time_spent_seconds: number | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          documentation_id: string
          helpful_no?: number | null
          helpful_yes?: number | null
          id?: string
          last_viewed_at?: string | null
          tenant_id: string
          time_spent_seconds?: number | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          documentation_id?: string
          helpful_no?: number | null
          helpful_yes?: number | null
          id?: string
          last_viewed_at?: string | null
          tenant_id?: string
          time_spent_seconds?: number | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_views_documentation_id_fkey"
            columns: ["documentation_id"]
            isOneToOne: false
            referencedRelation: "documentation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentation_views_tenant_id_fkey"
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
          type: string
          variables: string[] | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          tenant_id: string
          type?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          tenant_id?: string
          type?: string
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
      fact_events: {
        Row: {
          created_at: string
          customer_id: string | null
          event_timestamp: string
          event_type_id: string | null
          id: string
          metadata: Json | null
          product_id: string | null
          quantity: number | null
          tenant_id: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          event_timestamp?: string
          event_type_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          tenant_id: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          event_timestamp?: string
          event_type_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          tenant_id?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "dim_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "dim_event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "dim_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fluxo_recebimento_logs: {
        Row: {
          campanha_id: string
          created_at: string
          id: string
          mensagem_recebida: string | null
          status_fluxo: string
          telefone: string
          tenant_id: string
        }
        Insert: {
          campanha_id: string
          created_at?: string
          id?: string
          mensagem_recebida?: string | null
          status_fluxo?: string
          telefone: string
          tenant_id: string
        }
        Update: {
          campanha_id?: string
          created_at?: string
          id?: string
          mensagem_recebida?: string | null
          status_fluxo?: string
          telefone?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fluxo_recebimento_logs_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fluxo_recebimento_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          gatilho_config: Json | null
          gatilho_tipo: string | null
          id: string
          nome: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          gatilho_config?: Json | null
          gatilho_tipo?: string | null
          id?: string
          nome: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          gatilho_config?: Json | null
          gatilho_tipo?: string | null
          id?: string
          nome?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_blocos: {
        Row: {
          config: Json | null
          created_at: string
          funil_id: string
          id: string
          label: string
          posicao_x: number
          posicao_y: number
          tenant_id: string
          tipo: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          funil_id: string
          id?: string
          label?: string
          posicao_x?: number
          posicao_y?: number
          tenant_id: string
          tipo: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          funil_id?: string
          id?: string
          label?: string
          posicao_x?: number
          posicao_y?: number
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_blocos_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_blocos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_conexoes: {
        Row: {
          created_at: string
          funil_id: string
          id: string
          label: string | null
          source_bloco_id: string
          source_handle: string | null
          target_bloco_id: string
          target_handle: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          funil_id: string
          id?: string
          label?: string | null
          source_bloco_id: string
          source_handle?: string | null
          target_bloco_id: string
          target_handle?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          funil_id?: string
          id?: string
          label?: string | null
          source_bloco_id?: string
          source_handle?: string | null
          target_bloco_id?: string
          target_handle?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_conexoes_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_conexoes_source_bloco_id_fkey"
            columns: ["source_bloco_id"]
            isOneToOne: false
            referencedRelation: "funis_blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_conexoes_target_bloco_id_fkey"
            columns: ["target_bloco_id"]
            isOneToOne: false
            referencedRelation: "funis_blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_conexoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_execucoes: {
        Row: {
          bloco_atual_id: string | null
          contato_nome: string | null
          contato_telefone: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          funil_id: string
          id: string
          session_id: string | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          bloco_atual_id?: string | null
          contato_nome?: string | null
          contato_telefone: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          funil_id: string
          id?: string
          session_id?: string | null
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          bloco_atual_id?: string | null
          contato_nome?: string | null
          contato_telefone?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          funil_id?: string
          id?: string
          session_id?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_execucoes_bloco_atual_id_fkey"
            columns: ["bloco_atual_id"]
            isOneToOne: false
            referencedRelation: "funis_blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_execucoes_funil_id_fkey"
            columns: ["funil_id"]
            isOneToOne: false
            referencedRelation: "funis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_execucoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_logs: {
        Row: {
          bloco_id: string | null
          bloco_tipo: string
          created_at: string
          detalhes: Json | null
          execucao_id: string
          id: string
          status: string
          tenant_id: string
        }
        Insert: {
          bloco_id?: string | null
          bloco_tipo: string
          created_at?: string
          detalhes?: Json | null
          execucao_id: string
          id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          bloco_id?: string | null
          bloco_tipo?: string
          created_at?: string
          detalhes?: Json | null
          execucao_id?: string
          id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funis_logs_bloco_id_fkey"
            columns: ["bloco_id"]
            isOneToOne: false
            referencedRelation: "funis_blocos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_logs_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "funis_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      funis_variaveis: {
        Row: {
          chave: string
          created_at: string
          execucao_id: string
          id: string
          tenant_id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          execucao_id: string
          id?: string
          tenant_id: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          execucao_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funis_variaveis_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "funis_execucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funis_variaveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_type: string
          id: string
          integration_id: string
          request_payload: Json | null
          response_payload: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          integration_id: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_mappings: {
        Row: {
          axhub_field: string
          created_at: string
          external_field: string
          id: string
          integration_id: string
          tenant_id: string
          transform_config: Json | null
          transform_type: string
        }
        Insert: {
          axhub_field: string
          created_at?: string
          external_field: string
          id?: string
          integration_id: string
          tenant_id: string
          transform_config?: Json | null
          transform_type?: string
        }
        Update: {
          axhub_field?: string
          created_at?: string
          external_field?: string
          id?: string
          integration_id?: string
          tenant_id?: string
          transform_config?: Json | null
          transform_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_webhooks: {
        Row: {
          created_at: string
          events: string[] | null
          failed_attempts: number | null
          id: string
          integration_id: string
          is_active: boolean | null
          last_triggered_at: string | null
          tenant_id: string
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          events?: string[] | null
          failed_attempts?: number | null
          id?: string
          integration_id: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          tenant_id: string
          webhook_secret?: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          events?: string[] | null
          failed_attempts?: number | null
          id?: string
          integration_id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          tenant_id?: string
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_webhooks_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_webhooks_tenant_id_fkey"
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
          auth_type: string | null
          category: string | null
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          is_configured: boolean | null
          last_sync_at: string | null
          name: string | null
          platform: string
          slug: string | null
          tenant_id: string
          type: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          auth_type?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_configured?: boolean | null
          last_sync_at?: string | null
          name?: string | null
          platform: string
          slug?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          auth_type?: string | null
          category?: string | null
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_configured?: boolean | null
          last_sync_at?: string | null
          name?: string | null
          platform?: string
          slug?: string | null
          tenant_id?: string
          type?: string | null
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
      internal_conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "internal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_conversation_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_conversations: {
        Row: {
          created_at: string
          id: string
          name: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "internal_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_tenant_id_fkey"
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
          converted_at: string | null
          converted_to_account_id: string | null
          converted_to_contact_id: string | null
          created_at: string
          email: string | null
          id: string
          is_converted: boolean | null
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
          converted_at?: string | null
          converted_to_account_id?: string | null
          converted_to_contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_converted?: boolean | null
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
          converted_at?: string | null
          converted_to_account_id?: string | null
          converted_to_contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_converted?: boolean | null
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
            foreignKeyName: "leads_converted_to_account_id_fkey"
            columns: ["converted_to_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_contact_id_fkey"
            columns: ["converted_to_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_historico: {
        Row: {
          contato_id: string | null
          created_at: string
          deal_id: string | null
          destinatario: string
          id: string
          mensagem: string | null
          message_type: string
          remetente: string
          tenant_id: string
          timestamp: string
          whatsapp_message_id: string | null
        }
        Insert: {
          contato_id?: string | null
          created_at?: string
          deal_id?: string | null
          destinatario: string
          id?: string
          mensagem?: string | null
          message_type?: string
          remetente: string
          tenant_id: string
          timestamp?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          contato_id?: string | null
          created_at?: string
          deal_id?: string | null
          destinatario?: string
          id?: string
          mensagem?: string | null
          message_type?: string
          remetente?: string
          tenant_id?: string
          timestamp?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_historico_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_historico_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_historico_tenant_id_fkey"
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
      notification_logs: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          notification_id: string
          sent_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          error_message?: string | null
          id?: string
          notification_id: string
          sent_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          sent_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          notification_type_id: string
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type_id: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          notification_type_id?: string
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string
          notification_type_id: string
          priority: string
          read_at: string | null
          recipient_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message: string
          notification_type_id: string
          priority?: string
          read_at?: string | null
          recipient_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string
          notification_type_id?: string
          priority?: string
          read_at?: string | null
          recipient_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string | null
          amount: number
          close_date: string | null
          close_reason: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string | null
          expected_close_date: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          probability: number
          stage: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          close_date?: string | null
          close_reason?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          probability?: number
          stage?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          close_date?: string | null
          close_reason?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          probability?: number
          stage?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          order_index: number
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          order_index?: number
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          order_index?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_stages_tenant_id_fkey"
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
          deal_id: string | null
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
          deal_id?: string | null
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
          deal_id?: string | null
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
            foreignKeyName: "orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
          bank_account_id: string | null
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
          bank_account_id?: string | null
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
          bank_account_id?: string | null
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
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
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
          cor_hex: string | null
          created_at: string
          id: string
          name: string
          order: number
          pipeline_id: string
          probability: number | null
          tenant_id: string
        }
        Insert: {
          cor_hex?: string | null
          created_at?: string
          id?: string
          name: string
          order?: number
          pipeline_id: string
          probability?: number | null
          tenant_id: string
        }
        Update: {
          cor_hex?: string | null
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
          allowed_variations: string[] | null
          cloned_from_id: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          niche: string | null
          product_type: string | null
          sku_required: boolean | null
          template_id: string | null
          tenant_id: string
          track_inventory: boolean | null
        }
        Insert: {
          allowed_variations?: string[] | null
          cloned_from_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          niche?: string | null
          product_type?: string | null
          sku_required?: boolean | null
          template_id?: string | null
          tenant_id: string
          track_inventory?: boolean | null
        }
        Update: {
          allowed_variations?: string[] | null
          cloned_from_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          niche?: string | null
          product_type?: string | null
          sku_required?: boolean | null
          template_id?: string | null
          tenant_id?: string
          track_inventory?: boolean | null
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
      product_channels: {
        Row: {
          channel_name: string
          channel_sku: string | null
          channel_url: string | null
          created_at: string
          id: string
          last_sync: string | null
          product_id: string
          sync_enabled: boolean
          tenant_id: string
        }
        Insert: {
          channel_name: string
          channel_sku?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          last_sync?: string | null
          product_id: string
          sync_enabled?: boolean
          tenant_id: string
        }
        Update: {
          channel_name?: string
          channel_sku?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          last_sync?: string | null
          product_id?: string
          sync_enabled?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_channels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_channels_tenant_id_fkey"
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
      product_variations: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          is_active: boolean
          price: number
          product_id: string
          sku: string
          stock_quantity: number
          tenant_id: string
          variation_name: string
          variation_values: Json
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id: string
          sku: string
          stock_quantity?: number
          tenant_id: string
          variation_name: string
          variation_values?: Json
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          sku?: string
          stock_quantity?: number
          tenant_id?: string
          variation_name?: string
          variation_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          birth_date: string | null
          created_at: string
          default_menu: string
          default_theme: string
          email: string
          farewell_message: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          default_menu?: string
          default_theme?: string
          email: string
          farewell_message?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          default_menu?: string
          default_theme?: string
          email?: string
          farewell_message?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
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
          bank_account_id: string | null
          created_at: string
          customer_id: string | null
          deal_id: string | null
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
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
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
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
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
            foreignKeyName: "receivables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
      report_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          error_message: string | null
          file_size: number | null
          file_url: string | null
          format: string
          id: string
          report_id: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          format: string
          id?: string
          report_id: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          error_message?: string | null
          file_size?: number | null
          file_url?: string | null
          format?: string
          id?: string
          report_id?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          format: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          next_send_at: string | null
          recipients: string[] | null
          report_id: string
          tenant_id: string
          time_of_day: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          format?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipients?: string[] | null
          report_id: string
          tenant_id: string
          time_of_day?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          format?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipients?: string[] | null
          report_id?: string
          tenant_id?: string
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          chart_type: string | null
          config: Json
          created_at: string | null
          created_by: string
          data: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          is_public: boolean | null
          last_run_at: string | null
          name: string
          object_name: string | null
          report_type: string | null
          shared_with: Json | null
          template_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          chart_type?: string | null
          config?: Json
          created_at?: string | null
          created_by: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_run_at?: string | null
          name: string
          object_name?: string | null
          report_type?: string | null
          shared_with?: Json | null
          template_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          chart_type?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_run_at?: string | null
          name?: string
          object_name?: string | null
          report_type?: string | null
          shared_with?: Json | null
          template_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_tenant_id_fkey"
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
      user_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_export: boolean
          can_manage_users: boolean
          can_view: boolean
          created_at: string
          id: string
          module_name: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_manage_users?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_name: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_export?: boolean
          can_manage_users?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_name?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      user_work_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_working_day: boolean
          start_time: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_work_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_contact_status: {
        Row: {
          assigned_to: string | null
          contact_id: string
          created_at: string
          id: string
          last_status_change: string
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_status_change?: string
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_status_change?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_status_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_color: string
          tag_name: string
          tenant_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_color?: string
          tag_name: string
          tenant_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_color?: string
          tag_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          color_code: string | null
          created_at: string
          customer_id: string | null
          display_name: string | null
          id: string
          is_favorite: boolean
          is_group: boolean
          last_message_at: string | null
          phone_number: string
          priority: number
          profile_picture_url: string | null
          session_id: string
          tenant_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          is_favorite?: boolean
          is_group?: boolean
          last_message_at?: string | null
          phone_number: string
          priority?: number
          profile_picture_url?: string | null
          session_id: string
          tenant_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          color_code?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          id?: string
          is_favorite?: boolean
          is_group?: boolean
          last_message_at?: string | null
          phone_number?: string
          priority?: number
          profile_picture_url?: string | null
          session_id?: string
          tenant_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          contact_id: string | null
          contact_phone: string
          content: string | null
          created_at: string
          direction: string
          id: string
          media_type: string | null
          media_url: string | null
          message_type: string
          sender_name: string | null
          sender_phone: string | null
          session_id: string
          status: string
          tenant_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          contact_id?: string | null
          contact_phone: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          sender_name?: string | null
          sender_phone?: string | null
          session_id: string
          status?: string
          tenant_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          contact_id?: string | null
          contact_phone?: string
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message_type?: string
          sender_name?: string | null
          sender_phone?: string | null
          session_id?: string
          status?: string
          tenant_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          error_message: string | null
          evolution_instance_id: string | null
          id: string
          last_connected_at: string | null
          phone_number: string | null
          qr_code: string | null
          session_name: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          evolution_instance_id?: string | null
          id?: string
          last_connected_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_name: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          evolution_instance_id?: string | null
          id?: string
          last_connected_at?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          auto_reply_enabled: boolean
          auto_reply_message: string | null
          created_at: string
          evolution_api_key: string | null
          evolution_api_url: string | null
          id: string
          max_sessions: number
          tenant_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean
          auto_reply_message?: string | null
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          id?: string
          max_sessions?: number
          tenant_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean
          auto_reply_message?: string | null
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          id?: string
          max_sessions?: number
          tenant_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_steps: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string
          node_type: string
          output_data: Json | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id: string
          node_type: string
          output_data?: Json | null
          started_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string
          node_type?: string
          output_data?: Json | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          result: Json | null
          started_at: string
          status: string
          tenant_id: string
          trigger_data: Json | null
          trigger_type: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          tenant_id: string
          trigger_data?: Json | null
          trigger_type?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
          tenant_id?: string
          trigger_data?: Json | null
          trigger_type?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string
          definition: Json
          description: string | null
          failed_executions: number
          id: string
          is_active: boolean
          is_published: boolean
          name: string
          published_at: string | null
          successful_executions: number
          tenant_id: string
          total_executions: number
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          definition?: Json
          description?: string | null
          failed_executions?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          name: string
          published_at?: string | null
          successful_executions?: number
          tenant_id: string
          total_executions?: number
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          definition?: Json
          description?: string | null
          failed_executions?: number
          id?: string
          is_active?: boolean
          is_published?: boolean
          name?: string
          published_at?: string | null
          successful_executions?: number
          tenant_id?: string
          total_executions?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflows_tenant_id_fkey"
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
      create_default_bi_dashboards: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      execute_bi_widget_query: {
        Args: {
          p_aggregation: string
          p_date_from?: string
          p_date_to?: string
          p_dimension: string
          p_filters?: Json
          p_metric: string
        }
        Returns: Json
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string }
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

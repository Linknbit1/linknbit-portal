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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          client_message: string | null
          created_at: string
          id: string
          message: string | null
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          target_id: string
          type: string
        }
        Insert: {
          client_message?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          target_id: string
          type: string
        }
        Update: {
          client_message?: string | null
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          target_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          bd_task_id: string | null
          client_visible: boolean
          confidential_scope: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          id: string
          is_confidential: boolean
          kind: string
          lead_id: string | null
          link_url: string | null
          mime_type: string | null
          project_id: string | null
          storage_path: string | null
          task_id: string | null
          uploader_id: string | null
        }
        Insert: {
          bd_task_id?: string | null
          client_visible?: boolean
          confidential_scope?: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          kind?: string
          lead_id?: string | null
          link_url?: string | null
          mime_type?: string | null
          project_id?: string | null
          storage_path?: string | null
          task_id?: string | null
          uploader_id?: string | null
        }
        Update: {
          bd_task_id?: string | null
          client_visible?: boolean
          confidential_scope?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_confidential?: boolean
          kind?: string
          lead_id?: string | null
          link_url?: string | null
          mime_type?: string | null
          project_id?: string | null
          storage_path?: string | null
          task_id?: string | null
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_bd_task_id_fkey"
            columns: ["bd_task_id"]
            isOneToOne: false
            referencedRelation: "bd_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          day_part: string
          day_type: string
          device_fingerprint: string | null
          device_flagged: boolean
          device_name: string | null
          excluded_minutes: number
          id: string
          ip_address: unknown
          marked_by: string | null
          note: string | null
          profile_id: string
          source: string
          status: string | null
          updated_at: string
          wifi_validated: boolean
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          day_part?: string
          day_type?: string
          device_fingerprint?: string | null
          device_flagged?: boolean
          device_name?: string | null
          excluded_minutes?: number
          id?: string
          ip_address?: unknown
          marked_by?: string | null
          note?: string | null
          profile_id: string
          source?: string
          status?: string | null
          updated_at?: string
          wifi_validated?: boolean
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          day_part?: string
          day_type?: string
          device_fingerprint?: string | null
          device_flagged?: boolean
          device_name?: string | null
          excluded_minutes?: number
          id?: string
          ip_address?: unknown
          marked_by?: string | null
          note?: string | null
          profile_id?: string
          source?: string
          status?: string | null
          updated_at?: string
          wifi_validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_exceptions: {
        Row: {
          actual_departure: string | null
          actual_return: string | null
          created_at: string
          date: string
          exception_type: string
          id: string
          profile_id: string
          reason: string
          requested_time: string
          return_time: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          actual_departure?: string | null
          actual_return?: string | null
          created_at?: string
          date: string
          exception_type: string
          id?: string
          profile_id: string
          reason: string
          requested_time: string
          return_time?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          actual_departure?: string | null
          actual_return?: string | null
          created_at?: string
          date?: string
          exception_type?: string
          id?: string
          profile_id?: string
          reason?: string
          requested_time?: string
          return_time?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_exceptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_exceptions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_settings: {
        Row: {
          auto_checkout: boolean
          break_end_time: string | null
          break_start_time: string | null
          checkout_buffer_min: number
          early_checkin_min: number
          grace_period_min: number
          half_day_start_time: string
          min_excluded_gap_min: number
          office_ip_auto_update: boolean
          office_ip_cidr: string | null
          office_ip_last_observed: string | null
          office_ip_updated_at: string | null
          saturday_working: boolean
          singleton: boolean
          terminal_stale_min: number
          timezone: string
          updated_at: string
          updated_by: string | null
          work_end_time: string
          work_start_time: string
          xp_on_time_checkin: number
        }
        Insert: {
          auto_checkout?: boolean
          break_end_time?: string | null
          break_start_time?: string | null
          checkout_buffer_min?: number
          early_checkin_min?: number
          grace_period_min?: number
          half_day_start_time?: string
          min_excluded_gap_min?: number
          office_ip_auto_update?: boolean
          office_ip_cidr?: string | null
          office_ip_last_observed?: string | null
          office_ip_updated_at?: string | null
          saturday_working?: boolean
          singleton?: boolean
          terminal_stale_min?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          work_end_time?: string
          work_start_time?: string
          xp_on_time_checkin?: number
        }
        Update: {
          auto_checkout?: boolean
          break_end_time?: string | null
          break_start_time?: string | null
          checkout_buffer_min?: number
          early_checkin_min?: number
          grace_period_min?: number
          half_day_start_time?: string
          min_excluded_gap_min?: number
          office_ip_auto_update?: boolean
          office_ip_cidr?: string | null
          office_ip_last_observed?: string | null
          office_ip_updated_at?: string | null
          saturday_working?: boolean
          singleton?: boolean
          terminal_stale_min?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          work_end_time?: string
          work_start_time?: string
          xp_on_time_checkin?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          actor_name: string | null
          actor_role: string | null
          changed_fields: string[] | null
          context: Json
          created_at: string
          flag_reason: string | null
          flagged: boolean
          id: string
          module: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          severity: string
          subject_id: string | null
          subject_name: string | null
          summary: string
          table_name: string
          target_name: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind?: string
          actor_name?: string | null
          actor_role?: string | null
          changed_fields?: string[] | null
          context?: Json
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          module: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          severity?: string
          subject_id?: string | null
          subject_name?: string | null
          summary: string
          table_name: string
          target_name?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          actor_name?: string | null
          actor_role?: string | null
          changed_fields?: string[] | null
          context?: Json
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          severity?: string
          subject_id?: string | null
          subject_name?: string | null
          summary?: string
          table_name?: string
          target_name?: string | null
        }
        Relationships: []
      }
      badge_awards: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          profile_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          profile_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          criteria_type: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      bd_activities: {
        Row: {
          by_id: string | null
          channel: string
          created_at: string
          id: string
          lead_id: string | null
          leads_created: number
          meetings_booked: number
          note: string
          occurred_at: string
          outcome: string | null
          responses: number
          type: string
          volume: number
        }
        Insert: {
          by_id?: string | null
          channel: string
          created_at?: string
          id?: string
          lead_id?: string | null
          leads_created?: number
          meetings_booked?: number
          note?: string
          occurred_at?: string
          outcome?: string | null
          responses?: number
          type?: string
          volume?: number
        }
        Update: {
          by_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          leads_created?: number
          meetings_booked?: number
          note?: string
          occurred_at?: string
          outcome?: string | null
          responses?: number
          type?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "bd_activities_by_id_fkey"
            columns: ["by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          doc: Json | null
          id: string
          lead_id: string | null
          project_id: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          doc?: Json | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          doc?: Json | null
          id?: string
          lead_id?: string | null
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bd_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "bd_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_daily_updates: {
        Row: {
          calls_made: number
          created_at: string
          id: string
          leads_added: number
          meetings_held: number
          platforms: string[]
          proposals_sent: number
          rep_id: string
          submitted_at: string | null
          summary: string
          update_date: string
          updated_at: string
        }
        Insert: {
          calls_made?: number
          created_at?: string
          id?: string
          leads_added?: number
          meetings_held?: number
          platforms?: string[]
          proposals_sent?: number
          rep_id: string
          submitted_at?: string | null
          summary?: string
          update_date?: string
          updated_at?: string
        }
        Update: {
          calls_made?: number
          created_at?: string
          id?: string
          leads_added?: number
          meetings_held?: number
          platforms?: string[]
          proposals_sent?: number
          rep_id?: string
          submitted_at?: string | null
          summary?: string
          update_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_daily_updates_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_handoffs: {
        Row: {
          budget: number
          by_id: string | null
          handed_at: string
          id: string
          lead_id: string
          manager_id: string | null
          notes: string | null
          project_id: string | null
          project_name: string
          service_slug: string
        }
        Insert: {
          budget?: number
          by_id?: string | null
          handed_at?: string
          id?: string
          lead_id: string
          manager_id?: string | null
          notes?: string | null
          project_id?: string | null
          project_name: string
          service_slug: string
        }
        Update: {
          budget?: number
          by_id?: string | null
          handed_at?: string
          id?: string
          lead_id?: string
          manager_id?: string | null
          notes?: string | null
          project_id?: string | null
          project_name?: string
          service_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_handoffs_by_id_fkey"
            columns: ["by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_handoffs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_handoffs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_handoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_leads: {
        Row: {
          added_on: string
          channel: string
          city: string
          closed_at: string | null
          company: string
          contact_name: string
          contact_title: string
          country: string
          created_at: string
          created_by: string | null
          description: string | null
          doc: Json | null
          documents: Json
          email: string
          icp_fit: string
          id: string
          industry: string
          last_contacted: string | null
          lost_reason: string | null
          next_follow_up: string | null
          owner_id: string | null
          phone: string
          position: number
          services: string[]
          socials: Json
          source: string
          stage: string
          temperature: string
          updated_at: string
          value: number
          value_currency: string
          value_entered: number | null
          value_fx_rate: number | null
          website: string
        }
        Insert: {
          added_on?: string
          channel?: string
          city?: string
          closed_at?: string | null
          company: string
          contact_name?: string
          contact_title?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc?: Json | null
          documents?: Json
          email?: string
          icp_fit?: string
          id?: string
          industry?: string
          last_contacted?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          owner_id?: string | null
          phone?: string
          position?: number
          services?: string[]
          socials?: Json
          source?: string
          stage?: string
          temperature?: string
          updated_at?: string
          value?: number
          value_currency?: string
          value_entered?: number | null
          value_fx_rate?: number | null
          website?: string
        }
        Update: {
          added_on?: string
          channel?: string
          city?: string
          closed_at?: string | null
          company?: string
          contact_name?: string
          contact_title?: string
          country?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc?: Json | null
          documents?: Json
          email?: string
          icp_fit?: string
          id?: string
          industry?: string
          last_contacted?: string | null
          lost_reason?: string | null
          next_follow_up?: string | null
          owner_id?: string | null
          phone?: string
          position?: number
          services?: string[]
          socials?: Json
          source?: string
          stage?: string
          temperature?: string
          updated_at?: string
          value?: number
          value_currency?: string
          value_entered?: number | null
          value_fx_rate?: number | null
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_meeting_attendees: {
        Row: {
          meeting_id: string
          profile_id: string
        }
        Insert: {
          meeting_id: string
          profile_id: string
        }
        Update: {
          meeting_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "bd_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_meeting_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_meetings: {
        Row: {
          client_attendees: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          host_id: string | null
          id: string
          join_url: string | null
          lead_id: string | null
          next_step: string | null
          outcome: string | null
          platform: string
          scheduled_at: string
          type: string
          updated_at: string
        }
        Insert: {
          client_attendees?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          host_id?: string | null
          id?: string
          join_url?: string | null
          lead_id?: string | null
          next_step?: string | null
          outcome?: string | null
          platform?: string
          scheduled_at: string
          type?: string
          updated_at?: string
        }
        Update: {
          client_attendees?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          host_id?: string | null
          id?: string
          join_url?: string | null
          lead_id?: string | null
          next_step?: string | null
          outcome?: string | null
          platform?: string
          scheduled_at?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_meetings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_mentions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          profile_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id: string
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_mentions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_project_members: {
        Row: {
          profile_id: string
          project_id: string
        }
        Insert: {
          profile_id: string
          project_id: string
        }
        Update: {
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_project_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_projects: {
        Row: {
          channels: string[]
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          doc: Json | null
          id: string
          name: string
          owner_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          doc?: Json | null
          id?: string
          name: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          doc?: Json | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_targets: {
        Row: {
          id: string
          meetings_target: number
          outreach_target: number
          period_month: string
          rep_id: string
          revenue_target: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          meetings_target?: number
          outreach_target?: number
          period_month: string
          rep_id: string
          revenue_target?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          meetings_target?: number
          outreach_target?: number
          period_month?: string
          rep_id?: string
          revenue_target?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bd_targets_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_task_checklist: {
        Row: {
          done: boolean
          id: string
          label: string
          position: number
          task_id: string
        }
        Insert: {
          done?: boolean
          id?: string
          label: string
          position?: number
          task_id: string
        }
        Update: {
          done?: boolean
          id?: string
          label?: string
          position?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_task_checklist_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "bd_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_tasks: {
        Row: {
          assignee_id: string | null
          channel: string | null
          created_at: string
          created_by: string | null
          description: string | null
          doc: Json | null
          due_date: string | null
          id: string
          lead_id: string | null
          position: number
          priority: string
          project_id: string
          recurrence: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc?: Json | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          position?: number
          priority?: string
          project_id: string
          recurrence?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          channel?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc?: Json | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          position?: number
          priority?: string
          project_id?: string
          recurrence?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "bd_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bd_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bd_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_punches: {
        Row: {
          created_at: string
          id: string
          local_date: string
          processed_at: string | null
          profile_id: string | null
          punch_uid: string
          punched_at: string
          raw: Json
          resolution: string
          terminal_id: string
          zk_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_date: string
          processed_at?: string | null
          profile_id?: string | null
          punch_uid: string
          punched_at: string
          raw?: Json
          resolution?: string
          terminal_id: string
          zk_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          local_date?: string
          processed_at?: string | null
          profile_id?: string | null
          punch_uid?: string
          punched_at?: string
          raw?: Json
          resolution?: string
          terminal_id?: string
          zk_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_punches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_punches_terminal_id_fkey"
            columns: ["terminal_id"]
            isOneToOne: false
            referencedRelation: "biometric_terminals"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_terminals: {
        Row: {
          clock_skew_sec: number | null
          created_at: string
          device_ip: string | null
          device_log_count: number | null
          device_roster: Json
          firmware: string | null
          id: string
          is_active: boolean
          last_heartbeat_at: string | null
          last_poll_at: string | null
          location: string | null
          name: string
          roster_synced_at: string | null
          secret_hash: string
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          clock_skew_sec?: number | null
          created_at?: string
          device_ip?: string | null
          device_log_count?: number | null
          device_roster?: Json
          firmware?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          last_poll_at?: string | null
          location?: string | null
          name: string
          roster_synced_at?: string | null
          secret_hash: string
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          clock_skew_sec?: number | null
          created_at?: string
          device_ip?: string | null
          device_log_count?: number | null
          device_roster?: Json
          firmware?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string | null
          last_poll_at?: string | null
          location?: string | null
          name?: string
          roster_synced_at?: string | null
          secret_hash?: string
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      channel_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          added_via_role: string | null
          channel_id: string
          created_at: string
          hidden_at: string | null
          last_read_at: string
          notifications_muted: boolean
          profile_id: string
          role_in_channel: string
        }
        Insert: {
          added_via_role?: string | null
          channel_id: string
          created_at?: string
          hidden_at?: string | null
          last_read_at?: string
          notifications_muted?: boolean
          profile_id: string
          role_in_channel?: string
        }
        Update: {
          added_via_role?: string | null
          channel_id?: string
          created_at?: string
          hidden_at?: string | null
          last_read_at?: string
          notifications_muted?: boolean
          profile_id?: string
          role_in_channel?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_roles: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string | null
          role: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by?: string | null
          role: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_roles_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          is_private: boolean
          kind: string
          name: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_private?: boolean
          kind: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          is_private?: boolean
          kind?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "channel_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          profile_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          profile_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_manager_id: string | null
          company: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          industry: string | null
          internal_note: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_manager_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          internal_note?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_manager_id?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          internal_note?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          doc: Json | null
          id: string
          is_internal: boolean
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          doc?: Json | null
          id?: string
          is_internal?: boolean
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          doc?: Json | null
          id?: string
          is_internal?: boolean
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      company_wfh_days: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_wfh_days_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rate_sync: {
        Row: {
          id: boolean
          last_error: string | null
          rate_date: string | null
          request_id: number | null
          requested_at: string | null
          succeeded_at: string | null
        }
        Insert: {
          id?: boolean
          last_error?: string | null
          rate_date?: string | null
          request_id?: number | null
          requested_at?: string | null
          succeeded_at?: string | null
        }
        Update: {
          id?: boolean
          last_error?: string | null
          rate_date?: string | null
          request_id?: number | null
          requested_at?: string | null
          succeeded_at?: string | null
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          code: string
          pkr_per_unit: number
          updated_at: string
        }
        Insert: {
          code: string
          pkr_per_unit: number
          updated_at?: string
        }
        Update: {
          code?: string
          pkr_per_unit?: number
          updated_at?: string
        }
        Relationships: []
      }
      designations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_of_the_month: {
        Row: {
          awarded_by: string | null
          created_at: string
          id: string
          month: number
          note: string | null
          profile_id: string
          updated_at: string
          year: number
        }
        Insert: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          month: number
          note?: string | null
          profile_id: string
          updated_at?: string
          year: number
        }
        Update: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          month?: number
          note?: string | null
          profile_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_of_the_month_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_the_month_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salaries: {
        Row: {
          amount: number
          currency: string
          profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          currency?: string
          profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          currency?: string
          profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salaries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolled_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          device_fingerprint: string
          device_name: string
          fingerprint_hint: string | null
          first_seen_at: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          profile_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          device_fingerprint: string
          device_name: string
          fingerprint_hint?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          profile_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          device_fingerprint?: string
          device_name?: string
          fingerprint_hint?: string | null
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolled_devices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolled_devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_log: {
        Row: {
          admin_id: string | null
          id: string
          started_at: string
          target_id: string | null
        }
        Insert: {
          admin_id?: string | null
          id?: string
          started_at?: string
          target_id?: string | null
        }
        Update: {
          admin_id?: string | null
          id?: string
          started_at?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_log_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_type_policies: {
        Row: {
          attendance_via_terminal: boolean
          auto_detect_network: boolean
          enforce_schedule_window: boolean
          job_type: string
          require_office_network: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attendance_via_terminal?: boolean
          auto_detect_network?: boolean
          enforce_schedule_window?: boolean
          job_type: string
          require_office_network?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attendance_via_terminal?: boolean
          auto_detect_network?: boolean
          enforce_schedule_window?: boolean
          job_type?: string
          require_office_network?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_type_policies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          day_part: string
          days: number
          end_date: string
          entered_by: string | null
          id: string
          leave_type_id: string
          profile_id: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_part?: string
          days?: number
          end_date: string
          entered_by?: string | null
          id?: string
          leave_type_id: string
          profile_id: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_part?: string
          days?: number
          end_date?: string
          entered_by?: string | null
          id?: string
          leave_type_id?: string
          profile_id?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          days_allowed: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          days_allowed?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          days_allowed?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          label: string | null
          level: number
          xp_required: number
        }
        Insert: {
          label?: string | null
          level: number
          xp_required: number
        }
        Update: {
          label?: string | null
          level?: number
          xp_required?: number
        }
        Relationships: []
      }
      mentions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          profile_id: string
          project_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id: string
          project_id: string
          source_id: string
          source_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string
          project_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          channel_id: string
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          kind: string
          link_url: string | null
          message_id: string | null
          mime_type: string | null
          storage_path: string | null
          uploader_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          kind?: string
          link_url?: string | null
          message_id?: string | null
          mime_type?: string | null
          storage_path?: string | null
          uploader_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          kind?: string
          link_url?: string | null
          message_id?: string | null
          mime_type?: string | null
          storage_path?: string | null
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          channel_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
          profile_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          profile_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body_doc: Json | null
          body_text: string
          channel_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
        }
        Insert: {
          author_id?: string | null
          body_doc?: Json | null
          body_text?: string
          channel_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string | null
          body_doc?: Json | null
          body_text?: string
          channel_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_lp_history: {
        Row: {
          created_at: string
          id: string
          lp_final: number
          period: string
          profile_id: string
          rank: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          lp_final: number
          period: string
          profile_id: string
          rank?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          lp_final?: number
          period?: string
          profile_id?: string
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_lp_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          enabled: boolean
          profile_id: string
          type: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          profile_id: string
          type: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          profile_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          profile_id: string
          read: boolean
          resource_id: string | null
          resource_type: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          profile_id: string
          read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          read?: boolean
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          created_at: string
          date: string
          end_time: string
          hours: number
          id: string
          profile_id: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          hours: number
          id?: string
          profile_id: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          hours?: number
          id?: string
          profile_id?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          description: string | null
          is_hidden: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          category: string
          description?: string | null
          is_hidden?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          description?: string | null
          is_hidden?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          profile_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          profile_id: string
          role_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          allowed_check_in: string | null
          attendance_excluded: boolean
          avatar_url: string | null
          bio: string | null
          clickup_user_id: string | null
          created_at: string
          designation_id: string | null
          email: string
          email_confirmed_at: string | null
          id: string
          invited_at: string | null
          is_active: boolean
          is_restricted: boolean
          job_title: string | null
          job_type: string
          last_seen_at: string | null
          last_sign_in_at: string | null
          level: number
          location: string | null
          lp_balance: number
          name: string
          phone: string | null
          reputation_total: number
          restricted_at: string | null
          restricted_by: string | null
          restricted_reason: string | null
          role: string
          skills: string[]
          tech_stacks: string[]
          theme: string
          updated_at: string
          zk_user_id: string | null
        }
        Insert: {
          age?: number | null
          allowed_check_in?: string | null
          attendance_excluded?: boolean
          avatar_url?: string | null
          bio?: string | null
          clickup_user_id?: string | null
          created_at?: string
          designation_id?: string | null
          email: string
          email_confirmed_at?: string | null
          id: string
          invited_at?: string | null
          is_active?: boolean
          is_restricted?: boolean
          job_title?: string | null
          job_type?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          level?: number
          location?: string | null
          lp_balance?: number
          name: string
          phone?: string | null
          reputation_total?: number
          restricted_at?: string | null
          restricted_by?: string | null
          restricted_reason?: string | null
          role?: string
          skills?: string[]
          tech_stacks?: string[]
          theme?: string
          updated_at?: string
          zk_user_id?: string | null
        }
        Update: {
          age?: number | null
          allowed_check_in?: string | null
          attendance_excluded?: boolean
          avatar_url?: string | null
          bio?: string | null
          clickup_user_id?: string | null
          created_at?: string
          designation_id?: string | null
          email?: string
          email_confirmed_at?: string | null
          id?: string
          invited_at?: string | null
          is_active?: boolean
          is_restricted?: boolean
          job_title?: string | null
          job_type?: string
          last_seen_at?: string | null
          last_sign_in_at?: string | null
          level?: number
          location?: string | null
          lp_balance?: number
          name?: string
          phone?: string | null
          reputation_total?: number
          restricted_at?: string | null
          restricted_by?: string | null
          restricted_reason?: string | null
          role?: string
          skills?: string[]
          tech_stacks?: string[]
          theme?: string
          updated_at?: string
          zk_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_level_fkey"
            columns: ["level"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["level"]
          },
          {
            foreignKeyName: "profiles_restricted_by_fkey"
            columns: ["restricted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_services: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_index: number
          project_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_index?: number
          project_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_index?: number
          project_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          service_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          service_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          service_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_watchers: {
        Row: {
          created_at: string
          profile_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_watchers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_watchers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          client_visible: boolean
          created_at: string
          created_by: string | null
          deadline: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          doc: Json | null
          id: string
          internal_note: string | null
          manager_id: string | null
          name: string
          progress: number
          start_date: string | null
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          doc?: Json | null
          id?: string
          internal_note?: string | null
          manager_id?: string | null
          name: string
          progress?: number
          start_date?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          doc?: Json | null
          id?: string
          internal_note?: string | null
          manager_id?: string | null
          name?: string
          progress?: number
          start_date?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_fingerprint: string | null
          device_label: string | null
          enabled: boolean
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          profile_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_fingerprint?: string | null
          device_label?: string | null
          enabled?: boolean
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          profile_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_fingerprint?: string | null
          device_label?: string | null
          enabled?: boolean
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_task_claims: {
        Row: {
          claimed_at: string
          id: string
          lp_awarded: number | null
          profile_id: string
          proof_note: string | null
          proof_url: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          task_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          lp_awarded?: number | null
          profile_id: string
          proof_note?: string | null
          proof_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          task_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          lp_awarded?: number | null
          profile_id?: string
          proof_note?: string | null
          proof_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_task_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_task_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_task_claims_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "quest_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          difficulty: string
          id: string
          lp_value: number
          max_claims: number
          requires_proof: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          difficulty: string
          id?: string
          lp_value: number
          max_claims?: number
          requires_proof?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          lp_value?: number
          max_claims?: number
          requires_proof?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_pool_members: {
        Row: {
          id: string
          joined_at: string
          lp_spent: number
          pool_id: string
          profile_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          lp_spent: number
          pool_id: string
          profile_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          lp_spent?: number
          pool_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "reward_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_pools: {
        Row: {
          created_at: string
          expires_at: string
          filled_at: string | null
          group_size: number
          id: string
          initiated_by: string
          note: string | null
          per_person_lp: number
          reviewed_at: string | null
          reviewed_by: string | null
          reward_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          filled_at?: string | null
          group_size: number
          id?: string
          initiated_by: string
          note?: string | null
          per_person_lp: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          filled_at?: string | null
          group_size?: number
          id?: string
          initiated_by?: string
          note?: string | null
          per_person_lp?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_pools_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pools_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pools_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reward_id: string
          status: Database["public"]["Enums"]["redemption_status"]
          xp_spent: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id: string
          status?: Database["public"]["Enums"]["redemption_status"]
          xp_spent: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_id?: string
          status?: Database["public"]["Enums"]["redemption_status"]
          xp_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          group_size: number
          id: string
          image_url: string | null
          is_active: boolean
          is_cash: boolean
          name: string
          quantity: number | null
          tier: string
          xp_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_size?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_cash?: boolean
          name: string
          quantity?: number | null
          tier?: string
          xp_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_size?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_cash?: boolean
          name?: string
          quantity?: number | null
          tier?: string
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_feature_flags: {
        Row: {
          enabled: boolean
          feature_key: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          is_hidden: boolean
          is_system: boolean
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          is_system?: boolean
          name: string
          position: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          is_system?: boolean
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_members: {
        Row: {
          created_at: string
          profile_id: string
          project_service_id: string
          role_in_service: string | null
        }
        Insert: {
          created_at?: string
          profile_id: string
          project_service_id: string
          role_in_service?: string | null
        }
        Update: {
          created_at?: string
          profile_id?: string
          project_service_id?: string
          role_in_service?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_members_project_service_id_fkey"
            columns: ["project_service_id"]
            isOneToOne: false
            referencedRelation: "project_services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          category: string
          created_at: string
          from_profile_id: string
          id: string
          impact: string
          lp_value: number
          message: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_profile_id: string
        }
        Insert: {
          category: string
          created_at?: string
          from_profile_id: string
          id?: string
          impact?: string
          lp_value: number
          message: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_profile_id: string
        }
        Update: {
          category?: string
          created_at?: string
          from_profile_id?: string
          id?: string
          impact?: string
          lp_value?: number
          message?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoutouts_from_profile_id_fkey"
            columns: ["from_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shoutouts_to_profile_id_fkey"
            columns: ["to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          approval_status: string | null
          client_visible: boolean
          created_at: string
          id: string
          name: string
          order_index: number
          project_id: string
          project_service_id: string
          requires_approval: boolean
          status: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          client_visible?: boolean
          created_at?: string
          id?: string
          name: string
          order_index?: number
          project_id: string
          project_service_id: string
          requires_approval?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          client_visible?: boolean
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          project_id?: string
          project_service_id?: string
          requires_approval?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stages_service_belongs_to_project"
            columns: ["project_service_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_services"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      standup_entries: {
        Row: {
          blocker: string | null
          created_at: string
          id: string
          minutes_spent: number
          order_index: number
          project_id: string | null
          project_name: string | null
          standup_id: string
          task_id: string | null
          task_name: string | null
          title: string | null
          work_done: string
          work_done_doc: Json | null
        }
        Insert: {
          blocker?: string | null
          created_at?: string
          id?: string
          minutes_spent: number
          order_index?: number
          project_id?: string | null
          project_name?: string | null
          standup_id: string
          task_id?: string | null
          task_name?: string | null
          title?: string | null
          work_done: string
          work_done_doc?: Json | null
        }
        Update: {
          blocker?: string | null
          created_at?: string
          id?: string
          minutes_spent?: number
          order_index?: number
          project_id?: string | null
          project_name?: string | null
          standup_id?: string
          task_id?: string | null
          task_name?: string | null
          title?: string | null
          work_done?: string
          work_done_doc?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "standup_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standup_entries_standup_id_fkey"
            columns: ["standup_id"]
            isOneToOne: false
            referencedRelation: "standups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standup_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      standup_participants: {
        Row: {
          is_required: boolean
          note: string | null
          profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          is_required: boolean
          note?: string | null
          profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          is_required?: boolean
          note?: string | null
          profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standup_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standup_participants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standup_role_settings: {
        Row: {
          is_required: boolean
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          is_required?: boolean
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          is_required?: boolean
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standup_role_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standup_settings: {
        Row: {
          enforce_required_hours: boolean
          min_work_done_chars: number
          on_time_window_min: number
          singleton: boolean
          unlock_mode: string
          unlock_offset_min: number
          unlock_time: string
          updated_at: string
          updated_by: string | null
          xp_on_time: number
        }
        Insert: {
          enforce_required_hours?: boolean
          min_work_done_chars?: number
          on_time_window_min?: number
          singleton?: boolean
          unlock_mode?: string
          unlock_offset_min?: number
          unlock_time?: string
          updated_at?: string
          updated_by?: string | null
          xp_on_time?: number
        }
        Update: {
          enforce_required_hours?: boolean
          min_work_done_chars?: number
          on_time_window_min?: number
          singleton?: boolean
          unlock_mode?: string
          unlock_offset_min?: number
          unlock_time?: string
          updated_at?: string
          updated_by?: string | null
          xp_on_time?: number
        }
        Relationships: [
          {
            foreignKeyName: "standup_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standups: {
        Row: {
          created_at: string
          edit_count: number
          edited_at: string | null
          id: string
          is_late: boolean
          notes: string | null
          profile_id: string
          standup_date: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edit_count?: number
          edited_at?: string | null
          id?: string
          is_late?: boolean
          notes?: string | null
          profile_id: string
          standup_date: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edit_count?: number
          edited_at?: string | null
          id?: string
          is_late?: boolean
          notes?: string | null
          profile_id?: string
          standup_date?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      status_labels: {
        Row: {
          color: string
          key: string
          label: string
          scope: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color: string
          key: string
          label: string
          scope: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string
          key?: string
          label?: string
          scope?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_labels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sticky_notes: {
        Row: {
          bold: boolean
          color: string
          content: string
          created_at: string
          id: string
          italic: boolean
          pos_x: number
          pos_y: number
          profile_id: string
          rotation: number
          shape: string
          size: number
          strikethrough: boolean
          text_align: string
          updated_at: string
          z_index: number
        }
        Insert: {
          bold?: boolean
          color?: string
          content?: string
          created_at?: string
          id?: string
          italic?: boolean
          pos_x?: number
          pos_y?: number
          profile_id: string
          rotation?: number
          shape?: string
          size?: number
          strikethrough?: boolean
          text_align?: string
          updated_at?: string
          z_index?: number
        }
        Update: {
          bold?: boolean
          color?: string
          content?: string
          created_at?: string
          id?: string
          italic?: boolean
          pos_x?: number
          pos_y?: number
          profile_id?: string
          rotation?: number
          shape?: string
          size?: number
          strikethrough?: boolean
          text_align?: string
          updated_at?: string
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          assignee_id: string | null
          completed: boolean
          created_at: string
          id: string
          order_index: number
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          order_index?: number
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed?: boolean
          created_at?: string
          id?: string
          order_index?: number
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          profile_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_entries: {
        Row: {
          billable: boolean
          created_at: string
          ended_at: string | null
          id: string
          note: string | null
          profile_id: string
          source: string
          started_at: string
          task_id: string
          updated_at: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          profile_id: string
          source?: string
          started_at: string
          task_id: string
          updated_at?: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          profile_id?: string
          source?: string
          started_at?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          muted: boolean
          profile_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          muted?: boolean
          profile_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          muted?: boolean
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          board_order: number
          client_visible: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          doc: Json | null
          due_date: string | null
          estimated_minutes: number | null
          id: string
          parent_task_id: string | null
          priority: string
          project_id: string
          project_service_id: string
          stage_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          board_order?: number
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          doc?: Json | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          project_id: string
          project_service_id: string
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          board_order?: number
          client_visible?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          doc?: Json | null
          due_date?: string | null
          estimated_minutes?: number | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          project_id?: string
          project_service_id?: string
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_service_belongs_to_project"
            columns: ["project_service_id", "project_id"]
            isOneToOne: false
            referencedRelation: "project_services"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          profile_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          name: string
          service_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          name: string
          service_type: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          name?: string
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_service_type_fkey"
            columns: ["service_type"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["slug"]
          },
        ]
      }
      template_stages: {
        Row: {
          client_visible: boolean
          created_at: string
          id: string
          name: string
          order_index: number
          requires_approval: boolean
          template_id: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          id?: string
          name: string
          order_index?: number
          requires_approval?: boolean
          template_id: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          requires_approval?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          client_visible: boolean
          created_at: string
          description: string | null
          estimated_minutes: number | null
          id: string
          order_index: number
          priority: string
          template_stage_id: string
          title: string
        }
        Insert: {
          client_visible?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number
          priority?: string
          template_stage_id: string
          title: string
        }
        Update: {
          client_visible?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          order_index?: number
          priority?: string
          template_stage_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_template_stage_id_fkey"
            columns: ["template_stage_id"]
            isOneToOne: false
            referencedRelation: "template_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      wfh_requests: {
        Row: {
          created_at: string
          day_part: string
          end_date: string
          granted_directly: boolean
          id: string
          profile_id: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_part?: string
          end_date: string
          granted_directly?: boolean
          id?: string
          profile_id: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_part?: string
          end_date?: string
          granted_directly?: boolean
          id?: string
          profile_id?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wfh_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wfh_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      working_saturdays: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "working_saturdays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          granted_by: string | null
          id: string
          profile_id: string
          reason: string
          task_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          granted_by?: string | null
          id?: string
          profile_id: string
          reason: string
          task_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          granted_by?: string | null
          id?: string
          profile_id?: string
          reason?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_timers: {
        Args: never
        Returns: {
          avatar_url: string
          profile_id: string
          profile_name: string
          project_id: string
          project_name: string
          running_minutes: number
          started_at: string
          task_id: string
          task_title: string
        }[]
      }
      admin_run_monthly_reset: { Args: never; Returns: undefined }
      admin_set_profile_active: {
        Args: { p_active: boolean; p_profile_id: string }
        Returns: undefined
      }
      admin_update_profile_details: {
        Args: { p_avatar_url?: string; p_name: string; p_profile_id: string }
        Returns: undefined
      }
      admin_update_profile_role: {
        Args: {
          p_allowed_check_in?: string
          p_attendance_excluded?: boolean
          p_designation_id?: string
          p_job_type?: string
          p_profile_id: string
          p_role: string
        }
        Returns: undefined
      }
      apply_template_to_service: {
        Args: { p_project_service_id: string; p_template_id: string }
        Returns: {
          stages_created: number
          tasks_created: number
        }[]
      }
      award_badge: {
        Args: { p_badge_id: string; p_profile_id: string }
        Returns: undefined
      }
      bd_can_manage: { Args: never; Returns: boolean }
      bd_can_view: { Args: never; Returns: boolean }
      bd_handoff_to_project: {
        Args: {
          p_budget: number
          p_client_id?: string
          p_client_name?: string
          p_deadline?: string
          p_lead_id: string
          p_manager_id: string
          p_notes?: string
          p_project_name: string
          p_services: Json
          p_start_date?: string
        }
        Returns: {
          client_id: string
          handoff_id: string
          project_id: string
          stages_created: number
          tasks_created: number
        }[]
      }
      bd_people: {
        Args: never
        Returns: {
          avatar_url: string
          id: string
          name: string
          role: string
        }[]
      }
      can_access_task: { Args: { p_task_id: string }; Returns: boolean }
      can_govern_gamification: { Args: never; Returns: boolean }
      can_grant_role: { Args: { p_role: string }; Returns: boolean }
      can_manage_target: { Args: { p_target_role: string }; Returns: boolean }
      can_manage_team_templates: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      can_oversee_channel: { Args: { p_channel_id: string }; Returns: boolean }
      can_recognize: { Args: never; Returns: boolean }
      can_view_bd_project: { Args: { p_project_id: string }; Returns: boolean }
      can_view_confidential_scope: {
        Args: { p_scope: string }
        Returns: boolean
      }
      cancel_reward_pool: {
        Args: { p_note?: string; p_pool_id: string }
        Returns: undefined
      }
      claim_quest_task: { Args: { p_task_id: string }; Returns: string }
      copy_template_into_service: {
        Args: { p_project_service_id: string; p_template_id: string }
        Returns: {
          stages_created: number
          tasks_created: number
        }[]
      }
      count_open_claimable_quests: { Args: never; Returns: number }
      create_biometric_terminal: {
        Args: {
          p_device_ip?: string
          p_location?: string
          p_name: string
          p_secret?: string
        }
        Returns: string
      }
      current_user_role: { Args: never; Returns: string }
      day_roster: {
        Args: { p_date: string }
        Returns: {
          avatar_url: string
          check_in: string
          check_out: string
          company_wfh: string
          day_part: string
          detail_visible: boolean
          holiday_name: string
          is_late: boolean
          job_title: string
          leave_color: string
          leave_type: string
          name: string
          profile_id: string
          role: string
          status: string
          team_names: string[]
        }[]
      }
      delete_employee_of_the_month: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: string[]
      }
      delete_task_cascade: { Args: { p_task_id: string }; Returns: string[] }
      expire_reward_pools: { Args: never; Returns: undefined }
      fn_absorb_currency_rates: { Args: never; Returns: undefined }
      fn_add_channel_role: {
        Args: { p_channel_id: string; p_role: string }
        Returns: undefined
      }
      fn_all_internal_staff: {
        Args: never
        Returns: {
          profile_id: string
        }[]
      }
      fn_arrival_status: {
        Args: { p_check_in: string; p_day_part: string }
        Returns: string
      }
      fn_audit_describe: {
        Args: {
          p_action: string
          p_actor: string
          p_op: string
          p_row: Json
          p_subject: string
          p_table: string
        }
        Returns: Record<string, unknown>
      }
      fn_auto_checkout_missing: { Args: never; Returns: undefined }
      fn_award_badges: { Args: { p_profile_id: string }; Returns: undefined }
      fn_can_report_on: { Args: { p_profile: string }; Returns: boolean }
      fn_chat_unread_counts: {
        Args: never
        Returns: {
          channel_id: string
          unread_count: number
        }[]
      }
      fn_clamped_minutes: {
        Args: {
          p_ended: string
          p_from: string
          p_started: string
          p_to: string
        }
        Returns: number
      }
      fn_create_channel: {
        Args: {
          p_description?: string
          p_is_private?: boolean
          p_member_ids?: string[]
          p_name: string
          p_roles?: string[]
        }
        Returns: string
      }
      fn_exception_label: { Args: { t: string }; Returns: string }
      fn_extract_mention_ids: { Args: { p_doc: Json }; Returns: string[] }
      fn_fmt_day: { Args: { d: string }; Returns: string }
      fn_fmt_minutes: { Args: { p_minutes: number }; Returns: string }
      fn_fmt_span: {
        Args: { p_end: string; p_part?: string; p_start: string }
        Returns: string
      }
      fn_get_or_create_dm: {
        Args: { p_other_profile_id: string }
        Returns: string
      }
      fn_hide_channel: { Args: { p_channel_id: string }; Returns: undefined }
      fn_is_working_day: { Args: { d: string }; Returns: boolean }
      fn_makeup_balance: {
        Args: { p_from: string; p_profile: string; p_to: string }
        Returns: {
          balance_minutes: number
          made_up_minutes: number
          owed_minutes: number
        }[]
      }
      fn_mark_absent_for_date: { Args: { d: string }; Returns: undefined }
      fn_mark_absent_today: { Args: never; Returns: undefined }
      fn_mark_channel_read: {
        Args: { p_channel_id: string }
        Returns: undefined
      }
      fn_monthly_lp_reset: { Args: never; Returns: undefined }
      fn_move_task: {
        Args: {
          p_project_service_id: string
          p_stage_id?: string
          p_task_id: string
        }
        Returns: undefined
      }
      fn_next_working_start: { Args: { p_date: string }; Returns: string }
      fn_notify: {
        Args: {
          p_actor?: string
          p_body: string
          p_profile_id: string
          p_resource_id?: string
          p_resource_type?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      fn_purge_old_notifications: { Args: never; Returns: undefined }
      fn_recalc_project_progress: {
        Args: { p_project: string }
        Returns: undefined
      }
      fn_remove_channel_role: {
        Args: { p_channel_id: string; p_role: string }
        Returns: undefined
      }
      fn_request_approvers: {
        Args: { p_requester: string }
        Returns: {
          profile_id: string
        }[]
      }
      fn_request_currency_rates: { Args: never; Returns: undefined }
      fn_set_channel_muted: {
        Args: { p_channel_id: string; p_muted: boolean }
        Returns: undefined
      }
      fn_staff_with_permission: {
        Args: { p_key: string }
        Returns: {
          profile_id: string
        }[]
      }
      fn_standup_opens_at: { Args: { p_date: string }; Returns: string }
      fn_standup_participant: { Args: { p_profile: string }; Returns: boolean }
      fn_standup_required: {
        Args: { p_date: string; p_profile: string }
        Returns: boolean
      }
      fn_standup_required_minutes: {
        Args: { p_date: string; p_profile: string }
        Returns: number
      }
      fn_standup_suggestions: {
        Args: { p_date: string; p_profile: string }
        Returns: {
          project_id: string
          project_name: string
          source: string
          task_id: string
          task_title: string
          tracked_minutes: number
        }[]
      }
      fn_standup_window: {
        Args: { p_profile: string }
        Returns: {
          already_done: boolean
          can_edit: boolean
          closes_at: string
          enforce_required_hours: boolean
          is_open: boolean
          is_required: boolean
          is_working_day: boolean
          makeup_owed_minutes: number
          min_work_done_chars: number
          my_standup_id: string
          on_time_until: string
          opens_at: string
          required_minutes: number
          server_now: string
          standup_date: string
          timezone: string
          work_end_time: string
          xp_on_time: number
        }[]
      }
      fn_sync_channel_role: {
        Args: { p_channel_id: string; p_role: string }
        Returns: undefined
      }
      fn_task_activity: {
        Args: { p_limit?: number; p_task_id: string }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          changed_fields: string[]
          created_at: string
          id: string
          new_values: Json
          old_values: Json
        }[]
      }
      fn_task_status_label: { Args: { p_status: string }; Returns: string }
      fn_task_status_recipients: {
        Args: { p_actor: string; p_task_id: string }
        Returns: {
          profile_id: string
        }[]
      }
      fn_task_subscribers: {
        Args: { p_actor: string; p_task_id: string }
        Returns: {
          profile_id: string
        }[]
      }
      fn_terminal_sync_office_ip: {
        Args: {
          p_observed_ip: string
          p_reported_ip?: string
          p_terminal_name: string
        }
        Returns: Json
      }
      fn_toggle_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      fn_unpaid_exception_minutes: {
        Args: { p_date: string; p_profile: string }
        Returns: number
      }
      fn_unwind_reward_pool: {
        Args: {
          p_pool: Database["public"]["Tables"]["reward_pools"]["Row"]
          p_reward_name: string
        }
        Returns: undefined
      }
      fn_validate_standup_entries: {
        Args: { p_date: string; p_entries: Json; p_profile: string }
        Returns: undefined
      }
      fn_working_day_minutes: { Args: never; Returns: number }
      fn_working_overlap_minutes: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
      gamification_pending_count: { Args: never; Returns: number }
      get_my_terminal_gate: {
        Args: never
        Returns: {
          last_heartbeat_at: string
          must_use_terminal: boolean
          on_office_network: boolean
          terminal_location: string
          terminal_name: string
          wfh_today: boolean
        }[]
      }
      get_quest_claimants: {
        Args: never
        Returns: {
          avatar_url: string
          claim_id: string
          claimed_at: string
          name: string
          profile_id: string
          status: string
          task_id: string
        }[]
      }
      give_shoutout: {
        Args: {
          p_category: string
          p_impact?: string
          p_lp_value?: number
          p_message: string
          p_to_profile_id: string
        }
        Returns: string
      }
      has_feature: { Args: { p_key: string }; Returns: boolean }
      is_channel_member: { Args: { p_channel_id: string }; Returns: boolean }
      is_channel_owner: { Args: { p_channel_id: string }; Returns: boolean }
      is_internal: { Args: never; Returns: boolean }
      is_permission_hidden: { Args: { p_key: string }; Returns: boolean }
      is_project_creator: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_role_hidden: { Args: { p_role_id: string }; Returns: boolean }
      is_service_member: {
        Args: { p_project_service_id: string }
        Returns: boolean
      }
      is_task_assignee: { Args: { p_task_id: string }; Returns: boolean }
      join_reward_pool: { Args: { p_pool_id: string }; Returns: undefined }
      leave_reward_pool: { Args: { p_pool_id: string }; Returns: undefined }
      link_zk_enrollment: {
        Args: { p_profile_id: string; p_zk_user_id: string }
        Returns: {
          adopted_punches: number
          affected_dates: string[]
        }[]
      }
      my_bd_meetings: {
        Args: never
        Returns: {
          attendees: Json
          client_attendees: string
          company: string
          duration_minutes: number
          host_id: string
          host_name: string
          id: string
          join_url: string
          next_step: string
          outcome: string
          platform: string
          scheduled_at: string
          type: string
        }[]
      }
      my_permissions: { Args: never; Returns: string[] }
      open_reward_pool: { Args: { p_reward_id: string }; Returns: string }
      redeem_reward: {
        Args: { p_profile_id: string; p_reward_id: string }
        Returns: string
      }
      release_quest_claim: { Args: { p_claim_id: string }; Returns: undefined }
      remove_project_service: {
        Args: { p_project_service_id: string }
        Returns: undefined
      }
      report_employee_backlog: {
        Args: { p_from: string; p_to: string }
        Returns: {
          avatar_url: string
          made_up_minutes: number
          makeup_balance_minutes: number
          profile_id: string
          profile_name: string
          projects: number
          required_minutes: number
          role: string
          standup_minutes: number
          standups_late: number
          standups_submitted: number
          timer_minutes: number
          unpaid_minutes: number
          variance_minutes: number
        }[]
      }
      report_employee_detail: {
        Args: { p_from: string; p_profile: string; p_to: string }
        Returns: {
          client_name: string
          project_id: string
          project_name: string
          standup_minutes: number
          tasks: number
          timer_minutes: number
          variance_minutes: number
        }[]
      }
      report_employee_tasks: {
        Args: { p_from: string; p_profile: string; p_to: string }
        Returns: {
          due_date: string
          last_activity: string
          priority: string
          project_id: string
          project_name: string
          service_name: string
          service_slug: string
          standup_minutes: number
          status: string
          task_deleted: boolean
          task_id: string
          task_title: string
          timer_minutes: number
          variance_minutes: number
        }[]
      }
      report_project_backlog: {
        Args: { p_from: string; p_to: string }
        Returns: {
          budget: number
          client_name: string
          people: number
          project_id: string
          project_name: string
          standup_minutes: number
          status: string
          tasks: number
          timer_minutes: number
          variance_minutes: number
        }[]
      }
      report_project_detail: {
        Args: { p_from: string; p_project: string; p_to: string }
        Returns: {
          avatar_url: string
          profile_id: string
          profile_name: string
          standup_minutes: number
          tasks: number
          timer_minutes: number
          variance_minutes: number
        }[]
      }
      report_project_tasks: {
        Args: { p_from: string; p_project: string; p_to: string }
        Returns: {
          assignees: string[]
          due_date: string
          estimated_minutes: number
          had_activity: boolean
          last_activity: string
          people: number
          priority: string
          service_name: string
          service_slug: string
          stage_name: string
          standup_minutes: number
          status: string
          task_deleted: boolean
          task_id: string
          task_title: string
          timer_minutes: number
          variance_minutes: number
        }[]
      }
      review_quest_task: {
        Args: { p_approve: boolean; p_claim_id: string; p_note?: string }
        Returns: undefined
      }
      review_redemption: {
        Args: { p_action: string; p_id: string; p_note?: string }
        Returns: undefined
      }
      review_reward_pool: {
        Args: { p_action: string; p_note?: string; p_pool_id: string }
        Returns: undefined
      }
      review_shoutout: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: undefined
      }
      rotate_biometric_terminal_secret: {
        Args: { p_id: string; p_secret: string }
        Returns: undefined
      }
      set_employee_of_the_month: {
        Args: {
          p_month: number
          p_note?: string
          p_profile_id: string
          p_year: number
        }
        Returns: undefined
      }
      set_participation_restriction: {
        Args: { p_profile_id: string; p_reason?: string; p_restricted: boolean }
        Returns: undefined
      }
      set_profile_teams: {
        Args: { p_profile_id: string; p_team_ids: string[] }
        Returns: undefined
      }
      set_standup_participation: {
        Args: { p_mode: string; p_note?: string; p_profile: string }
        Returns: undefined
      }
      set_standup_role_requirement: {
        Args: { p_required: boolean; p_role: string }
        Returns: undefined
      }
      shares_team_with: { Args: { p_other: string }; Returns: boolean }
      standup_roster: {
        Args: { p_date: string }
        Returns: {
          avatar_url: string
          is_late: boolean
          name: string
          on_leave: boolean
          profile_id: string
          role: string
          standup_id: string
          submitted_at: string
        }[]
      }
      standup_suggestions: {
        Args: never
        Returns: {
          project_id: string
          project_name: string
          source: string
          task_id: string
          task_title: string
          tracked_minutes: number
        }[]
      }
      standup_window: {
        Args: never
        Returns: {
          already_done: boolean
          can_edit: boolean
          closes_at: string
          enforce_required_hours: boolean
          is_open: boolean
          is_required: boolean
          is_working_day: boolean
          makeup_owed_minutes: number
          min_work_done_chars: number
          my_standup_id: string
          on_time_until: string
          opens_at: string
          required_minutes: number
          server_now: string
          standup_date: string
          timezone: string
          work_end_time: string
          xp_on_time: number
        }[]
      }
      submit_quest_task: {
        Args: {
          p_claim_id: string
          p_proof_note?: string
          p_proof_url?: string
        }
        Returns: undefined
      }
      submit_standup: {
        Args: { p_entries: Json; p_notes?: string }
        Returns: string
      }
      timesheet_roster: {
        Args: { p_date: string }
        Returns: {
          att_status: string
          avatar_url: string
          check_in: string
          check_out: string
          day_part: string
          day_type: string
          exceptions: Json
          expected_end: string
          expected_start: string
          holiday_name: string
          is_working_day: boolean
          job_title: string
          leave_color: string
          leave_type: string
          profile_id: string
          profile_name: string
          required_minutes: number
          role: string
          segments: number
          team_names: string[]
          tracked_minutes: number
        }[]
      }
      timesheet_segments: {
        Args: { p_date: string; p_profile?: string }
        Returns: {
          avatar_url: string
          ended_at: string
          is_running: boolean
          minutes: number
          profile_id: string
          profile_name: string
          project_id: string
          project_name: string
          started_at: string
          task_id: string
          task_title: string
        }[]
      }
      top_role_position: { Args: { p_profile: string }; Returns: number }
      unlink_zk_enrollment: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      update_standup: {
        Args: { p_entries: Json; p_notes?: string; p_standup_id: string }
        Returns: string
      }
    }
    Enums: {
      queue_status: "pending" | "processing" | "done" | "failed"
      redemption_status: "pending" | "approved" | "fulfilled" | "rejected"
      sync_operation: "create" | "update" | "delete"
      sync_state: "synced" | "pending" | "error"
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
      queue_status: ["pending", "processing", "done", "failed"],
      redemption_status: ["pending", "approved", "fulfilled", "rejected"],
      sync_operation: ["create", "update", "delete"],
      sync_state: ["synced", "pending", "error"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
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
          status: string
          updated_at: string
          wifi_validated: boolean
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
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
          status?: string
          updated_at?: string
          wifi_validated?: boolean
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
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
          status?: string
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
          checkout_buffer_min: number
          early_checkin_min: number
          grace_period_min: number
          office_ip_cidr: string | null
          saturday_working: boolean
          singleton: boolean
          timezone: string
          updated_at: string
          updated_by: string | null
          work_end_time: string
          work_start_time: string
          xp_on_time_checkin: number
        }
        Insert: {
          auto_checkout?: boolean
          checkout_buffer_min?: number
          early_checkin_min?: number
          grace_period_min?: number
          office_ip_cidr?: string | null
          saturday_working?: boolean
          singleton?: boolean
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          work_end_time?: string
          work_start_time?: string
          xp_on_time_checkin?: number
        }
        Update: {
          auto_checkout?: boolean
          checkout_buffer_min?: number
          early_checkin_min?: number
          grace_period_min?: number
          office_ip_cidr?: string | null
          saturday_working?: boolean
          singleton?: boolean
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
      job_type_policies: {
        Row: {
          auto_detect_network: boolean
          enforce_schedule_window: boolean
          job_type: string
          require_office_network: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_detect_network?: boolean
          enforce_schedule_window?: boolean
          job_type: string
          require_office_network?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      wfh_requests: {
        Row: {
          created_at: string
          date: string
          granted_directly: boolean
          id: string
          profile_id: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          granted_directly?: boolean
          id?: string
          profile_id: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          granted_directly?: boolean
          id?: string
          profile_id?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
      award_badge: {
        Args: { p_badge_id: string; p_profile_id: string }
        Returns: undefined
      }
      can_govern_gamification: { Args: never; Returns: boolean }
      can_grant_role: { Args: { p_role: string }; Returns: boolean }
      can_manage_target: { Args: { p_target_role: string }; Returns: boolean }
      can_recognize: { Args: never; Returns: boolean }
      cancel_reward_pool: {
        Args: { p_note?: string; p_pool_id: string }
        Returns: undefined
      }
      claim_quest_task: { Args: { p_task_id: string }; Returns: string }
      current_user_role: { Args: never; Returns: string }
      delete_employee_of_the_month: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      expire_reward_pools: { Args: never; Returns: undefined }
      fn_all_internal_staff: {
        Args: never
        Returns: {
          profile_id: string
        }[]
      }
      fn_auto_checkout_missing: { Args: never; Returns: undefined }
      fn_award_badges: { Args: { p_profile_id: string }; Returns: undefined }
      fn_exception_label: { Args: { t: string }; Returns: string }
      fn_fmt_day: { Args: { d: string }; Returns: string }
      fn_is_working_day: { Args: { d: string }; Returns: boolean }
      fn_mark_absent_for_date: { Args: { d: string }; Returns: undefined }
      fn_mark_absent_today: { Args: never; Returns: undefined }
      fn_monthly_lp_reset: { Args: never; Returns: undefined }
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
      fn_request_approvers: {
        Args: { p_requester: string }
        Returns: {
          profile_id: string
        }[]
      }
      fn_unwind_reward_pool: {
        Args: {
          p_pool: Database["public"]["Tables"]["reward_pools"]["Row"]
          p_reward_name: string
        }
        Returns: undefined
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
      is_internal: { Args: never; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      join_reward_pool: { Args: { p_pool_id: string }; Returns: undefined }
      leave_reward_pool: { Args: { p_pool_id: string }; Returns: undefined }
      open_reward_pool: { Args: { p_reward_id: string }; Returns: string }
      redeem_reward: {
        Args: { p_profile_id: string; p_reward_id: string }
        Returns: string
      }
      release_quest_claim: { Args: { p_claim_id: string }; Returns: undefined }
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
      shares_team_with: { Args: { p_other: string }; Returns: boolean }
      submit_quest_task: {
        Args: {
          p_claim_id: string
          p_proof_note?: string
          p_proof_url?: string
        }
        Returns: undefined
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

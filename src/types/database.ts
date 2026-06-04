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
      enrolled_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          device_fingerprint: string
          device_name: string
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
      leave_requests: {
        Row: {
          created_at: string
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
          avatar_url: string | null
          clickup_user_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_restricted: boolean
          last_seen_at: string | null
          level: number
          lp_balance: number
          name: string
          reputation_total: number
          restricted_at: string | null
          restricted_by: string | null
          restricted_reason: string | null
          role: string
          service_type: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clickup_user_id?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          is_restricted?: boolean
          last_seen_at?: string | null
          level?: number
          lp_balance?: number
          name: string
          reputation_total?: number
          restricted_at?: string | null
          restricted_by?: string | null
          restricted_reason?: string | null
          role?: string
          service_type?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clickup_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_restricted?: boolean
          last_seen_at?: string | null
          level?: number
          lp_balance?: number
          name?: string
          reputation_total?: number
          restricted_at?: string | null
          restricted_by?: string | null
          restricted_reason?: string | null
          role?: string
          service_type?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
        Args: { p_profile_id: string; p_role: string; p_service_type?: string; p_team_id?: string }
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
      claim_quest_task: { Args: { p_task_id: string }; Returns: string }
      current_user_role: { Args: never; Returns: string }
      fn_auto_checkout_missing: { Args: never; Returns: undefined }
      fn_award_badges: { Args: { p_profile_id: string }; Returns: undefined }
      fn_is_working_day: { Args: { d: string }; Returns: boolean }
      fn_mark_absent_for_date: { Args: { d: string }; Returns: undefined }
      fn_mark_absent_today: { Args: never; Returns: undefined }
      fn_monthly_lp_reset: { Args: never; Returns: undefined }
      give_shoutout: {
        Args: {
          p_category: string
          p_impact?: string
          p_message: string
          p_to_profile_id: string
        }
        Returns: string
      }
      is_internal: { Args: never; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      redeem_reward: {
        Args: { p_profile_id: string; p_reward_id: string }
        Returns: string
      }
      review_quest_task: {
        Args: { p_approve: boolean; p_claim_id: string; p_note?: string }
        Returns: undefined
      }
      review_redemption: {
        Args: { p_action: string; p_id: string; p_note?: string }
        Returns: undefined
      }
      review_shoutout: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: undefined
      }
      set_participation_restriction: {
        Args: { p_profile_id: string; p_reason?: string; p_restricted: boolean }
        Returns: undefined
      }
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

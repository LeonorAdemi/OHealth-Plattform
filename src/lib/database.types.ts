// Generiert aus dem Supabase-Projekt "ohealth" (nicht von Hand ändern).
// Neu erzeugen nach jeder Migration:
//   supabase gen types typescript --linked > src/lib/database.types.ts

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          chat_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          chat_id: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          chat_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          last_read_at?: string
          user_id?: string
        }
        Update: {
          chat_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          accepted_at: string | null
          created_at: string
          group_id: string | null
          id: string
          kind: string
          meetup_id: string | null
          requested_by: string | null
          user_high: string | null
          user_low: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind: string
          meetup_id?: string | null
          requested_by?: string | null
          user_high?: string | null
          user_low?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          meetup_id?: string | null
          requested_by?: string | null
          user_high?: string | null
          user_low?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: true
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          aliases: string[]
          country: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          status: string
        }
        Insert: {
          aliases?: string[]
          country: string
          id: string
          lat?: number | null
          lng?: number | null
          name: string
          status?: string
        }
        Update: {
          aliases?: string[]
          country?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          aliases: string[]
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean
          measure: string
          muscle_group: string | null
          name: string
        }
        Insert: {
          aliases?: string[]
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          measure?: string
          muscle_group?: string | null
          name: string
        }
        Update: {
          aliases?: string[]
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean
          measure?: string
          muscle_group?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          followee_id: string
          follower_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          city: string | null
          city_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hidden: boolean
          id: string
          invite_code: string
          name: string
          sport: string | null
          sport_id: string | null
          type: string
        }
        Insert: {
          city?: string | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hidden?: boolean
          id?: string
          invite_code?: string
          name: string
          sport?: string | null
          sport_id?: string | null
          type?: string
        }
        Update: {
          city?: string | null
          city_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hidden?: boolean
          id?: string
          invite_code?: string
          name?: string
          sport?: string | null
          sport_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          meetup_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          meetup_id: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          meetup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_messages_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_participants: {
        Row: {
          created_at: string
          meetup_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          meetup_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          meetup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_participants_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_series: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          next_starts_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          next_starts_at: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          next_starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_series_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_shares: {
        Row: {
          created_at: string
          group_id: string
          meetup_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          meetup_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          meetup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_shares_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_shares_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
        ]
      }
      meetups: {
        Row: {
          created_at: string
          created_by: string
          distance_m: number | null
          duration_minutes: number | null
          elevation_m: number | null
          group_id: string | null
          id: string
          level: string | null
          max_participants: number | null
          note: string | null
          pace_seconds_per_km: number | null
          place: string | null
          series_id: string | null
          speed_kmh: number | null
          sport_id: string | null
          starts_at: string
          template_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          distance_m?: number | null
          duration_minutes?: number | null
          elevation_m?: number | null
          group_id?: string | null
          id?: string
          level?: string | null
          max_participants?: number | null
          note?: string | null
          pace_seconds_per_km?: number | null
          place?: string | null
          series_id?: string | null
          speed_kmh?: number | null
          sport_id?: string | null
          starts_at: string
          template_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          distance_m?: number | null
          duration_minutes?: number | null
          elevation_m?: number | null
          group_id?: string | null
          id?: string
          level?: string | null
          max_participants?: number | null
          note?: string | null
          pace_seconds_per_km?: number | null
          place?: string | null
          series_id?: string | null
          speed_kmh?: number | null
          sport_id?: string | null
          starts_at?: string
          template_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetups_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "meetup_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetups_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          cancelled: boolean
          community_message: boolean
          direct_message: boolean
          friends: boolean
          joined: boolean
          message: boolean
          new_training_private: boolean
          new_training_public: boolean
          reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled?: boolean
          community_message?: boolean
          direct_message?: boolean
          friends?: boolean
          joined?: boolean
          message?: boolean
          new_training_private?: boolean
          new_training_public?: boolean
          reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          cancelled?: boolean
          community_message?: boolean
          direct_message?: boolean
          friends?: boolean
          joined?: boolean
          message?: boolean
          new_training_private?: boolean
          new_training_public?: boolean
          reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          actor_name: string
          chat_id: string | null
          count: number
          created_at: string
          group_id: string | null
          id: string
          kind: string
          meetup_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          chat_id?: string | null
          count?: number
          created_at?: string
          group_id?: string | null
          id?: string
          kind: string
          meetup_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          chat_id?: string | null
          count?: number
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          meetup_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          city_id: string | null
          created_at: string
          display_name: string
          id: string
          is_private: boolean
          sports: string[]
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          display_name: string
          id: string
          is_private?: boolean
          sports?: string[]
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_private?: boolean
          sports?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          aliases: string[]
          category: string
          has_distance: boolean
          has_elevation: boolean
          has_sets: boolean
          id: string
          name: string
          pace_unit: string | null
          position: number
        }
        Insert: {
          aliases?: string[]
          category: string
          has_distance?: boolean
          has_elevation?: boolean
          has_sets?: boolean
          id: string
          name: string
          pace_unit?: string | null
          position?: number
        }
        Update: {
          aliases?: string[]
          category?: string
          has_distance?: boolean
          has_elevation?: boolean
          has_sets?: boolean
          id?: string
          name?: string
          pace_unit?: string | null
          position?: number
        }
        Relationships: []
      }
      template_version_exercises: {
        Row: {
          exercise_id: string
          id: string
          position: number
          target_distance_m: number | null
          target_duration_seconds: number | null
          target_reps: number | null
          target_sets: number
          target_weight_kg: number | null
          version_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          position: number
          target_distance_m?: number | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_sets?: number
          target_weight_kg?: number | null
          version_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          position?: number
          target_distance_m?: number | null
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_sets?: number
          target_weight_kg?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_version_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_version_exercises_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          source: string
          template_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          source?: string
          template_id: string
          version_number: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          source?: string
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          distance_m: number | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          position: number
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_number: number
          weight_kg: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number: number
          weight_kg?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          position?: number
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number?: number
          weight_kg?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "v_exercise_last_sessions"
            referencedColumns: ["workout_id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "v_exercise_sessions"
            referencedColumns: ["workout_id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          copied_from: string | null
          created_at: string
          hidden: boolean
          id: string
          name: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          copied_from?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          name: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Update: {
          copied_from?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          distance_m: number | null
          duration_minutes: number | null
          elevation_m: number | null
          feeling: number | null
          finished_at: string | null
          id: string
          notes: string | null
          performed_at: string
          source: string
          sport_id: string
          started_at: string | null
          template_version_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          duration_minutes?: number | null
          elevation_m?: number | null
          feeling?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          source?: string
          sport_id?: string
          started_at?: string | null
          template_version_id?: string | null
          title?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          duration_minutes?: number | null
          elevation_m?: number | null
          feeling?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          source?: string
          sport_id?: string
          started_at?: string | null
          template_version_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_exercise_bests: {
        Row: {
          best_e1rm_kg: number | null
          exercise_id: string | null
          max_duration_seconds: number | null
          max_reps: number | null
          max_weight_kg: number | null
          total_distance_m: number | null
          total_volume_kg: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_exercise_last_sessions: {
        Row: {
          best_e1rm_kg: number | null
          exercise_id: string | null
          max_duration_seconds: number | null
          max_reps: number | null
          max_weight_kg: number | null
          performed_at: string | null
          set_count: number | null
          total_distance_m: number | null
          total_reps: number | null
          total_volume_kg: number | null
          user_id: string | null
          workout_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_exercise_sessions: {
        Row: {
          best_e1rm_kg: number | null
          exercise_id: string | null
          max_duration_seconds: number | null
          max_reps: number | null
          max_weight_kg: number | null
          performed_at: string | null
          set_count: number | null
          total_distance_m: number | null
          total_reps: number | null
          total_volume_kg: number | null
          user_id: string | null
          workout_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_training_days: {
        Row: {
          day: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      block_person: { Args: { target: string }; Returns: undefined }
      cancel_meetup_series: { Args: { p_id: string }; Returns: number }
      chat_messages_page: {
        Args: { cid: string; max_rows?: number }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          id: string
          user_id: string
        }[]
      }
      community_bests: {
        Args: { gid: string }
        Returns: {
          best_e1rm_kg: number
          display_name: string
          exercise_id: string
          max_duration_seconds: number
          max_reps: number
          max_weight_kg: number
          total_distance_m: number
          user_id: string
        }[]
      }
      community_directory: {
        Args: { max_rows?: number; search?: string }
        Returns: {
          city: string
          description: string
          id: string
          is_member: boolean
          member_count: number
          name: string
          sport: string
        }[]
      }
      community_link_preview: {
        Args: { code: string }
        Returns: {
          city: string
          description: string
          id: string
          is_member: boolean
          member_count: number
          name: string
          sport: string
          type: string
        }[]
      }
      community_search: {
        Args: { max_rows?: number; search?: string }
        Returns: {
          city: string
          description: string
          id: string
          is_member: boolean
          member_count: number
          name: string
          sport: string
        }[]
      }
      community_training_days: {
        Args: { from_day: string; gid: string }
        Returns: {
          day: string
          display_name: string
          user_id: string
        }[]
      }
      copy_template: {
        Args: { p_new_id: string; p_source_id: string }
        Returns: string
      }
      delete_own_account: { Args: never; Returns: undefined }
      follow_person: { Args: { target: string }; Returns: string }
      group_invite_preview: {
        Args: { code: string }
        Returns: {
          already_member: boolean
          id: string
          name: string
          type: string
        }[]
      }
      join_group: { Args: { code: string }; Returns: string }
      leave_group: { Args: { gid: string }; Returns: undefined }
      log_activity: {
        Args: {
          p_distance_m?: number
          p_duration_minutes: number
          p_elevation_m?: number
          p_feeling?: number
          p_id: string
          p_notes?: string
          p_performed_at: string
          p_sport_id: string
        }
        Returns: string
      }
      log_training: {
        Args: {
          p_finished_at: string
          p_id: string
          p_sets: Json
          p_started_at: string
          p_template_version_id: string
          p_title: string
        }
        Returns: string
      }
      log_workout: {
        Args: {
          p_id: string
          p_performed_at: string
          p_sets: Json
          p_title: string
        }
        Returns: string
      }
      mark_chat_read: { Args: { cid: string }; Returns: undefined }
      meetup_chat: {
        Args: { max_rows?: number; mid: string }
        Returns: {
          body: string
          created_at: string
          display_name: string
          id: string
          user_id: string
        }[]
      }
      meetup_feed: {
        Args: {
          from_ts?: string
          gid?: string
          max_rows?: number
          mid?: string
          scope: string
          to_ts?: string
        }
        Returns: {
          creator_name: string
          distance_m: number
          duration_minutes: number
          elevation_m: number
          id: string
          is_joined: boolean
          is_mine: boolean
          level: string
          max_participants: number
          note: string
          pace_seconds_per_km: number
          pace_unit: string
          participant_count: number
          place: string
          series_id: string
          share_count: number
          speed_kmh: number
          sport_id: string
          sport_name: string
          starts_at: string
          template_id: string
          title: string
        }[]
      }
      meetup_participant_names: {
        Args: { mid: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      my_chats: {
        Args: { max_rows?: number }
        Returns: {
          chat_id: string
          group_id: string
          kind: string
          last_at: string
          last_body: string
          last_display_name: string
          last_user_id: string
          meetup_id: string
          other_avatar_url: string
          other_user_id: string
          request_state: string
          starts_at: string
          title: string
          unread: number
        }[]
      }
      my_communities: {
        Args: never
        Returns: {
          city: string
          description: string
          id: string
          invite_code: string
          joined_at: string
          member_count: number
          name: string
          role: string
          sport: string
          type: string
        }[]
      }
      my_follows: {
        Args: { list: string }
        Returns: {
          avatar_url: string
          display_name: string
          follows_back: boolean
          since: string
          user_id: string
        }[]
      }
      open_direct_chat: { Args: { other: string }; Returns: string }
      people_search: {
        Args: { max_rows?: number; search?: string }
        Returns: {
          avatar_url: string
          city: string
          display_name: string
          follow_status: string
          follows_me: boolean
          is_private: boolean
          sports: string[]
          user_id: string
        }[]
      }
      plan_meetup: {
        Args: {
          p_distance_m?: number
          p_duration_minutes: number
          p_elevation_m?: number
          p_id: string
          p_level?: string
          p_max_participants?: number
          p_note?: string
          p_pace_seconds_per_km?: number
          p_place?: string
          p_share_ids: string[]
          p_speed_kmh?: number
          p_sport_id: string
          p_starts_at: string
          p_template_id?: string
          p_title: string
          p_weekly: boolean
        }
        Returns: string
      }
      profile_stats: { Args: { target: string }; Returns: Json }
      push_forget: {
        Args: { endpoint: string; secret: string }
        Returns: undefined
      }
      push_payload: { Args: { nid: string; secret: string }; Returns: Json }
      remove_follower: { Args: { follower: string }; Returns: undefined }
      respond_chat_request: {
        Args: { accept: boolean; cid: string }
        Returns: undefined
      }
      respond_follow_request: {
        Args: { accept: boolean; follower: string }
        Returns: undefined
      }
      save_push_subscription: {
        Args: { auth: string; endpoint: string; p256dh: string }
        Returns: undefined
      }
      save_template: {
        Args: {
          p_exercises: Json
          p_name: string
          p_note: string
          p_template_id: string
          p_version_id: string
          p_visibility: string
        }
        Returns: string
      }
      unblock_person: { Args: { target: string }; Returns: undefined }
      unfollow_person: { Args: { target: string }; Returns: undefined }
      unread_chat_count: { Args: never; Returns: number }
      update_activity: {
        Args: {
          p_distance_m?: number
          p_duration_minutes: number
          p_elevation_m?: number
          p_feeling?: number
          p_id: string
          p_notes?: string
          p_performed_at: string
          p_sport_id: string
        }
        Returns: string
      }
      update_meetup: {
        Args: {
          p_distance_m?: number
          p_duration_minutes: number
          p_elevation_m?: number
          p_id: string
          p_level?: string
          p_max_participants?: number
          p_note?: string
          p_pace_seconds_per_km?: number
          p_place?: string
          p_scope: string
          p_speed_kmh?: number
          p_sport_id: string
          p_starts_at: string
          p_template_id?: string
          p_title: string
        }
        Returns: string
      }
      update_workout: {
        Args: { p_id: string; p_sets: Json; p_title: string }
        Returns: string
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

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
          created_at: string
          created_by: string | null
          description: string | null
          hidden: boolean
          id: string
          invite_code: string
          location: string | null
          name: string
          sport: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hidden?: boolean
          id?: string
          invite_code?: string
          location?: string | null
          name: string
          sport?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hidden?: boolean
          id?: string
          invite_code?: string
          location?: string | null
          name?: string
          sport?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
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
          finished_at: string | null
          id: string
          notes: string | null
          performed_at: string
          started_at: string | null
          template_version_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          started_at?: string | null
          template_version_id?: string | null
          title?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          started_at?: string | null
          template_version_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
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
          description: string
          id: string
          is_member: boolean
          member_count: number
          name: string
        }[]
      }
      community_link_preview: {
        Args: { code: string }
        Returns: {
          description: string
          id: string
          is_member: boolean
          location: string
          member_count: number
          name: string
          sport: string
          type: string
        }[]
      }
      community_search: {
        Args: { max_rows?: number; search?: string }
        Returns: {
          description: string
          id: string
          is_member: boolean
          location: string
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
      delete_own_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      my_communities: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          id: string
          invite_code: string
          joined_at: string
          location: string
          member_count: number
          name: string
          role: string
          sport: string
          type: string
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

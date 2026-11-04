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
        Relationships: []
      }
      chat_game_rounds: {
        Row: {
          created_at: string
          game_type: string
          id: string
          match_id: string
          prompt_key: string
          updated_at: string
          user_a_choice: string | null
          user_b_choice: string | null
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          match_id: string
          prompt_key: string
          updated_at?: string
          user_a_choice?: string | null
          user_b_choice?: string | null
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          match_id?: string
          prompt_key?: string
          updated_at?: string
          user_a_choice?: string | null
          user_b_choice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_game_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          details: string
          id: string
          starts_at: string
          title: string
          town: string
          venue_name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          details?: string
          id?: string
          starts_at: string
          title: string
          town: string
          venue_name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          details?: string
          id?: string
          starts_at?: string
          title?: string
          town?: string
          venue_name?: string
        }
        Relationships: []
      }
      date_plan_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: number
          match_id: string
          payload: Json
          version: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          match_id: string
          payload: Json
          version: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          match_id?: string
          payload?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "date_plan_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "date_plans"
            referencedColumns: ["match_id"]
          },
        ]
      }
      date_plans: {
        Row: {
          activity: string
          confirmed_a: boolean
          confirmed_b: boolean
          created_at: string
          match_id: string
          note: string
          proposed_by: string
          scheduled_at: string | null
          town: string
          updated_at: string
          updated_by: string | null
          venue_name: string
          version: number
        }
        Insert: {
          activity: string
          confirmed_a?: boolean
          confirmed_b?: boolean
          created_at?: string
          match_id: string
          note?: string
          proposed_by: string
          scheduled_at?: string | null
          town: string
          updated_at?: string
          updated_by?: string | null
          venue_name?: string
          version?: number
        }
        Update: {
          activity?: string
          confirmed_a?: boolean
          confirmed_b?: boolean
          created_at?: string
          match_id?: string
          note?: string
          proposed_by?: string
          scheduled_at?: string | null
          town?: string
          updated_at?: string
          updated_by?: string | null
          venue_name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "date_plans_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          actor_id: string
          created_at: string
          liked: boolean
          target_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          liked: boolean
          target_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          liked?: boolean
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_actor_profile_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_target_profile_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_poll_votes: {
        Row: {
          choice: string
          created_at: string
          poll_id: string
          town: string
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          poll_id: string
          town?: string
          user_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          poll_id?: string
          town?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_profile_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_profile_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          kind: string
          read_at: string | null
          target_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          read_at?: string | null
          target_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          read_at?: string | null
          target_url?: string
          user_id?: string
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          liked: boolean
          post_id: string
          saved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          liked?: boolean
          post_id: string
          saved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          liked?: boolean
          post_id?: string
          saved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          accepted_match_id: string | null
          body: string
          created_at: string
          id: string
          post_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_match_id?: string | null
          body: string
          created_at?: string
          id?: string
          post_id: string
          sender_id: string
          sender_name: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          accepted_match_id?: string | null
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_accepted_match_id_fkey"
            columns: ["accepted_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          town: string
        }
        Insert: {
          author_id: string
          author_name: string
          body: string
          created_at?: string
          id?: string
          town: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          town?: string
        }
        Relationships: []
      }
      profile_game_cards: {
        Row: {
          elevator_audio_path: string | null
          elevator_prompt: string
          elevator_script: string
          this_or_that_answers: Json
          two_truths_lie_index: number
          two_truths_statements: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          elevator_audio_path?: string | null
          elevator_prompt?: string
          elevator_script?: string
          this_or_that_answers?: Json
          two_truths_lie_index?: number
          two_truths_statements?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          elevator_audio_path?: string | null
          elevator_prompt?: string
          elevator_script?: string
          this_or_that_answers?: Json
          two_truths_lie_index?: number
          two_truths_statements?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          age: number
          bio: string
          created_at: string
          display_name: string
          id: string
          intent: string
          match_values: string
          photo_paths: string[]
          pref_max_age: number | null
          pref_min_age: number | null
          pref_town: string | null
          seeking: string
          tags: string[]
          town: string
          updated_at: string
          voice_intro_path: string | null
        }
        Insert: {
          active?: boolean
          age: number
          bio?: string
          created_at?: string
          display_name: string
          id: string
          intent?: string
          match_values?: string
          photo_paths?: string[]
          pref_max_age?: number | null
          pref_min_age?: number | null
          pref_town?: string | null
          seeking?: string
          tags?: string[]
          town: string
          updated_at?: string
          voice_intro_path?: string | null
        }
        Update: {
          active?: boolean
          age?: number
          bio?: string
          created_at?: string
          display_name?: string
          id?: string
          intent?: string
          match_values?: string
          photo_paths?: string[]
          pref_max_age?: number | null
          pref_min_age?: number | null
          pref_town?: string | null
          seeking?: string
          tags?: string[]
          town?: string
          updated_at?: string
          voice_intro_path?: string | null
        }
        Relationships: []
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
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      random_friday_queue: {
        Row: {
          joined_at: string
          last_heartbeat_at: string
          mode: string
          status: string
          streak_count: number
          town: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_heartbeat_at?: string
          mode?: string
          status?: string
          streak_count?: number
          town?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_heartbeat_at?: string
          mode?: string
          status?: string
          streak_count?: number
          town?: string
          user_id?: string
        }
        Relationships: []
      }
      random_friday_sessions: {
        Row: {
          base_seconds: number
          bonus_seconds: number
          chemistry_unlocked: boolean
          created_at: string
          expires_at: string
          icebreaker_prompt: string
          id: string
          matched_at: string | null
          mode: string
          town: string
          user_a: string
          user_a_decision: string
          user_a_message: string | null
          user_b: string
          user_b_decision: string
          user_b_message: string | null
        }
        Insert: {
          base_seconds?: number
          bonus_seconds?: number
          chemistry_unlocked?: boolean
          created_at?: string
          expires_at?: string
          icebreaker_prompt?: string
          id?: string
          matched_at?: string | null
          mode?: string
          town?: string
          user_a: string
          user_a_decision?: string
          user_a_message?: string | null
          user_b: string
          user_b_decision?: string
          user_b_message?: string | null
        }
        Update: {
          base_seconds?: number
          bonus_seconds?: number
          chemistry_unlocked?: boolean
          created_at?: string
          expires_at?: string
          icebreaker_prompt?: string
          id?: string
          matched_at?: string | null
          mode?: string
          town?: string
          user_a?: string
          user_a_decision?: string
          user_a_message?: string | null
          user_b?: string
          user_b_decision?: string
          user_b_message?: string | null
        }
        Relationships: []
      }
      report_reviews: {
        Row: {
          moderator_note: string
          report_id: string
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          moderator_note?: string
          report_id: string
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          moderator_note?: string
          report_id?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reviews_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          created_at: string
          details: string
          id: string
          post_id: string | null
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string
          id?: string
          post_id?: string | null
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string
          id?: string
          post_id?: string | null
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      selfie_verifications: {
        Row: {
          image_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          image_path: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          image_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_post_reply: { Args: { _reply_id: string }; Returns: string }
      can_chat: { Args: { _match_id: string; _user: string }; Returns: boolean }
      get_chat_overview: {
        Args: never
        Returns: {
          last_message_body: string
          last_message_created_at: string
          last_message_id: string
          last_message_sender_id: string
          match_created_at: string
          match_id: string
          partner_age: number
          partner_bio: string
          partner_id: string
          partner_intent: string
          partner_name: string
          partner_photo_paths: string[]
          partner_seeking: string
          partner_tags: string[]
          partner_town: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      post_author: { Args: { _post: string }; Returns: string }
      review_report: {
        Args: { _moderator_note?: string; _report_id: string; _status: string }
        Returns: undefined
      }
      save_this_or_that_answer: {
        Args: { _choice: string; _question_id: string }
        Returns: undefined
      }
      update_date_plan: {
        Args: {
          p_activity: string
          p_confirmed_a: boolean
          p_confirmed_b: boolean
          p_expected_version: number
          p_match_id: string
          p_note: string
          p_scheduled_at: string
          p_town: string
          p_venue_name: string
        }
        Returns: {
          activity: string
          confirmed_a: boolean
          confirmed_b: boolean
          created_at: string
          match_id: string
          note: string
          proposed_by: string
          scheduled_at: string | null
          town: string
          updated_at: string
          updated_by: string | null
          venue_name: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "date_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

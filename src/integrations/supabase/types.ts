export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          actor_id: string;
          created_at: string;
          liked: boolean;
          target_id: string;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          liked: boolean;
          target_id: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          liked?: boolean;
          target_id?: string;
        };
        Relationships: [];
      };
      community_events: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string;
          details: string;
          id: string;
          starts_at: string;
          title: string;
          town: string;
          venue_name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by: string;
          details?: string;
          id?: string;
          starts_at: string;
          title: string;
          town: string;
          venue_name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string;
          details?: string;
          id?: string;
          starts_at?: string;
          title?: string;
          town?: string;
          venue_name?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: { created_at: string; event_id: string; user_id: string };
        Insert: { created_at?: string; event_id: string; user_id: string };
        Update: { created_at?: string; event_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "community_events";
            referencedColumns: ["id"];
          },
        ];
      };
      date_plans: {
        Row: {
          activity: string;
          confirmed_a: boolean;
          confirmed_b: boolean;
          created_at: string;
          match_id: string;
          note: string;
          proposed_by: string;
          scheduled_at: string | null;
          town: string;
          updated_at: string;
          venue_name: string;
          version: number;
          updated_by: string | null;
        };
        Insert: {
          activity: string;
          confirmed_a?: boolean;
          confirmed_b?: boolean;
          created_at?: string;
          match_id: string;
          note?: string;
          proposed_by: string;
          scheduled_at?: string | null;
          town: string;
          updated_at?: string;
          venue_name?: string;
          version?: number;
          updated_by?: string | null;
        };
        Update: {
          activity?: string;
          confirmed_a?: boolean;
          confirmed_b?: boolean;
          created_at?: string;
          match_id?: string;
          note?: string;
          proposed_by?: string;
          scheduled_at?: string | null;
          town?: string;
          updated_at?: string;
          venue_name?: string;
          version?: number;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "date_plans_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      date_plan_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: "created" | "updated";
          id: number;
          match_id: string;
          payload: Json;
          version: number;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: "created" | "updated";
          id?: number;
          match_id: string;
          payload: Json;
          version: number;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: "created" | "updated";
          id?: number;
          match_id?: string;
          payload?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "date_plan_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "date_plans";
            referencedColumns: ["match_id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          id: string;
          user_a: string;
          user_b: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_a: string;
          user_b: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          match_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          match_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      post_replies: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          accepted_match_id: string | null;
          body: string;
          created_at: string;
          id: string;
          post_id: string;
          sender_id: string;
          sender_name: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          accepted_match_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          post_id: string;
          sender_id: string;
          sender_name: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          accepted_match_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          sender_id?: string;
          sender_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_replies_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_replies_accepted_match_id_fkey";
            columns: ["accepted_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          town: string;
        };
        Insert: {
          author_id: string;
          author_name: string;
          body: string;
          created_at?: string;
          id?: string;
          town: string;
        };
        Update: {
          author_id?: string;
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          town?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          active: boolean;
          age: number;
          bio: string;
          created_at: string;
          display_name: string;
          id: string;
          intent: string;
          pref_max_age: number | null;
          pref_min_age: number | null;
          pref_town: string | null;
          photo_paths: string[];
          seeking: string;
          tags: string[];
          town: string;
          updated_at: string;
          voice_intro_path: string | null;
        };
        Insert: {
          active?: boolean;
          age: number;
          bio?: string;
          created_at?: string;
          display_name: string;
          id: string;
          intent?: string;
          pref_max_age?: number | null;
          pref_min_age?: number | null;
          pref_town?: string | null;
          photo_paths?: string[];
          seeking?: string;
          tags?: string[];
          town: string;
          updated_at?: string;
          voice_intro_path?: string | null;
        };
        Update: {
          active?: boolean;
          age?: number;
          bio?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          intent?: string;
          pref_max_age?: number | null;
          pref_min_age?: number | null;
          pref_town?: string | null;
          photo_paths?: string[];
          seeking?: string;
          tags?: string[];
          town?: string;
          updated_at?: string;
          voice_intro_path?: string | null;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          category: string;
          created_at: string;
          details: string;
          id: string;
          post_id: string | null;
          reported_id: string;
          reporter_id: string;
          status: "open" | "reviewed" | "actioned" | "dismissed";
        };
        Insert: {
          category: string;
          created_at?: string;
          details?: string;
          id?: string;
          post_id?: string | null;
          reported_id: string;
          reporter_id: string;
          status?: "open" | "reviewed" | "actioned" | "dismissed";
        };
        Update: {
          category?: string;
          created_at?: string;
          details?: string;
          id?: string;
          post_id?: string | null;
          reported_id?: string;
          reporter_id?: string;
          status?: "open" | "reviewed" | "actioned" | "dismissed";
        };
        Relationships: [];
      };
      report_reviews: {
        Row: {
          moderator_note: string;
          report_id: string;
          reviewed_at: string;
          reviewed_by: string;
        };
        Insert: {
          moderator_note?: string;
          report_id: string;
          reviewed_at?: string;
          reviewed_by: string;
        };
        Update: {
          moderator_note?: string;
          report_id?: string;
          reviewed_at?: string;
          reviewed_by?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_post_reply: { Args: { _reply_id: string }; Returns: string };
      review_report: {
        Args: { _moderator_note?: string; _report_id: string; _status: string };
        Returns: undefined;
      };
      update_date_plan: {
        Args: {
          p_activity: string;
          p_confirmed_a: boolean;
          p_confirmed_b: boolean;
          p_expected_version: number;
          p_match_id: string;
          p_note: string;
          p_scheduled_at: string | null;
          p_town: string;
          p_venue_name: string;
        };
        Returns: Database["public"]["Tables"]["date_plans"]["Row"];
      };
      can_chat: { Args: { _match_id: string; _user: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean };
      post_author: { Args: { _post: string }; Returns: string };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;

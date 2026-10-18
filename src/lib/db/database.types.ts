// Generated from the live Supabase project (NFL WR Project) on 2026-10-17.
// Regenerate with: supabase gen types typescript --project-id <ref> > src/lib/db/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      model_results: {
        Row: {
          feature_columns: Json | null;
          hyperparameters: Json | null;
          id: number;
          mae: number | null;
          model_file_path: string | null;
          model_type: string | null;
          model_version: string;
          rmse: number | null;
          target_column: string | null;
          test_season_end: number | null;
          test_season_start: number | null;
          top_15_accuracy: number | null;
          train_season_end: number | null;
          train_season_start: number | null;
          trained_at: string | null;
        };
        Insert: {
          feature_columns?: Json | null;
          hyperparameters?: Json | null;
          id?: number;
          mae?: number | null;
          model_file_path?: string | null;
          model_type?: string | null;
          model_version: string;
          rmse?: number | null;
          target_column?: string | null;
          test_season_end?: number | null;
          test_season_start?: number | null;
          top_15_accuracy?: number | null;
          train_season_end?: number | null;
          train_season_start?: number | null;
          trained_at?: string | null;
        };
        Update: {
          feature_columns?: Json | null;
          hyperparameters?: Json | null;
          id?: number;
          mae?: number | null;
          model_file_path?: string | null;
          model_type?: string | null;
          model_version?: string;
          rmse?: number | null;
          target_column?: string | null;
          test_season_end?: number | null;
          test_season_start?: number | null;
          top_15_accuracy?: number | null;
          train_season_end?: number | null;
          train_season_start?: number | null;
          trained_at?: string | null;
        };
        Relationships: [];
      };
      players: {
        Row: {
          created_at: string | null;
          player_display_name: string;
          player_id: string;
          position: string | null;
        };
        Insert: {
          created_at?: string | null;
          player_display_name: string;
          player_id: string;
          position?: string | null;
        };
        Update: {
          created_at?: string | null;
          player_display_name?: string;
          player_id?: string;
          position?: string | null;
        };
        Relationships: [];
      };
      predictions: {
        Row: {
          based_on_weeks: Json | null;
          created_at: string | null;
          id: number;
          model_result_id: number | null;
          player_id: string;
          predicted_score: number | null;
          season: number;
          week: number;
        };
        Insert: {
          based_on_weeks?: Json | null;
          created_at?: string | null;
          id?: number;
          model_result_id?: number | null;
          player_id: string;
          predicted_score?: number | null;
          season: number;
          week: number;
        };
        Update: {
          based_on_weeks?: Json | null;
          created_at?: string | null;
          id?: number;
          model_result_id?: number | null;
          player_id?: string;
          predicted_score?: number | null;
          season?: number;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "predictions_model_result_id_fkey";
            columns: ["model_result_id"];
            isOneToOne: false;
            referencedRelation: "model_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["player_id"];
          },
        ];
      };
      season_rankings: {
        Row: {
          created_at: string | null;
          id: number;
          player_display_name: string;
          player_id: string;
          receiving_tds: number | null;
          receiving_yards: number | null;
          receptions: number | null;
          season: number;
          total_score: number | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          player_display_name: string;
          player_id: string;
          receiving_tds?: number | null;
          receiving_yards?: number | null;
          receptions?: number | null;
          season: number;
          total_score?: number | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          player_display_name?: string;
          player_id?: string;
          receiving_tds?: number | null;
          receiving_yards?: number | null;
          receptions?: number | null;
          season?: number;
          total_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "season_rankings_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["player_id"];
          },
        ];
      };
      weekly_rankings: {
        Row: {
          created_at: string | null;
          id: number;
          player_display_name: string | null;
          player_id: string;
          rank: number | null;
          score_breakdown: Json | null;
          season: number;
          total_score: number | null;
          week: number;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          player_display_name?: string | null;
          player_id: string;
          rank?: number | null;
          score_breakdown?: Json | null;
          season: number;
          total_score?: number | null;
          week: number;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          player_display_name?: string | null;
          player_id?: string;
          rank?: number | null;
          score_breakdown?: Json | null;
          season?: number;
          total_score?: number | null;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_rankings_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["player_id"];
          },
        ];
      };
      weekly_wr_stats: {
        Row: {
          created_at: string | null;
          id: number;
          player_id: string;
          receiving_air_yards: number | null;
          receiving_drop: number | null;
          receiving_first_downs: number | null;
          receiving_fumbles_lost: number | null;
          receiving_tds: number | null;
          receiving_yards: number | null;
          receiving_yards_after_catch: number | null;
          receptions: number | null;
          season: number;
          target_share: number | null;
          targets: number | null;
          team: string | null;
          week: number;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          player_id: string;
          receiving_air_yards?: number | null;
          receiving_drop?: number | null;
          receiving_first_downs?: number | null;
          receiving_fumbles_lost?: number | null;
          receiving_tds?: number | null;
          receiving_yards?: number | null;
          receiving_yards_after_catch?: number | null;
          receptions?: number | null;
          season: number;
          target_share?: number | null;
          targets?: number | null;
          team?: string | null;
          week: number;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          player_id?: string;
          receiving_air_yards?: number | null;
          receiving_drop?: number | null;
          receiving_first_downs?: number | null;
          receiving_fumbles_lost?: number | null;
          receiving_tds?: number | null;
          receiving_yards?: number | null;
          receiving_yards_after_catch?: number | null;
          receptions?: number | null;
          season?: number;
          target_share?: number | null;
          targets?: number | null;
          team?: string | null;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_wr_stats_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["player_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
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
    Enums: {},
  },
} as const;

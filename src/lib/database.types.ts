export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      competitors: {
        Row: {
          id: string;
          name: string;
          website: string;
          description: string;
          priority: string;
          schedule_frequency: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          website?: string;
          description?: string;
          priority?: string;
          schedule_frequency?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          website?: string;
          description?: string;
          priority?: string;
          schedule_frequency?: string;
          user_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          competitor_id: string;
          name: string;
          type: string;
          config: Json;
          enabled: boolean;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          competitor_id: string;
          name: string;
          type: string;
          config?: Json;
          enabled?: boolean;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          competitor_id?: string;
          name?: string;
          type?: string;
          config?: Json;
          enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "sources_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
        ];
      };
      runs: {
        Row: {
          id: string;
          competitor_id: string;
          type: string;
          status: string;
          findings_count: number;
          sources_used: number;
          started_at: string;
          completed_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          competitor_id: string;
          type: string;
          status?: string;
          findings_count?: number;
          sources_used?: number;
          started_at?: string;
          completed_at?: string | null;
          user_id: string;
        };
        Update: {
          status?: string;
          findings_count?: number;
          sources_used?: number;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "runs_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
        ];
      };
      findings: {
        Row: {
          id: string;
          run_id: string;
          competitor_id: string;
          claim: string;
          reality: string;
          confidence: string;
          threat_level: string;
          sources: string[];
          why_it_matters: string;
          user_segment_overlap: string;
          compensating_advantages: string;
          recommended_action: string;
          testing_criteria: Json | null;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          competitor_id: string;
          claim: string;
          reality: string;
          confidence: string;
          threat_level: string;
          sources: string[];
          why_it_matters?: string;
          user_segment_overlap?: string;
          compensating_advantages?: string;
          recommended_action?: string;
          testing_criteria?: Json | null;
          user_id: string;
          created_at?: string;
        };
        Update: {
          claim?: string;
          reality?: string;
          confidence?: string;
          threat_level?: string;
          sources?: string[];
          why_it_matters?: string;
          user_segment_overlap?: string;
          compensating_advantages?: string;
          recommended_action?: string;
          testing_criteria?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "findings_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "findings_competitor_id_fkey";
            columns: ["competitor_id"];
            isOneToOne: false;
            referencedRelation: "competitors";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          product_name: string;
          product_context: string;
          gemini_api_key: string;
          email: string;
          enabled_sources: string[];
          schedule_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_name?: string;
          product_context?: string;
          gemini_api_key?: string;
          email?: string;
          enabled_sources?: string[];
          schedule_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_name?: string;
          product_context?: string;
          gemini_api_key?: string;
          email?: string;
          enabled_sources?: string[];
          schedule_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

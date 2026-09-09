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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      academic_calendar_days: {
        Row: {
          academic_year: string
          calendar_date: string
          created_at: string
          is_holiday: boolean
          notes: string | null
          occasion_name: string
          reduces_working_days: boolean
          semester: string
          source_document_id: string | null
        }
        Insert: {
          academic_year: string
          calendar_date: string
          created_at?: string
          is_holiday?: boolean
          notes?: string | null
          occasion_name: string
          reduces_working_days?: boolean
          semester: string
          source_document_id?: string | null
        }
        Update: {
          academic_year?: string
          calendar_date?: string
          created_at?: string
          is_holiday?: boolean
          notes?: string | null
          occasion_name?: string
          reduces_working_days?: boolean
          semester?: string
          source_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_days_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "campus_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          is_recurring: boolean
          name: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          is_recurring?: boolean
          name: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          is_recurring?: boolean
          name?: string
        }
        Relationships: []
      }
      academic_imports: {
        Row: {
          attempt_count: number
          cgpa: number | null
          created_at: string
          current_semester: number | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_synced_at: string | null
          mobile_number: string | null
          program: string | null
          register_number: string
          subjects: Json
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          cgpa?: number | null
          created_at?: string
          current_semester?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          mobile_number?: string | null
          program?: string | null
          register_number: string
          subjects?: Json
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          cgpa?: number | null
          created_at?: string
          current_semester?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_synced_at?: string | null
          mobile_number?: string | null
          program?: string | null
          register_number?: string
          subjects?: Json
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_recovery: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          recovery_code: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string
          id?: string
          recovery_code: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          recovery_code?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          message_type: string | null
          response: string
          session_id: string | null
          suggested_mentors: Json | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          message_type?: string | null
          response: string
          session_id?: string | null
          suggested_mentors?: Json | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string | null
          response?: string
          session_id?: string | null
          suggested_mentors?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_overview_feedback: {
        Row: {
          created_at: string
          id: string
          is_helpful: boolean
          query: string
          response: Json
          session_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_helpful: boolean
          query: string
          response: Json
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_helpful?: boolean
          query?: string
          response?: Json
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_downloads: {
        Row: {
          app_name: string
          created_at: string
          download_type: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          app_name?: string
          created_at?: string
          download_type: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Update: {
          app_name?: string
          created_at?: string
          download_type?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badge_types: {
        Row: {
          category: string | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content_html: string
          content_text: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string
          content_html: string
          content_text: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content_html?: string
          content_text?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      campus_documents: {
        Row: {
          academic_year: string | null
          category: string
          content: string
          created_at: string
          document_slug: string
          document_title: string
          id: string
          is_published: boolean
          page_number: number | null
          section_heading: string
          source_filename: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          category: string
          content: string
          created_at?: string
          document_slug: string
          document_title: string
          id?: string
          is_published?: boolean
          page_number?: number | null
          section_heading: string
          source_filename?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          category?: string
          content?: string
          created_at?: string
          document_slug?: string
          document_title?: string
          id?: string
          is_published?: boolean
          page_number?: number | null
          section_heading?: string
          source_filename?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campus_notices: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          is_published: boolean
          issued_date: string
          reference_no: string | null
          summary: string | null
          superseded_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          is_published?: boolean
          issued_date: string
          reference_no?: string | null
          summary?: string | null
          superseded_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          is_published?: boolean
          issued_date?: string
          reference_no?: string | null
          summary?: string | null
          superseded_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      canvas_drawings: {
        Row: {
          action_type: string
          drawing_data: Json
          id: string
          session_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          drawing_data: Json
          id?: string
          session_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          drawing_data?: Json
          id?: string
          session_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_drawings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "canvas_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_drawings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_drawings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_participants: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "canvas_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_sessions: {
        Row: {
          background_color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          mentor_id: string
          session_code: string
          title: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          mentor_id: string
          session_code: string
          title: string
        }
        Update: {
          background_color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          mentor_id?: string
          session_code?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          id: string
          issued_at: string
          revoked_at: string | null
          revoked_reason: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string
          id: string
          is_archived: boolean
          kind: string
          member_count: number
          name: string
          owner_id: string
          post_count: number
          slug: string
          updated_at: string
          visibility: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description: string
          id?: string
          is_archived?: boolean
          kind?: string
          member_count?: number
          name: string
          owner_id: string
          post_count?: number
          slug: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string
          id?: string
          is_archived?: boolean
          kind?: string
          member_count?: number
          name?: string
          owner_id?: string
          post_count?: number
          slug?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_channels: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          id: string
          slug: string
          topic: string | null
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          id?: string
          slug: string
          topic?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          slug?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_channels_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_group_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_group_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_group_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_group_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_group_messages: {
        Row: {
          channel: string
          community_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean
          reactions: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          community_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          community_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          reactions?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_group_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invites: {
        Row: {
          community_id: string
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          comments_count: number
          community_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          mentor_id: string | null
          post_type: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          community_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          mentor_id?: string | null
          post_type?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          community_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          mentor_id?: string | null
          post_type?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          subject: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      contact_responses: {
        Row: {
          admin_id: string
          contact_message_id: string
          created_at: string
          id: string
          message: string
          recipient_email: string
          recipient_name: string
          sent_at: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          contact_message_id: string
          created_at?: string
          id?: string
          message: string
          recipient_email: string
          recipient_name: string
          sent_at?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          contact_message_id?: string
          created_at?: string
          id?: string
          message?: string
          recipient_email?: string
          recipient_name?: string
          sent_at?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_responses_contact_message_id_fkey"
            columns: ["contact_message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          last_message_id: string | null
          last_updated: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          id?: string
          last_message_id?: string | null
          last_updated?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          id?: string
          last_message_id?: string | null
          last_updated?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_last_message_id_fkey"
            columns: ["last_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          conversation_id: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          message_id: string | null
          recipient_id: string
          sent_at: string | null
        }
        Insert: {
          attempts?: number
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          message_id?: string | null
          recipient_id: string
          sent_at?: string | null
        }
        Update: {
          attempts?: number
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          message_id?: string | null
          recipient_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          route: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          route?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: number
          note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: number
          note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: number
          note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "srmap_events_cache"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          avg_grading: number
          avg_helpfulness: number
          avg_overall: number
          avg_rating: number
          avg_teaching: number
          created_at: string
          department: string
          designation: string | null
          email: string | null
          has_image: boolean | null
          id: string
          image_url: string | null
          interests: string[]
          interests_text: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          office_location: string | null
          profile_image: string | null
          profile_url: string | null
          rating_count: number
          research_areas: string[]
          research_details: string[] | null
          school: string | null
          slug: string
          source: string
          updated_at: string
        }
        Insert: {
          avg_grading?: number
          avg_helpfulness?: number
          avg_overall?: number
          avg_rating?: number
          avg_teaching?: number
          created_at?: string
          department: string
          designation?: string | null
          email?: string | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          interests?: string[]
          interests_text?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          office_location?: string | null
          profile_image?: string | null
          profile_url?: string | null
          rating_count?: number
          research_areas?: string[]
          research_details?: string[] | null
          school?: string | null
          slug: string
          source?: string
          updated_at?: string
        }
        Update: {
          avg_grading?: number
          avg_helpfulness?: number
          avg_overall?: number
          avg_rating?: number
          avg_teaching?: number
          created_at?: string
          department?: string
          designation?: string | null
          email?: string | null
          has_image?: boolean | null
          id?: string
          image_url?: string | null
          interests?: string[]
          interests_text?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          office_location?: string | null
          profile_image?: string | null
          profile_url?: string | null
          rating_count?: number
          research_areas?: string[]
          research_details?: string[] | null
          school?: string | null
          slug?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      faculty_ratings: {
        Row: {
          comment: string | null
          course_code: string | null
          created_at: string
          faculty_id: string
          grading: number
          helpful_count: number
          helpfulness: number
          id: string
          overall: number | null
          reviewer_id: string
          tags: string[]
          teaching: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          course_code?: string | null
          created_at?: string
          faculty_id: string
          grading: number
          helpful_count?: number
          helpfulness: number
          id?: string
          overall?: number | null
          reviewer_id: string
          tags?: string[]
          teaching: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          course_code?: string | null
          created_at?: string
          faculty_id?: string
          grading?: number
          helpful_count?: number
          helpfulness?: number
          id?: string
          overall?: number | null
          reviewer_id?: string
          tags?: string[]
          teaching?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_ratings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_ratings_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_review_votes: {
        Row: {
          created_at: string
          rating_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          rating_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          rating_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_review_votes_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "faculty_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_review_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_review_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category: string
          content_html: string
          content_text: string
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_html: string
          content_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_html?: string
          content_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          body: string
          content_hash: string
          created_at: string
          embedded_at: string | null
          embedding: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          search_vector: unknown
          source_path: string | null
          subtitle: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body: string
          content_hash: string
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          search_vector?: unknown
          source_path?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          content_hash?: string
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          search_vector?: unknown
          source_path?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      marketplace_posts: {
        Row: {
          author: string
          category: string
          contact_info: string | null
          created_at: string
          date: string
          description: string
          external_link: string | null
          id: string
          image_url: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author: string
          category: string
          contact_info?: string | null
          created_at?: string
          date?: string
          description: string
          external_link?: string | null
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author?: string
          category?: string
          contact_info?: string | null
          created_at?: string
          date?: string
          description?: string
          external_link?: string | null
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mentor_profile_views: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          viewed_on: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          viewed_on?: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          viewed_on?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profile_views_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_reviews: {
        Row: {
          created_at: string
          id: string
          mentor_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentor_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentor_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_reviews_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_verifications: {
        Row: {
          application_data: Json | null
          cgpa: number | null
          college_id: string | null
          flags: string[]
          graduation_year: number | null
          hobbies: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          university: string | null
          user_id: string | null
          year_of_studies: string | null
        }
        Insert: {
          application_data?: Json | null
          cgpa?: number | null
          college_id?: string | null
          flags?: string[]
          graduation_year?: number | null
          hobbies?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          university?: string | null
          user_id?: string | null
          year_of_studies?: string | null
        }
        Update: {
          application_data?: Json | null
          cgpa?: number | null
          college_id?: string | null
          flags?: string[]
          graduation_year?: number | null
          hobbies?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          university?: string | null
          user_id?: string | null
          year_of_studies?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          ask_me_anything: Json
          availability_note: string | null
          available_from: string | null
          bio: string | null
          cgpa: number | null
          company: string | null
          courses: Json
          created_at: string | null
          department: string
          experiences: Json
          graduation_year: number | null
          hobbies: string | null
          id: string
          ideal_mentees: Json
          is_alumni: boolean
          is_available: boolean
          job_title: string | null
          linkedin_url: string | null
          mobile: string | null
          name: string
          outcomes: Json
          profile_image: string | null
          profile_summary_edited_at: string | null
          profile_summary_generated_at: string | null
          profile_summary_source_hash: string | null
          projects: Json
          rating: number
          review_count: number
          skills: string[]
          slug: string | null
          tagline: string | null
          university: string | null
          year_of_studies: string | null
        }
        Insert: {
          ask_me_anything?: Json
          availability_note?: string | null
          available_from?: string | null
          bio?: string | null
          cgpa?: number | null
          company?: string | null
          courses?: Json
          created_at?: string | null
          department: string
          experiences?: Json
          graduation_year?: number | null
          hobbies?: string | null
          id?: string
          ideal_mentees?: Json
          is_alumni?: boolean
          is_available?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name: string
          outcomes?: Json
          profile_image?: string | null
          profile_summary_edited_at?: string | null
          profile_summary_generated_at?: string | null
          profile_summary_source_hash?: string | null
          projects?: Json
          rating?: number
          review_count?: number
          skills: string[]
          slug?: string | null
          tagline?: string | null
          university?: string | null
          year_of_studies?: string | null
        }
        Update: {
          ask_me_anything?: Json
          availability_note?: string | null
          available_from?: string | null
          bio?: string | null
          cgpa?: number | null
          company?: string | null
          courses?: Json
          created_at?: string | null
          department?: string
          experiences?: Json
          graduation_year?: number | null
          hobbies?: string | null
          id?: string
          ideal_mentees?: Json
          is_alumni?: boolean
          is_available?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name?: string
          outcomes?: Json
          profile_image?: string | null
          profile_summary_edited_at?: string | null
          profile_summary_generated_at?: string | null
          profile_summary_source_hash?: string | null
          projects?: Json
          rating?: number
          review_count?: number
          skills?: string[]
          slug?: string | null
          tagline?: string | null
          university?: string | null
          year_of_studies?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          delivery_status: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_edited: boolean
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          delivery_status?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_edited?: boolean
          is_read?: boolean | null
          message_type?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          delivery_status?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_edited?: boolean
          is_read?: boolean | null
          message_type?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          external_url: string | null
          id: string
          interest_count: number
          is_online: boolean
          is_published: boolean
          kind: string
          location: string | null
          organiser: string | null
          posted_by: string | null
          register_by: string | null
          slug: string
          starts_at: string | null
          tags: string[]
          team_count: number
          team_max: number | null
          team_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
          interest_count?: number
          is_online?: boolean
          is_published?: boolean
          kind?: string
          location?: string | null
          organiser?: string | null
          posted_by?: string | null
          register_by?: string | null
          slug: string
          starts_at?: string | null
          tags?: string[]
          team_count?: number
          team_max?: number | null
          team_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_url?: string | null
          id?: string
          interest_count?: number
          is_online?: boolean
          is_published?: boolean
          kind?: string
          location?: string | null
          organiser?: string | null
          posted_by?: string | null
          register_by?: string | null
          slug?: string
          starts_at?: string | null
          tags?: string[]
          team_count?: number
          team_max?: number | null
          team_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_interest: {
        Row: {
          created_at: string
          note: string | null
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_interest_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_interest_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_interest_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_teams: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          id: string
          is_open: boolean
          looking_for: string[]
          opportunity_id: string
          pitch: string | null
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_open?: boolean
          looking_for?: string[]
          opportunity_id: string
          pitch?: string | null
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_open?: boolean
          looking_for?: string[]
          opportunity_id?: string
          pitch?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_teams_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_teams_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
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
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_installs: {
        Row: {
          device_id: string
          id: string
          installed_at: string
          last_seen_at: string
          platform: string
          user_id: string | null
        }
        Insert: {
          device_id: string
          id?: string
          installed_at?: string
          last_seen_at?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          device_id?: string
          id?: string
          installed_at?: string
          last_seen_at?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      search_analytics: {
        Row: {
          click_count: number
          first_searched_at: string
          last_searched_at: string
          query_hash: string
          query_text: string
          search_count: number
          zero_result_count: number
        }
        Insert: {
          click_count?: number
          first_searched_at?: string
          last_searched_at?: string
          query_hash: string
          query_text: string
          search_count?: number
          zero_result_count?: number
        }
        Update: {
          click_count?: number
          first_searched_at?: string
          last_searched_at?: string
          query_hash?: string
          query_text?: string
          search_count?: number
          zero_result_count?: number
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      search_interactions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          query_hash: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          query_hash: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          query_hash?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          query_hash: string | null
          query_text: string
          result_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query_hash?: string | null
          query_text: string
          result_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query_hash?: string | null
          query_text?: string
          result_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      search_query_cache: {
        Row: {
          created_at: string
          embedding: string
          hit_count: number
          last_used_at: string
          query_hash: string
          query_text: string
        }
        Insert: {
          created_at?: string
          embedding: string
          hit_count?: number
          last_used_at?: string
          query_hash: string
          query_text: string
        }
        Update: {
          created_at?: string
          embedding?: string
          hit_count?: number
          last_used_at?: string
          query_hash?: string
          query_text?: string
        }
        Relationships: []
      }
      search_result_quality: {
        Row: {
          click_count_30d: number
          entity_id: string
          entity_type: string
          last_clicked_at: string
        }
        Insert: {
          click_count_30d?: number
          entity_id: string
          entity_type: string
          last_clicked_at?: string
        }
        Update: {
          click_count_30d?: number
          entity_id?: string
          entity_type?: string
          last_clicked_at?: string
        }
        Relationships: []
      }
      srm_portal_credentials: {
        Row: {
          consecutive_failures: number
          created_at: string
          dob_ciphertext: string
          dob_iv: string
          encryption_version: number
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          register_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          dob_ciphertext: string
          dob_iv: string
          encryption_version?: number
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          register_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          dob_ciphertext?: string
          dob_iv?: string
          encryption_version?: number
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          register_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "srm_portal_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "srm_portal_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      srmap_events_cache: {
        Row: {
          content: string
          department: string
          end_date: string
          event_type: string
          excerpt: string
          id: number
          image_url: string | null
          last_synced_at: string
          link: string
          organizer: string | null
          registration_label: string | null
          registration_url: string | null
          start_date: string
          title: string
          venue: string | null
        }
        Insert: {
          content?: string
          department?: string
          end_date: string
          event_type?: string
          excerpt?: string
          id: number
          image_url?: string | null
          last_synced_at?: string
          link: string
          organizer?: string | null
          registration_label?: string | null
          registration_url?: string | null
          start_date: string
          title: string
          venue?: string | null
        }
        Update: {
          content?: string
          department?: string
          end_date?: string
          event_type?: string
          excerpt?: string
          id?: number
          image_url?: string | null
          last_synced_at?: string
          link?: string
          organizer?: string | null
          registration_label?: string | null
          registration_url?: string | null
          start_date?: string
          title?: string
          venue?: string | null
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          absent_hours: number
          attendance_percentage: number
          attended_hours: number
          classes_needed: number
          conducted_hours: number
          course_code: string
          course_name: string
          created_at: string
          faculty_name: string | null
          id: string
          last_synced_at: string
          register_number: string
          safe_bunks: number
          slot: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          absent_hours?: number
          attendance_percentage?: number
          attended_hours?: number
          classes_needed?: number
          conducted_hours?: number
          course_code: string
          course_name: string
          created_at?: string
          faculty_name?: string | null
          id?: string
          last_synced_at?: string
          register_number: string
          safe_bunks?: number
          slot?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          absent_hours?: number
          attendance_percentage?: number
          attended_hours?: number
          classes_needed?: number
          conducted_hours?: number
          course_code?: string
          course_name?: string
          created_at?: string
          faculty_name?: string | null
          id?: string
          last_synced_at?: string
          register_number?: string
          safe_bunks?: number
          slot?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_dues: {
        Row: {
          collected_amount: number
          created_at: string
          due_amount: number
          fee_category: string
          fee_head: string
          id: string
          is_fine: boolean
          last_synced_at: string
          portal_fee_due_id: string | null
          portal_fee_head_id: string | null
          register_number: string | null
          to_be_paid_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collected_amount?: number
          created_at?: string
          due_amount?: number
          fee_category: string
          fee_head: string
          id?: string
          is_fine?: boolean
          last_synced_at?: string
          portal_fee_due_id?: string | null
          portal_fee_head_id?: string | null
          register_number?: string | null
          to_be_paid_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collected_amount?: number
          created_at?: string
          due_amount?: number
          fee_category?: string
          fee_head?: string
          id?: string
          is_fine?: boolean
          last_synced_at?: string
          portal_fee_due_id?: string | null
          portal_fee_head_id?: string | null
          register_number?: string | null
          to_be_paid_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_dues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_dues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_paid_history: {
        Row: {
          amount: number
          balance_due: number
          created_at: string
          due_date: string | null
          fee_type: string
          id: string
          last_synced_at: string
          paid_amount: number
          payment_mode: string | null
          receipt_date: string | null
          receipt_number: string
          register_number: string | null
          term: string
          user_id: string
        }
        Insert: {
          amount?: number
          balance_due?: number
          created_at?: string
          due_date?: string | null
          fee_type: string
          id?: string
          last_synced_at?: string
          paid_amount?: number
          payment_mode?: string | null
          receipt_date?: string | null
          receipt_number?: string
          register_number?: string | null
          term: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_due?: number
          created_at?: string
          due_date?: string | null
          fee_type?: string
          id?: string
          last_synced_at?: string
          paid_amount?: number
          payment_mode?: string | null
          receipt_date?: string | null
          receipt_number?: string
          register_number?: string | null
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_paid_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_paid_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_timetables: {
        Row: {
          course_code: string
          course_name: string
          created_at: string
          day_name: string
          day_order: number | null
          end_time: string
          faculty_name: string | null
          hour: number
          id: string
          is_lab: boolean | null
          last_synced_at: string
          ltpc: string | null
          register_number: string | null
          room_number: string | null
          slot: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_code: string
          course_name: string
          created_at?: string
          day_name: string
          day_order?: number | null
          end_time: string
          faculty_name?: string | null
          hour: number
          id?: string
          is_lab?: boolean | null
          last_synced_at?: string
          ltpc?: string | null
          register_number?: string | null
          room_number?: string | null
          slot?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_code?: string
          course_name?: string
          created_at?: string
          day_name?: string
          day_order?: number | null
          end_time?: string
          faculty_name?: string | null
          hour?: number
          id?: string
          is_lab?: boolean | null
          last_synced_at?: string
          ltpc?: string | null
          register_number?: string | null
          room_number?: string | null
          slot?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_timetables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_timetables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          image_url: string | null
          name: string
          position: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          position: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          awarded_by: string | null
          badge_type_id: string | null
          id: string
          notes: string | null
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_type_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          awarded_by?: string | null
          badge_type_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_type_id_fkey"
            columns: ["badge_type_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          alumni_confirmed_at: string | null
          bio: string | null
          college_id: string | null
          company: string | null
          created_at: string | null
          date_of_birth_linked: boolean
          department: string | null
          email: string
          email_frequency: string | null
          email_notifications: boolean | null
          graduation_year: number | null
          has_seen_welcome_tour: boolean
          id: string
          interests: string[]
          interests_discoverable: boolean
          is_admin: boolean
          is_available: boolean | null
          job_title: string | null
          linkedin_url: string | null
          mobile: string | null
          name: string
          profile_image: string | null
          push_notifications_enabled: boolean | null
          role: string
          skills: string[] | null
          theme: string | null
          unsubscribe_token: string
          verification_status: string | null
        }
        Insert: {
          alumni_confirmed_at?: string | null
          bio?: string | null
          college_id?: string | null
          company?: string | null
          created_at?: string | null
          date_of_birth_linked?: boolean
          department?: string | null
          email: string
          email_frequency?: string | null
          email_notifications?: boolean | null
          graduation_year?: number | null
          has_seen_welcome_tour?: boolean
          id?: string
          interests?: string[]
          interests_discoverable?: boolean
          is_admin?: boolean
          is_available?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name: string
          profile_image?: string | null
          push_notifications_enabled?: boolean | null
          role: string
          skills?: string[] | null
          theme?: string | null
          unsubscribe_token?: string
          verification_status?: string | null
        }
        Update: {
          alumni_confirmed_at?: string | null
          bio?: string | null
          college_id?: string | null
          company?: string | null
          created_at?: string | null
          date_of_birth_linked?: boolean
          department?: string | null
          email?: string
          email_frequency?: string | null
          email_notifications?: boolean | null
          graduation_year?: number | null
          has_seen_welcome_tour?: boolean
          id?: string
          interests?: string[]
          interests_discoverable?: boolean
          is_admin?: boolean
          is_available?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name?: string
          profile_image?: string | null
          push_notifications_enabled?: boolean | null
          role?: string
          skills?: string[] | null
          theme?: string | null
          unsubscribe_token?: string
          verification_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      team_members_public: {
        Row: {
          created_at: string | null
          id: string | null
          image_url: string | null
          name: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_public: {
        Row: {
          bio: string | null
          created_at: string | null
          department: string | null
          id: string | null
          is_available: boolean | null
          linkedin_url: string | null
          name: string | null
          profile_image: string | null
          role: string | null
          skills: string[] | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_available?: boolean | null
          linkedin_url?: string | null
          name?: string | null
          profile_image?: string | null
          role?: string | null
          skills?: string[] | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          is_available?: boolean | null
          linkedin_url?: string | null
          name?: string | null
          profile_image?: string | null
          role?: string | null
          skills?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_health_metrics: { Args: never; Returns: Json }
      admin_kpi_metrics: { Args: never; Returns: Json }
      admin_list_mentor_welcome_status: {
        Args: never
        Returns: {
          approved_at: string
          department: string
          email: string
          name: string
          profile_image: string
          sent_at: string
          user_id: string
          welcomed: boolean
        }[]
      }
      admin_mark_mentor_welcomed: {
        Args: { p_mentor_id: string }
        Returns: string
      }
      aggregate_search_quality: { Args: never; Returns: undefined }
      auto_award_performance_badges: { Args: never; Returns: undefined }
      bytea_to_text: { Args: { data: string }; Returns: string }
      can_start_another_group: { Args: { p_user: string }; Returns: boolean }
      can_user_rate_mentor: {
        Args: { mentor_id: string; user_id: string }
        Returns: boolean
      }
      can_view_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_post: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      chat_participant_profiles: {
        Args: { p_user_ids: string[] }
        Returns: {
          id: string
          name: string
          profile_image: string
          role: string
        }[]
      }
      community_addable_users: {
        Args: { p_community_id: string; p_limit?: number; p_search?: string }
        Returns: {
          is_mentor: boolean
          name: string
          profile_image: string
          user_id: string
        }[]
      }
      community_kind_counts: {
        Args: never
        Returns: {
          group_count: number
          kind: string
        }[]
      }
      community_post_type_counts: {
        Args: never
        Returns: {
          post_count: number
          post_type: string
        }[]
      }
      confirm_alumni_status: {
        Args: {
          p_company?: string
          p_graduation_year?: number
          p_job_title?: string
        }
        Returns: undefined
      }
      create_canvas_session:
        | {
            Args: { p_mentor_id: string; p_title: string }
            Returns: {
              created_at: string
              id: string
              session_code: string
              title: string
            }[]
          }
        | {
            Args: { p_mentor_id: string; p_title: string }
            Returns: {
              background_color: string | null
              created_at: string | null
              id: string
              is_active: boolean | null
              max_participants: number | null
              mentor_id: string
              session_code: string
              title: string
            }
            SetofOptions: {
              from: "*"
              to: "canvas_sessions"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      create_community_channel: {
        Args: { p_community_id: string; p_name: string; p_topic?: string }
        Returns: string
      }
      create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: {
          id: string
          last_message_id: string | null
          last_updated: string | null
          user1_id: string
          user2_id: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_join_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: undefined
      }
      delete_community_channel: {
        Args: { p_channel_id: string }
        Returns: number
      }
      delete_direct_message: {
        Args: { p_message_id: string }
        Returns: boolean
      }
      delete_group_message: { Args: { p_message_id: string }; Returns: boolean }
      edit_direct_message: {
        Args: { p_content: string; p_message_id: string }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_edited: boolean
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          sent_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      edit_group_message: {
        Args: { p_content: string; p_message_id: string }
        Returns: boolean
      }
      event_is_all_day: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: boolean
      }
      generate_session_code: { Args: never; Returns: string }
      get_admin_search_logs: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_user_type?: string
        }
        Returns: {
          created_at: string
          id: string
          is_anonymous: boolean
          query_text: string
          result_count: number
          user_avatar: string
          user_college_id: string
          user_department: string
          user_email: string
          user_id: string
          user_name: string
          user_role: string
        }[]
      }
      get_admin_search_stats: { Args: never; Returns: Json }
      get_app_download_stats: { Args: { p_app_name?: string }; Returns: Json }
      get_blog_post_by_slug: {
        Args: { p_slug: string }
        Returns: {
          author_id: string
          author_image: string
          author_name: string
          content_html: string
          content_text: string
          cover_image_url: string
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }[]
      }
      get_blog_posts: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_tag?: string
        }
        Returns: {
          author_id: string
          author_image: string
          author_name: string
          cover_image_url: string
          created_at: string
          excerpt: string
          id: string
          published_at: string
          slug: string
          tags: string[]
          title: string
          total_count: number
          updated_at: string
          view_count: number
        }[]
      }
      get_calendar_day: {
        Args: { p_date: string }
        Returns: {
          calendar_date: string
          is_holiday: boolean
          notice_id: string
          notice_summary: string
          notice_title: string
          occasion_name: string
          source: string
        }[]
      }
      get_canvas_session_participants: {
        Args: { p_session_id: string }
        Returns: {
          id: string
          is_active: boolean
          joined_at: string
          role: string
          user_id: string
          user_name: string
          user_profile_image: string
        }[]
      }
      get_certificate: {
        Args: { p_certificate_id: string }
        Returns: {
          average_rating: number
          badges: number
          certificate_number: string
          department: string
          graduation_year: number
          is_alumni: boolean
          issued_at: string
          mentor_since: string
          name: string
          reviews: number
          revoked: boolean
          students_helped: number
          university: string
        }[]
      }
      get_community: {
        Args: { p_slug: string }
        Returns: {
          cover_image: string
          created_at: string
          description: string
          id: string
          is_archived: boolean
          kind: string
          last_activity_at: string
          member_count: number
          name: string
          owner_id: string
          owner_image: string
          owner_is_mentor: boolean
          owner_name: string
          pending_request_count: number
          post_count: number
          slug: string
          viewer_can_post: boolean
          viewer_can_view: boolean
          viewer_has_invite: boolean
          viewer_has_requested: boolean
          viewer_is_member: boolean
          viewer_is_owner: boolean
          visibility: string
        }[]
      }
      get_community_feed: {
        Args: {
          p_community_id?: string
          p_limit?: number
          p_mine?: boolean
          p_offset?: number
          p_post_type?: string
          p_search?: string
        }
        Returns: {
          author_department: string
          author_id: string
          author_image: string
          author_is_mentor: boolean
          author_name: string
          author_role: string
          comments_count: number
          community_id: string
          community_name: string
          community_slug: string
          content: string
          created_at: string
          id: string
          image_url: string
          likes_count: number
          post_type: string
          status: string
          tags: string[]
          title: string
          total_count: number
          updated_at: string
          viewer_has_liked: boolean
          viewer_is_author: boolean
        }[]
      }
      get_community_members: {
        Args: { p_community_id: string; p_limit?: number }
        Returns: {
          is_mentor: boolean
          joined_at: string
          name: string
          profile_image: string
          role: string
          user_id: string
        }[]
      }
      get_community_post: {
        Args: { p_post_id: string }
        Returns: {
          author_department: string
          author_id: string
          author_image: string
          author_is_mentor: boolean
          author_name: string
          author_role: string
          comments_count: number
          community_id: string
          community_name: string
          community_slug: string
          content: string
          created_at: string
          id: string
          image_url: string
          likes_count: number
          post_type: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          viewer_has_liked: boolean
          viewer_is_author: boolean
        }[]
      }
      get_conversation: {
        Args: { user1: string; user2: string }
        Returns: {
          id: string
          last_message_id: string | null
          last_updated: string | null
          user1_id: string
          user2_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_conversation_messages: {
        Args: { conversation_id: string }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string
          edited_at: string
          id: string
          is_edited: boolean
          is_read: boolean
          reactions: Json
          receiver_id: string
          reply_to_id: string
          sender_id: string
          sent_at: string
          viewer_reactions: string[]
        }[]
      }
      get_event_attendance_counts: {
        Args: { p_event_ids: number[] }
        Returns: {
          event_id: number
          going_count: number
          interested_count: number
          total_count: number
        }[]
      }
      get_event_attendees: {
        Args: { p_event_id: number }
        Returns: {
          created_at: string
          department: string
          is_mentor: boolean
          name: string
          note: string
          profile_image: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_faculty_directory_stats: {
        Args: never
        Returns: {
          department_count: number
          faculty_count: number
          rating_count: number
        }[]
      }
      get_faculty_interest_facets: {
        Args: { p_limit?: number }
        Returns: {
          faculty_count: number
          interest: string
        }[]
      }
      get_faculty_reviews: {
        Args: { p_faculty_id: string }
        Returns: {
          comment: string
          course_code: string
          created_at: string
          grading: number
          helpful_count: number
          helpfulness: number
          id: string
          is_own: boolean
          overall: number
          tags: string[]
          teaching: number
          viewer_voted: boolean
        }[]
      }
      get_faculty_tag_counts: {
        Args: { p_faculty_id: string }
        Returns: {
          count: number
          tag: string
        }[]
      }
      get_mentor_live_availability: {
        Args: { p_mentor_id: string }
        Returns: {
          availability_note: string
          available_from: string
          current_class_code: string
          current_class_end: string
          current_class_name: string
          current_class_room: string
          current_event_end: string
          current_event_title: string
          department: string
          is_active_now: boolean
          is_available: boolean
          last_message_at: string
          median_reply_minutes: number
          mentor_id: string
          name: string
          slug: string
          students_helped: number
          upcoming_going_count: number
          upcoming_interested_count: number
        }[]
      }
      get_mentor_reviews: {
        Args: { mentor_id: string }
        Returns: {
          created_at: string
          id: string
          rating: number
          review_text: string
          reviewer_image: string
          reviewer_name: string
        }[]
      }
      get_mentors_live_availability: {
        Args: { p_mentor_ids: string[] }
        Returns: {
          availability_note: string
          available_from: string
          current_class_code: string
          current_class_end: string
          current_class_name: string
          current_class_room: string
          current_event_end: string
          current_event_title: string
          department: string
          is_active_now: boolean
          is_available: boolean
          last_message_at: string
          median_reply_minutes: number
          mentor_id: string
          name: string
          slug: string
          students_helped: number
          upcoming_going_count: number
          upcoming_interested_count: number
        }[]
      }
      get_my_blog_posts: {
        Args: never
        Returns: {
          cover_image_url: string
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
          view_count: number
        }[]
      }
      get_post_comments: {
        Args: { p_post_id: string }
        Returns: {
          author_id: string
          author_image: string
          author_name: string
          content: string
          created_at: string
          id: string
          updated_at: string
          viewer_is_author: boolean
        }[]
      }
      get_team_members_public: {
        Args: never
        Returns: {
          created_at: string
          id: string
          image_url: string
          name: string
          position: string
          updated_at: string
        }[]
      }
      get_top_rated_faculty: {
        Args: { p_limit?: number; p_min_ratings?: number }
        Returns: {
          avg_overall: number
          department: string
          designation: string
          id: string
          image_url: string
          name: string
          rating_count: number
          school: string
          slug: string
        }[]
      }
      get_trending_searches: {
        Args: { p_limit?: number }
        Returns: {
          hit_count: number
          query_text: string
        }[]
      }
      get_user_event_schedule: {
        Args: { p_user_id: string }
        Returns: {
          department: string
          end_date: string
          event_id: number
          event_type: string
          image_url: string
          is_all_day: boolean
          is_happening_now: boolean
          link: string
          note: string
          start_date: string
          status: string
          title: string
        }[]
      }
      get_user_joined_communities: {
        Args: { p_user_id: string }
        Returns: {
          community_cover_image: string
          community_id: string
          community_kind: string
          community_member_count: number
          community_name: string
          community_slug: string
          joined_at: string
          role: string
        }[]
      }
      get_user_weekly_timetable: {
        Args: { p_user_id: string }
        Returns: {
          course_code: string
          course_name: string
          day_name: string
          day_order: number
          end_time: string
          faculty_name: string
          hour: number
          is_lab: boolean
          room_number: string
          slot: string
          start_time: string
        }[]
      }
      graduated_mentors_awaiting_confirmation: {
        Args: never
        Returns: {
          graduation_year: number
          name: string
          user_id: string
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_blog_post_views: {
        Args: { p_slug: string }
        Returns: undefined
      }
      invite_to_community: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: string
      }
      is_active_mentor: { Args: { p_user_id: string }; Returns: boolean }
      is_admin_user: { Args: { user_id?: string }; Returns: boolean }
      is_college_id_taken: { Args: { p_college_id: string }; Returns: boolean }
      is_community_member: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_community_owner: {
        Args: { p_community_id: string; p_user_id: string }
        Returns: boolean
      }
      is_fresh: {
        Args: { o: Database["public"]["Tables"]["opportunities"]["Row"] }
        Returns: boolean
      }
      is_non_instructional_day: {
        Args: { check_date?: string }
        Returns: boolean
      }
      issue_certificate_if_earned: { Args: never; Returns: string }
      join_canvas_session: {
        Args: { p_session_code: string; p_user_id: string }
        Returns: {
          id: string
          role: string
          session_id: string
          session_title: string
        }[]
      }
      keyword_search_knowledge: {
        Args: {
          p_entity_types?: string[]
          p_limit?: number
          p_min_rank?: number
          p_query: string
          p_viewer?: string
        }
        Returns: {
          body: string
          entity_id: string
          entity_type: string
          keyword_rank: number
          metadata: Json
          source_path: string
          subtitle: string
          title: string
        }[]
      }
      list_communities: {
        Args: {
          p_kind?: string
          p_limit?: number
          p_mine?: boolean
          p_offset?: number
          p_search?: string
        }
        Returns: {
          cover_image: string
          created_at: string
          description: string
          id: string
          is_archived: boolean
          kind: string
          last_activity_at: string
          member_count: number
          name: string
          owner_id: string
          owner_image: string
          owner_name: string
          post_count: number
          slug: string
          total_count: number
          viewer_has_invite: boolean
          viewer_has_requested: boolean
          viewer_is_member: boolean
          viewer_is_owner: boolean
          visibility: string
        }[]
      }
      list_community_channels: {
        Args: { p_community_id: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          message_count: number
          slug: string
          topic: string
        }[]
      }
      list_group_messages: {
        Args: { p_channel?: string; p_community_id: string; p_limit?: number }
        Returns: {
          channel: string
          content: string
          created_at: string
          edited_at: string
          id: string
          is_edited: boolean
          is_mentor: boolean
          is_owner: boolean
          reactions: Json
          reply_to_content: string
          reply_to_id: string
          reply_to_sender_name: string
          sender_avatar: string
          sender_id: string
          sender_name: string
          viewer_reactions: string[]
        }[]
      }
      list_join_requests: {
        Args: { p_community_id: string }
        Returns: {
          created_at: string
          id: string
          is_mentor: boolean
          message: string
          name: string
          profile_image: string
          user_id: string
        }[]
      }
      list_my_invites: {
        Args: never
        Returns: {
          community_id: string
          community_name: string
          community_slug: string
          created_at: string
          id: string
          invited_by_name: string
        }[]
      }
      log_admin_action: {
        Args: { action_details?: Json; action_type: string; target_id?: string }
        Returns: undefined
      }
      log_mentor_profile_view: {
        Args: { p_mentor_id: string }
        Returns: undefined
      }
      log_search_click: {
        Args: { p_entity_id: string; p_entity_type: string; p_query: string }
        Returns: undefined
      }
      log_search_run: {
        Args: { p_query: string; p_result_count: number }
        Returns: undefined
      }
      maintenance_cleanup: { Args: never; Returns: undefined }
      mark_all_messages_delivered: { Args: never; Returns: undefined }
      mark_messages_as_read: {
        Args: { conversation_id: string; user_id: string }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_edited: boolean
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          sent_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_messages_delivered: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      mentor_activity: {
        Args: { p_user_id: string }
        Returns: {
          last_message_at: string
          median_reply_minutes: number
          requests_answered: number
          requests_received: number
          students_helped: number
        }[]
      }
      mentor_dashboard_stats: {
        Args: never
        Returns: {
          last_message_at: string
          median_reply_minutes: number
          profile_views_30d: number
          profile_views_prev30: number
          requests_answered: number
          requests_received: number
          search_clicks_30d: number
          students_helped: number
        }[]
      }
      mentor_impact: {
        Args: { p_user_id: string }
        Returns: {
          average_rating: number
          badges: number
          mentor_since: string
          reviews: number
          students_helped: number
        }[]
      }
      mentor_is_listed: {
        Args: { p_available_from: string; p_is_available: boolean }
        Returns: boolean
      }
      mentor_summary_source_hash: {
        Args: {
          p_bio: string
          p_company: string
          p_courses: Json
          p_department: string
          p_experiences: Json
          p_hobbies: string
          p_is_alumni: boolean
          p_job_title: string
          p_projects: Json
          p_skills: string[]
          p_year: string
        }
        Returns: string
      }
      mentors_needing_summary: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          source_hash: string
        }[]
      }
      my_certificate_status: {
        Args: never
        Returns: {
          average_rating: number
          badges: number
          certificate_id: string
          certificate_number: string
          is_mentor: boolean
          issued_at: string
          mentor_since: string
          reviews: number
          revoked: boolean
          students_helped: number
          students_required: number
        }[]
      }
      promote_to_admin_with_code: {
        Args: { recovery_code: string; target_user_id: string }
        Returns: boolean
      }
      prompt_graduated_mentors: { Args: never; Returns: number }
      queue_academic_refresh_reminders: { Args: never; Returns: number }
      rebuild_article_chunks: { Args: never; Returns: number }
      rebuild_blog_post_chunks: { Args: never; Returns: number }
      rebuild_community_chunks: { Args: { p_id?: string }; Returns: number }
      rebuild_document_chunks: { Args: never; Returns: number }
      rebuild_faculty_chunks: { Args: never; Returns: number }
      rebuild_knowledge_chunks: {
        Args: never
        Returns: {
          count: number
          entity: string
        }[]
      }
      rebuild_mentor_chunks: { Args: never; Returns: number }
      rebuild_notice_chunks: { Args: never; Returns: number }
      rebuild_opportunity_chunks: { Args: never; Returns: number }
      rebuild_post_chunks: { Args: { p_id?: string }; Returns: number }
      rebuild_student_chunks: { Args: { p_user_id?: string }; Returns: number }
      record_app_download: {
        Args: {
          p_app_name?: string
          p_download_type?: string
          p_platform?: string
        }
        Returns: number
      }
      record_pwa_install: {
        Args: { p_device_id: string; p_platform: string; p_user_id?: string }
        Returns: undefined
      }
      record_search_history: {
        Args: { p_query: string; p_result_url?: string }
        Returns: undefined
      }
      request_to_join_community: {
        Args: { p_community_id: string; p_message?: string }
        Returns: string
      }
      respond_to_invite: {
        Args: { p_accept: boolean; p_invite_id: string }
        Returns: undefined
      }
      resume_expired_mentor_availability: { Args: never; Returns: number }
      search_campus_users: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          badge: string
          department: string
          id: string
          name: string
          profile_image: string
          role: string
        }[]
      }
      search_knowledge: {
        Args: {
          p_embedding: string
          p_entity_types?: string[]
          p_limit?: number
          p_min_similarity?: number
          p_viewer?: string
        }
        Returns: {
          body: string
          entity_id: string
          entity_type: string
          metadata: Json
          similarity: number
          source_path: string
          subtitle: string
          title: string
        }[]
      }
      send_group_message: {
        Args: {
          p_channel: string
          p_community_id: string
          p_content: string
          p_reply_to_id?: string
        }
        Returns: string
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_receiver_id: string
          p_reply_to_id?: string
          p_sender_id: string
        }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_edited: boolean
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          sent_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_mentor_availability: {
        Args: { p_available: boolean; p_days?: number; p_note?: string }
        Returns: {
          availability_note: string
          available_from: string
          is_available: boolean
        }[]
      }
      slugify: { Args: { p_text: string }; Returns: string }
      submit_ai_overview_feedback: {
        Args: {
          p_is_helpful?: boolean
          p_query: string
          p_response?: Json
          p_session_id?: string
        }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      toggle_direct_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      toggle_group_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      touch_search_cache: { Args: { p_hash: string }; Returns: undefined }
      trigger_srm_portal_sync: {
        Args: { p_force?: boolean; p_user_id?: string }
        Returns: number
      }
      update_conversation: {
        Args: { conversation_id: string; message_id: string }
        Returns: undefined
      }
      update_mentor_rating: { Args: { mentor_id: string }; Returns: undefined }
      update_typing_indicator: {
        Args: {
          p_conversation_id: string
          p_is_typing: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_presence: {
        Args: { p_is_online: boolean; p_user_id: string }
        Returns: undefined
      }
      update_verification_status: {
        Args: {
          admin_id: string
          new_status: string
          reason?: string
          verification_id: string
        }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      user_badges_public: {
        Args: { p_user_id: string }
        Returns: {
          awarded_at: string
          awarded_by: string
          awarded_by_name: string
          badge_category: string
          badge_color: string
          badge_created_at: string
          badge_description: string
          badge_icon: string
          badge_name: string
          badge_type_id: string
          badge_updated_at: string
          id: string
          notes: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {},
  },
} as const

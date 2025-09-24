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
        ]
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
      community_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          mentor_id: string
          post_type: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          mentor_id: string
          post_type?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          mentor_id?: string
          post_type?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mentor"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
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
            foreignKeyName: "conversations_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_sessions: {
        Row: {
          id: string
          mentor_id: string
          title: string
          session_code: string
          created_at: string | null
          is_active: boolean | null
          max_participants: number | null
          background_color: string | null
        }
        Insert: {
          id?: string
          mentor_id: string
          title: string
          session_code: string
          created_at?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          background_color?: string | null
        }
        Update: {
          id?: string
          mentor_id?: string
          title?: string
          session_code?: string
          created_at?: string | null
          is_active?: boolean | null
          max_participants?: number | null
          background_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canvas_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at: string | null
          role: string
          is_active: boolean | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string | null
          role: string
          is_active?: boolean | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          joined_at?: string | null
          role?: string
          is_active?: boolean | null
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
        ]
      }
      canvas_drawings: {
        Row: {
          id: string
          session_id: string
          user_id: string
          drawing_data: Json
          timestamp: string | null
          action_type: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          drawing_data: Json
          timestamp?: string | null
          action_type: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          drawing_data?: Json
          timestamp?: string | null
          action_type?: string
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
        ]
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
        ]
      }
      mentor_verifications: {
        Row: {
          application_data: Json | null
          cgpa: number | null
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
            foreignKeyName: "mentor_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          bio: string | null
          cgpa: number | null
          created_at: string | null
          department: string
          hobbies: string | null
          id: string
          linkedin_url: string | null
          mobile: string | null
          name: string
          profile_image: string | null
          rating: number
          review_count: number
          skills: string[]
          university: string | null
          year_of_studies: string | null
        }
        Insert: {
          bio?: string | null
          cgpa?: number | null
          created_at?: string | null
          department: string
          hobbies?: string | null
          id?: string
          linkedin_url?: string | null
          mobile?: string | null
          name: string
          profile_image?: string | null
          rating?: number
          review_count?: number
          skills: string[]
          university?: string | null
          year_of_studies?: string | null
        }
        Update: {
          bio?: string | null
          cgpa?: number | null
          created_at?: string | null
          department?: string
          hobbies?: string | null
          id?: string
          linkedin_url?: string | null
          mobile?: string | null
          name?: string
          profile_image?: string | null
          rating?: number
          review_count?: number
          skills?: string[]
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
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          delivery_status?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          receiver_id: string
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          delivery_status?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          receiver_id?: string
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
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        ]
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
          bio: string | null
          created_at: string | null
          department: string | null
          email: string
          email_frequency: string | null
          email_notifications: boolean | null
          id: string
          is_admin: boolean
          is_available: boolean | null
          linkedin_url: string | null
          mobile: string | null
          name: string
          phone: string | null
          profile_image: string | null
          role: string
          skills: string[] | null
          verification_status: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          email_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          is_admin?: boolean
          is_available?: boolean | null
          linkedin_url?: string | null
          mobile?: string | null
          name: string
          phone?: string | null
          profile_image?: string | null
          role: string
          skills?: string[] | null
          verification_status?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          email_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          is_admin?: boolean
          is_available?: boolean | null
          linkedin_url?: string | null
          mobile?: string | null
          name?: string
          phone?: string | null
          profile_image?: string | null
          role?: string
          skills?: string[] | null
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
    }
    Functions: {
      auto_award_performance_badges: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      can_user_rate_mentor: {
        Args: { mentor_id: string; user_id: string }
        Returns: boolean
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
      }
      delete_all_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      }
      get_conversation_messages: {
        Args: { conversation_id: string }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
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
      get_team_members_public: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          image_url: string
          name: string
          position: string
          updated_at: string
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
        | { content: string; content_type: string; uri: string }
        | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
        | { content: string; content_type: string; uri: string }
        | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin_user: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: { action_details?: Json; action_type: string; target_id?: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { conversation_id: string; user_id: string }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
        }[]
      }
      mark_messages_delivered: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: undefined
      }
      promote_to_admin_with_code: {
        Args: { recovery_code: string; target_user_id: string }
        Returns: boolean
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: {
          content: string
          conversation_id: string
          delivery_status: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
        }
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_conversation: {
        Args: { conversation_id: string; message_id: string }
        Returns: undefined
      }
      update_mentor_rating: {
        Args: { mentor_id: string }
        Returns: undefined
      }
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
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      create_canvas_session: {
        Args: { p_title: string; p_mentor_id: string }
        Returns: {
          id: string
          mentor_id: string
          title: string
          session_code: string
          created_at: string | null
          is_active: boolean | null
          max_participants: number | null
          background_color: string | null
        }
      }
      join_canvas_session: {
        Args: { p_session_code: string; p_user_id: string }
        Returns: {
          id: string
          mentor_id: string
          title: string
          session_code: string
          created_at: string | null
          is_active: boolean | null
          max_participants: number | null
          background_color: string | null
        }
      }
      get_canvas_session_participants: {
        Args: { p_session_id: string }
        Returns: {
          id: string
          user_id: string
          role: string
          joined_at: string | null
          is_active: boolean | null
          user_name: string
          user_profile_image: string | null
        }[]
      }
      generate_session_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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
        method: unknown | null
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

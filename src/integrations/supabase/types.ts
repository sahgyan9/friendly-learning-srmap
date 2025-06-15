export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          response: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          response: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          response?: string
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
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          application_data?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_data?: Json | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
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
          created_at: string | null
          department: string
          id: string
          linkedin_url: string | null
          name: string
          profile_image: string | null
          rating: number
          review_count: number
          skills: string[]
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          department: string
          id?: string
          linkedin_url?: string | null
          name: string
          profile_image?: string | null
          rating?: number
          review_count?: number
          skills: string[]
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          department?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          profile_image?: string | null
          rating?: number
          review_count?: number
          skills?: string[]
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
          id: string
          is_admin: boolean
          is_available: boolean | null
          linkedin_url: string | null
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
          id?: string
          is_admin?: boolean
          is_available?: boolean | null
          linkedin_url?: string | null
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
          id?: string
          is_admin?: boolean
          is_available?: boolean | null
          linkedin_url?: string | null
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
      [_ in never]: never
    }
    Functions: {
      auto_award_performance_badges: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_user_rate_mentor: {
        Args: { user_id: string; mentor_id: string }
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
          id: string
          rating: number
          review_text: string
          created_at: string
          reviewer_name: string
          reviewer_image: string
        }[]
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
      send_message: {
        Args: {
          p_conversation_id: string
          p_sender_id: string
          p_receiver_id: string
          p_content: string
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
          p_user_id: string
          p_is_typing: boolean
        }
        Returns: undefined
      }
      update_user_presence: {
        Args: { p_user_id: string; p_is_online: boolean }
        Returns: undefined
      }
      update_verification_status: {
        Args: {
          verification_id: string
          new_status: string
          admin_id: string
          reason?: string
        }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

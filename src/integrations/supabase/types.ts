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
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          condition: string
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          latitude: number | null
          listing_paid: boolean | null
          listing_payment_id: string | null
          location_address: string | null
          longitude: number | null
          postal_code: string | null
          price_range: number
          quantity: number | null
          seller_id: string | null
          status: string | null
          title: string
          transfer_type: string
          updated_at: string | null
        }
        Insert: {
          author: string
          condition: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_paid?: boolean | null
          listing_payment_id?: string | null
          location_address?: string | null
          longitude?: number | null
          postal_code?: string | null
          price_range: number
          quantity?: number | null
          seller_id?: string | null
          status?: string | null
          title: string
          transfer_type: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          condition?: string
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_paid?: boolean | null
          listing_payment_id?: string | null
          location_address?: string | null
          longitude?: number | null
          postal_code?: string | null
          price_range?: number
          quantity?: number | null
          seller_id?: string | null
          status?: string | null
          title?: string
          transfer_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          purchase_request_id: string | null
          sender_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          purchase_request_id?: string | null
          sender_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          purchase_request_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_confirmations: {
        Row: {
          buyer_confirmed_delivery: boolean | null
          buyer_confirmed_payment: boolean | null
          buyer_id: string | null
          created_at: string | null
          expected_delivery_date: string | null
          final_payout_processed: boolean | null
          id: string
          otp_code: string
          otp_sent_at: string | null
          otp_verified_at: string | null
          payment_method: string | null
          purchase_request_id: string | null
          seller_confirmed_delivery: boolean | null
          seller_confirmed_payment: boolean | null
          seller_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_confirmed_delivery?: boolean | null
          buyer_confirmed_payment?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          final_payout_processed?: boolean | null
          id?: string
          otp_code: string
          otp_sent_at?: string | null
          otp_verified_at?: string | null
          payment_method?: string | null
          purchase_request_id?: string | null
          seller_confirmed_delivery?: boolean | null
          seller_confirmed_payment?: boolean | null
          seller_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_confirmed_delivery?: boolean | null
          buyer_confirmed_payment?: boolean | null
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          final_payout_processed?: boolean | null
          id?: string
          otp_code?: string
          otp_sent_at?: string | null
          otp_verified_at?: string | null
          payment_method?: string | null
          purchase_request_id?: string | null
          seller_confirmed_delivery?: boolean | null
          seller_confirmed_payment?: boolean | null
          seller_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_confirmations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_confirmations_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_confirmations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          read: boolean | null
          related_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read?: boolean | null
          related_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
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
          average_rating: number | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          phone: string | null
          postal_code: string | null
          registration_paid: boolean | null
          registration_payment_id: string | null
          review_count: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          registration_paid?: boolean | null
          registration_payment_id?: string | null
          review_count?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          registration_paid?: boolean | null
          registration_payment_id?: string | null
          review_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_requests: {
        Row: {
          book_id: string | null
          buyer_id: string | null
          created_at: string | null
          expected_delivery_date: string | null
          id: string
          message: string | null
          offered_price: number
          seller_id: string | null
          status: string | null
          transfer_mode: string
          updated_at: string | null
        }
        Insert: {
          book_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          message?: string | null
          offered_price: number
          seller_id?: string | null
          status?: string | null
          transfer_mode: string
          updated_at?: string | null
        }
        Update: {
          book_id?: string | null
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery_date?: string | null
          id?: string
          message?: string | null
          offered_price?: number
          seller_id?: string | null
          status?: string | null
          transfer_mode?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          book_id: string | null
          created_at: string | null
          id: string
          purchase_request_id: string | null
          rating: number
          review_text: string | null
          review_type: string
          reviewed_user_id: string | null
          reviewer_id: string | null
          updated_at: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string | null
          id?: string
          purchase_request_id?: string | null
          rating: number
          review_text?: string | null
          review_type: string
          reviewed_user_id?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string | null
          id?: string
          purchase_request_id?: string | null
          rating?: number
          review_text?: string | null
          review_type?: string
          reviewed_user_id?: string | null
          reviewer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
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
      [_ in never]: never
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

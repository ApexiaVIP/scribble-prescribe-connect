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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          availability_type: Database["public"]["Enums"]["availability_type"]
          created_at: string
          date: string
          end_time: string
          id: string
          is_booked: boolean
          prescriber_id: string
          start_time: string
        }
        Insert: {
          availability_type: Database["public"]["Enums"]["availability_type"]
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_booked?: boolean
          prescriber_id: string
          start_time: string
        }
        Update: {
          availability_type?: Database["public"]["Enums"]["availability_type"]
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_booked?: boolean
          prescriber_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_prescriber_id_fkey"
            columns: ["prescriber_id"]
            isOneToOne: false
            referencedRelation: "prescribers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          availability_id: string | null
          booking_date: string
          business_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          platform_fee: number | null
          prescriber_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          availability_id?: string | null
          booking_date: string
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          platform_fee?: number | null
          prescriber_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          availability_id?: string | null
          booking_date?: string
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          platform_fee?: number | null
          prescriber_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_prescriber_id_fkey"
            columns: ["prescriber_id"]
            isOneToOne: false
            referencedRelation: "prescribers"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_name: string
          business_type: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          paid_at: string | null
          platform_fee: number | null
          released_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          platform_fee?: number | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          platform_fee?: number | null
          released_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      prescribers: {
        Row: {
          availability_types:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          bio: string | null
          created_at: string
          daily_rate: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          location: string | null
          prescriber_type: Database["public"]["Enums"]["prescriber_type"]
          regions_covered: string[] | null
          registration_number: string
          sectors: string[] | null
          specialisations: string[] | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          years_experience: number | null
        }
        Insert: {
          availability_types?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          bio?: string | null
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          prescriber_type: Database["public"]["Enums"]["prescriber_type"]
          regions_covered?: string[] | null
          registration_number: string
          sectors?: string[] | null
          specialisations?: string[] | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Update: {
          availability_types?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          bio?: string | null
          created_at?: string
          daily_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          prescriber_type?: Database["public"]["Enums"]["prescriber_type"]
          regions_covered?: string[] | null
          registration_number?: string
          sectors?: string[] | null
          specialisations?: string[] | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          years_experience?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          admin_notes: string | null
          document_type: string
          document_url: string
          id: string
          prescriber_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
          uploaded_at: string
        }
        Insert: {
          admin_notes?: string | null
          document_type: string
          document_url: string
          id?: string
          prescriber_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          uploaded_at?: string
        }
        Update: {
          admin_notes?: string | null
          document_type?: string
          document_url?: string
          id?: string
          prescriber_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_prescriber_id_fkey"
            columns: ["prescriber_id"]
            isOneToOne: false
            referencedRelation: "prescribers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "prescriber" | "business" | "admin"
      availability_type: "hourly" | "daily" | "long_term"
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "completed"
        | "cancelled"
      prescriber_type:
        | "gp"
        | "pharmacist"
        | "nurse_prescriber"
        | "dentist"
        | "other"
      verification_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["prescriber", "business", "admin"],
      availability_type: ["hourly", "daily", "long_term"],
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
      ],
      prescriber_type: [
        "gp",
        "pharmacist",
        "nurse_prescriber",
        "dentist",
        "other",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const

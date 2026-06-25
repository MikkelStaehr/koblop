// Typer for Supabase-skemaet. Håndskrevet så de matcher migrations/ uden at
// kræve Docker til "supabase gen types". Når du har Docker eller en
// SUPABASE_ACCESS_TOKEN, kan de regenereres automatisk (npm run db:types).
// Hold på linje med supabase/migrations/.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "instructor" | "student";
export type LessonType = "teori" | "praksis";
export type PracticalVenue =
  | "teorilokale"
  | "vej"
  | "lukket_oevelsesplads"
  | "koereteknisk_anlaeg";
export type LessonStatus =
  | "ikke_planlagt"
  | "planlagt"
  | "gennemfoert"
  | "godkendt";
export type ModuleStatus =
  | "laast"
  | "i_gang"
  | "afventer_godkendelse"
  | "gennemfoert";
export type EnrollmentStatus = "active" | "completed" | "paused";
export type BookingStatus = "booked" | "completed" | "cancelled";
export type ExceptionType = "block" | "extra";
export type RequirementType = "kursus" | "proeve";

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          cancellation_window_hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cancellation_window_hours?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          school_id: string | null;
          role: UserRole;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          school_id?: string | null;
          role: UserRole;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          code: string;
          name: string;
          max_selvstudium_lessons: number;
          max_lessons_per_day: number;
          max_practical_lessons_per_day: number;
          valid_from: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          max_selvstudium_lessons?: number;
          max_lessons_per_day?: number;
          max_practical_lessons_per_day?: number;
          valid_from?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          category_id: string;
          order_index: number;
          title: string;
          description: string | null;
          min_theory_lessons: number;
          min_practical_lessons: number;
          default_practical_venue: PracticalVenue | null;
          practical_venues: PracticalVenue[];
          topics: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          order_index: number;
          title: string;
          description?: string | null;
          min_theory_lessons?: number;
          min_practical_lessons?: number;
          default_practical_venue?: PracticalVenue | null;
          practical_venues?: PracticalVenue[];
          topics?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
      };
      additional_requirements: {
        Row: {
          id: string;
          category_id: string;
          code: string;
          title: string;
          description: string | null;
          type: RequirementType;
          order_index: number;
        };
        Insert: {
          id?: string;
          category_id: string;
          code: string;
          title: string;
          description?: string | null;
          type: RequirementType;
          order_index?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["additional_requirements"]["Insert"]
        >;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          category_id: string;
          primary_instructor_id: string | null;
          status: EnrollmentStatus;
          started_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          category_id: string;
          primary_instructor_id?: string | null;
          status?: EnrollmentStatus;
          started_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
        Relationships: [];
      };
      module_progress: {
        Row: {
          id: string;
          enrollment_id: string;
          module_id: string;
          order_index: number;
          status: ModuleStatus;
          signed_off_by: string | null;
          signed_off_at: string | null;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          module_id: string;
          order_index: number;
          status?: ModuleStatus;
          signed_off_by?: string | null;
          signed_off_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["module_progress"]["Insert"]
        >;
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          id: string;
          enrollment_id: string;
          module_id: string;
          lesson_no: number;
          type: LessonType;
          venue: PracticalVenue;
          status: LessonStatus;
          scheduled_at: string | null;
          completed_at: string | null;
          approved_by: string | null;
          selvstudium: boolean;
          note: string | null;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          module_id: string;
          lesson_no: number;
          type: LessonType;
          venue: PracticalVenue;
          status?: LessonStatus;
          scheduled_at?: string | null;
          completed_at?: string | null;
          approved_by?: string | null;
          selvstudium?: boolean;
          note?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["lesson_progress"]["Insert"]
        >;
        Relationships: [];
      };
      enrollment_requirements: {
        Row: {
          id: string;
          enrollment_id: string;
          requirement_id: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          requirement_id: string;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["enrollment_requirements"]["Insert"]
        >;
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          type: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          type?: string;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          school_id: string;
          instructor_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          instructor_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["availability_rules"]["Insert"]
        >;
        Relationships: [];
      };
      availability_exceptions: {
        Row: {
          id: string;
          school_id: string;
          instructor_id: string;
          date: string;
          type: ExceptionType;
          start_time: string | null;
          end_time: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          instructor_id: string;
          date: string;
          type: ExceptionType;
          start_time?: string | null;
          end_time?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["availability_exceptions"]["Insert"]
        >;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          school_id: string;
          enrollment_id: string;
          lesson_id: string;
          instructor_id: string;
          resource_id: string | null;
          start_at: string;
          end_at: string;
          status: BookingStatus;
          cancelled_by: string | null;
          cancelled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          enrollment_id: string;
          lesson_id: string;
          instructor_id: string;
          resource_id?: string | null;
          start_at: string;
          end_at: string;
          status?: BookingStatus;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_school_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      instructor_busy: {
        Args: { p_instructor: string; p_from: string; p_to: string };
        Returns: { start_at: string; end_at: string }[];
      };
    };
    Enums: {
      user_role: UserRole;
      lesson_type: LessonType;
      practical_venue: PracticalVenue;
      lesson_status: LessonStatus;
      module_status: ModuleStatus;
      enrollment_status: EnrollmentStatus;
      booking_status: BookingStatus;
      exception_type: ExceptionType;
      requirement_type: RequirementType;
    };
    CompositeTypes: Record<never, never>;
  };
};

// Bekvemme aliaser
type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

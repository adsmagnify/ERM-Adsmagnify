export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "To Do" | "In Progress" | "Done";
export type DayStatus = "Full day" | "Half day";
export type StatusReason = "Late arrival" | "Left early";
export type UserRole = "admin" | "employee";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  clock_in_by: string;
  clock_out_after: string;
  wednesday_clock_in_by: string | null;
  created_at: string;
};

export type Attendance = {
  id: string;
  user_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: DayStatus | null;
  status_reason: StatusReason | null;
  status_overridden: boolean;
  auto_clocked_out?: boolean;
  created_at: string;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_accuracy: number | null;
  clock_in_ip: string | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_accuracy: number | null;
  clock_out_ip: string | null;
};

export type OfficeSettingsRow = {
  id: number;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radius_m: number;
  allowed_ips: string[];
  updated_at: string;
};

export type DelayNotice = {
  id: string;
  user_id: string;
  work_date: string;
  eta: string;
  reason: string;
  message: string;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
          clock_in_by?: string;
          clock_out_after?: string;
          wednesday_clock_in_by?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
          clock_in_by?: string;
          clock_out_after?: string;
          wednesday_clock_in_by?: string | null;
        };
        Relationships: [];
      };
      attendance: {
        Row: Attendance;
        Insert: {
          id?: string;
          user_id: string;
          work_date: string;
          clock_in?: string | null;
          clock_out?: string | null;
          status?: DayStatus | null;
          status_reason?: StatusReason | null;
          created_at?: string;
          clock_in_lat?: number | null;
          clock_in_lng?: number | null;
          clock_in_accuracy?: number | null;
          clock_in_ip?: string | null;
        };
        Update: {
          clock_out?: string | null;
          status?: DayStatus | null;
          status_reason?: StatusReason | null;
          status_overridden?: boolean;
          clock_out_lat?: number | null;
          clock_out_lng?: number | null;
          clock_out_accuracy?: number | null;
          clock_out_ip?: string | null;
          auto_clocked_out?: boolean;
        };
        Relationships: [];
      };
      office_settings: {
        Row: OfficeSettingsRow;
        Insert: OfficeSettingsRow;
        Update: {
          label?: string;
          address?: string;
          lat?: number;
          lng?: number;
          radius_m?: number;
          allowed_ips?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
        };
        Relationships: [];
      };
      delay_notices: {
        Row: DelayNotice;
        Insert: {
          id?: string;
          user_id: string;
          work_date: string;
          eta: string;
          reason: string;
          message: string;
          created_at?: string;
        };
        Update: {
          eta?: string;
          reason?: string;
          message?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clock_in: {
        Args: Record<PropertyKey, never>;
        Returns: Attendance;
      };
      clock_out: {
        Args: Record<PropertyKey, never>;
        Returns: Attendance;
      };
      close_open_attendance: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      task_priority: TaskPriority;
      task_status: TaskStatus;
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

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
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
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
        };
        Update: {
          clock_out?: string | null;
          status?: DayStatus | null;
          status_reason?: StatusReason | null;
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

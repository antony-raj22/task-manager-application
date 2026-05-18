export type AppUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_staff: boolean;
  role: "ADMIN" | "MEMBER";
};

export type Task = {
  id: number;
  title: string;
  description: string;
  assigned_to: number;
  assigned_to_detail: AppUser;
  created_by: number;
  created_by_detail: AppUser;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  start_date: string | null;
  due_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

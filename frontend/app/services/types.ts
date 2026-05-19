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

export type Notification = {
  id: number;
  recipient: number;
  actor: number | null;
  actor_detail: AppUser | null;
  task: number;
  task_detail: Task;
  kind: "TASK_ASSIGNED" | "TASK_COMPLETED";
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export type AdminSummary = {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  members: number;
  unread_notifications: number;
};

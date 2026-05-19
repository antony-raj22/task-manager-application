"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "./services/api";
import type { AdminSummary, AppUser, Notification, Task } from "./services/types";

type View = "admin" | "tasks" | "calendar" | "notifications";

const emptyForm = {
  title: "",
  description: "",
  assigned_to: "",
  priority: "MEDIUM",
  start_date: "",
  due_date: "",
};

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [view, setView] = useState<View>("tasks");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "ADMIN";
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<AppUser>("/auth/me/");
        setUser(me);
        setView(me.role === "ADMIN" ? "admin" : "tasks");
        await refreshData(me.role === "ADMIN");
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function refreshData(adminAccess = isAdmin) {
    const [taskData, notificationData] = await Promise.all([
      api<Task[]>("/tasks/"),
      api<Notification[]>("/notifications/"),
    ]);
    setTasks(taskData);
    setNotifications(notificationData);

    if (adminAccess) {
      const [memberData, summaryData] = await Promise.all([
        api<AppUser[]>("/auth/members/"),
        api<AdminSummary>("/admin/summary/"),
      ]);
      setMembers(memberData);
      setSummary(summaryData);
    }
  }

  async function handleGoogleLogin(credential?: string) {
    if (!credential) return;
    setError("");
    try {
      const result = await api<{ token: string; user: AppUser }>("/auth/google/", {
        method: "POST",
        body: JSON.stringify({ credential }),
        skipAuth: true,
      });
      setToken(result.token);
      setUser(result.user);
      setView(result.user.role === "ADMIN" ? "admin" : "tasks");
      await refreshData(result.user.role === "ADMIN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api<Task>("/tasks/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          assigned_to: Number(form.assigned_to),
          start_date: form.start_date || null,
        }),
      });
      setForm(emptyForm);
      await refreshData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task creation failed");
    }
  }

  async function completeTask(taskId: number) {
    await api<Task>(`/tasks/${taskId}/complete/`, { method: "POST" });
    await refreshData();
  }

  async function markNotificationRead(notificationId: number) {
    await api<Notification>(`/notifications/${notificationId}/mark_read/`, { method: "POST" });
    await refreshData();
  }

  async function markAllNotificationsRead() {
    await api<{ detail: string }>("/notifications/mark_all_read/", { method: "POST" });
    await refreshData();
  }

  function logout() {
    clearToken();
    setUser(null);
    setTasks([]);
    setMembers([]);
    setNotifications([]);
    setSummary(null);
    setView("tasks");
  }

  const calendarDays = useMemo(() => buildCalendar(tasks), [tasks]);

  if (loading) {
    return <main className="shell center">Loading...</main>;
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Task Manager</p>
            <h1>Assign work, track progress, and see deadlines clearly.</h1>
            <p className="muted">Sign in with Google to continue.</p>
          </div>
          <GoogleLogin
            onSuccess={(response) => handleGoogleLogin(response.credential)}
            onError={() => setError("Google login failed")}
          />
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Task Manager</p>
          <h1>{isAdmin ? "Administration" : "Member workspace"}</h1>
        </div>
        <div className="account">
          <UserRound size={18} />
          <span>{user.full_name}</span>
          <button className="icon-button" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="app-tabs" aria-label="Application views">
        {isAdmin && (
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
            <ShieldCheck size={16} />
            Admin
          </button>
        )}
        <button className={view === "tasks" ? "active" : ""} onClick={() => setView("tasks")}>
          <ClipboardList size={16} />
          Tasks
        </button>
        <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
          <CalendarDays size={16} />
          Calendar
        </button>
        <button className={view === "notifications" ? "active" : ""} onClick={() => setView("notifications")}>
          <Bell size={16} />
          Notifications
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
      </nav>

      {error && <p className="error">{error}</p>}

      {view === "admin" && isAdmin && (
        <AdminView
          form={form}
          members={members}
          summary={summary}
          tasks={tasks}
          setForm={setForm}
          createTask={createTask}
        />
      )}

      {view === "tasks" && <TaskList isAdmin={isAdmin} tasks={tasks} completeTask={completeTask} />}

      {view === "calendar" && <CalendarView days={calendarDays} />}

      {view === "notifications" && (
        <NotificationView
          notifications={notifications}
          markRead={markNotificationRead}
          markAllRead={markAllNotificationsRead}
        />
      )}
    </main>
  );
}

function AdminView({
  form,
  members,
  summary,
  tasks,
  setForm,
  createTask,
}: {
  form: typeof emptyForm;
  members: AppUser[];
  summary: AdminSummary | null;
  tasks: Task[];
  setForm: (form: typeof emptyForm) => void;
  createTask: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="workspace">
      <div className="admin-stack">
        <section className="summary-grid">
          <Metric icon={<BarChart3 size={18} />} label="Total" value={summary?.total_tasks ?? tasks.length} />
          <Metric icon={<ClipboardList size={18} />} label="To do" value={summary?.todo_tasks ?? 0} />
          <Metric icon={<CheckCircle2 size={18} />} label="Completed" value={summary?.completed_tasks ?? 0} />
          <Metric icon={<UsersRound size={18} />} label="Members" value={members.length} />
        </section>
        <TaskForm form={form} members={members} setForm={setForm} createTask={createTask} />
      </div>
      <TaskList isAdmin tasks={tasks} compact />
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TaskForm({
  form,
  members,
  setForm,
  createTask,
}: {
  form: typeof emptyForm;
  members: AppUser[];
  setForm: (form: typeof emptyForm) => void;
  createTask: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="task-form" onSubmit={createTask}>
      <div className="section-title">
        <Plus size={18} />
        <h2>Create task</h2>
      </div>
      <label>
        Title
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
      </label>
      <label>
        Assign to
        <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} required>
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Priority
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label>
          Start
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <label>
          Due
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
        </label>
      </div>
      <button className="primary-button" type="submit">
        Create task
      </button>
    </form>
  );
}

function TaskList({
  isAdmin,
  tasks,
  compact = false,
  completeTask,
}: {
  isAdmin: boolean;
  tasks: Task[];
  compact?: boolean;
  completeTask?: (taskId: number) => void;
}) {
  return (
    <section className="task-list">
      <div className="section-title">
        <ClipboardList size={18} />
        <h2>{isAdmin ? "All tasks" : "Assigned tasks"}</h2>
      </div>
      <div className={compact ? "cards compact" : "cards"}>
        {tasks.map((task) => (
          <article className="task-card" key={task.id}>
            <div className="card-header">
              <h3>{task.title}</h3>
              <span className={`status ${task.status.toLowerCase()}`}>{task.status.replace("_", " ")}</span>
            </div>
            <p>{task.description || "No description"}</p>
            <div className="meta">
              <span>{task.assigned_to_detail.full_name}</span>
              <span>{task.priority}</span>
              <span>Due {formatDate(task.due_date)}</span>
            </div>
            {completeTask && task.status !== "COMPLETED" && (
              <button className="secondary-button" onClick={() => completeTask(task.id)}>
                <CheckCircle2 size={16} />
                Complete
              </button>
            )}
          </article>
        ))}
        {!tasks.length && <p className="muted">No tasks yet.</p>}
      </div>
    </section>
  );
}

function CalendarView({ days }: { days: ReturnType<typeof buildCalendar> }) {
  return (
    <section className="calendar-section">
      <div className="section-title">
        <CalendarDays size={18} />
        <h2>Calendar</h2>
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <div className="day-cell" key={day.date}>
            <strong>{day.label}</strong>
            {day.tasks.map((task) => (
              <span className={`calendar-task ${task.priority.toLowerCase()}`} key={task.id}>
                {task.title}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationView({
  notifications,
  markRead,
  markAllRead,
}: {
  notifications: Notification[];
  markRead: (notificationId: number) => void;
  markAllRead: () => void;
}) {
  return (
    <section className="notification-section">
      <div className="section-title split">
        <span>
          <Bell size={18} />
          <h2>Notifications</h2>
        </span>
        <button className="secondary-button" onClick={markAllRead} disabled={!notifications.some((item) => !item.read_at)}>
          Mark all read
        </button>
      </div>
      <div className="cards">
        {notifications.map((notification) => (
          <article className={notification.read_at ? "notification-card" : "notification-card unread"} key={notification.id}>
            <div>
              <h3>{notification.title}</h3>
              <p>{notification.message}</p>
              <span>{formatDateTime(notification.created_at)}</span>
            </div>
            {!notification.read_at && (
              <button className="secondary-button" onClick={() => markRead(notification.id)}>
                Mark read
              </button>
            )}
          </article>
        ))}
        {!notifications.length && <p className="muted">No notifications yet.</p>}
      </div>
    </section>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function buildCalendar(tasks: Task[]) {
  const today = new Date();
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = toLocalDateInputValue(date);
    return {
      date: iso,
      label: index === 0 ? "Today" : formatDate(iso),
      tasks: tasks.filter((task) => task.due_date === iso),
    };
  });
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

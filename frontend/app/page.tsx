"use client";

import { CalendarDays, CheckCircle2, ClipboardList, LogOut, Plus, UserRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "./services/api";
import type { AppUser, Task } from "./services/types";

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
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<AppUser>("/auth/me/");
        setUser(me);
        await refreshData();
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function refreshData() {
    const [memberData, taskData] = await Promise.all([
      api<AppUser[]>("/auth/members/"),
      api<Task[]>("/tasks/"),
    ]);
    setMembers(memberData);
    setTasks(taskData);
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
      await refreshData();
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
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task creation failed");
    }
  }

  async function completeTask(taskId: number) {
    await api<Task>(`/tasks/${taskId}/complete/`, { method: "POST" });
    await refreshData();
  }

  function logout() {
    clearToken();
    setUser(null);
    setTasks([]);
    setMembers([]);
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
          <h1>{isAdmin ? "Admin workspace" : "My tasks"}</h1>
        </div>
        <div className="account">
          <UserRound size={18} />
          <span>{user.full_name}</span>
          <button className="icon-button" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="workspace">
        {isAdmin && (
          <form className="task-form" onSubmit={createTask}>
            <div className="section-title">
              <Plus size={18} />
              <h2>Create task</h2>
            </div>
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={4} />
            </label>
            <label>
              Assign to
              <select value={form.assigned_to} onChange={(e) => setForm({...form, assigned_to: e.target.value})} required>
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.full_name}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Priority
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>
              <label>
                Start
                <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
              </label>
              <label>
                Due
                <input type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} required />
              </label>
            </div>
            <button className="primary-button" type="submit">Create task</button>
          </form>
        )}

        <section className="task-list">
          <div className="section-title">
            <ClipboardList size={18} />
            <h2>{isAdmin ? "All tasks" : "Assigned tasks"}</h2>
          </div>
          <div className="cards">
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
                {task.status !== "COMPLETED" && (
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
      </section>

      <section className="calendar-section">
        <div className="section-title">
          <CalendarDays size={18} />
          <h2>Calendar</h2>
        </div>
        <div className="calendar-grid">
          {calendarDays.map((day) => (
            <div className="day-cell" key={day.date}>
              <strong>{day.label}</strong>
              {day.tasks.map((task) => (
                <span className={`calendar-task ${task.priority.toLowerCase()}`} key={task.id}>{task.title}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function buildCalendar(tasks: Task[]) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = toLocalDateInputValue(date);
    return {
      date: iso,
      label: index === 0 ? "Today" : formatDate(iso),
      tasks: tasks.filter((task) => task.due_date === iso),
    };
  });
  return days;
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FolderKanban,
  LogOut,
  Plus,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type React from "react";
import { api, clearToken, getToken, setToken } from "./services/api";
import type { AdminSummary, AppUser, Notification, Project, Task, Team } from "./services/types";

type View = "dashboard" | "staff" | "tasks" | "calendar" | "notifications";

const emptyTaskForm = {
  title: "",
  description: "",
  project: "",
  assigned_to: "",
  priority: "MEDIUM",
  start_date: "",
  due_date: "",
};

const emptyTeamForm = { name: "", lead: "", members: [] as string[] };
const emptyProjectForm = { name: "", description: "", team: "", start_date: "", due_date: "" };
const emptyStaffForm = { first_name: "", last_name: "", email: "", role: "MEMBER" };
const emptyStaffEditForm = { first_name: "", last_name: "", email: "", role: "MEMBER", is_active: true };

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [view, setView] = useState<View>("tasks");
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "ADMIN";
  const isTL = user?.role === "TL";
  const canManage = isAdmin || isTL;
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
        setView(me.role === "MEMBER" ? "tasks" : "dashboard");
        await refreshData(me);
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function refreshData(currentUser = user) {
    const [taskData, notificationData] = await Promise.all([api<Task[]>("/tasks/"), api<Notification[]>("/notifications/")]);
    setTasks(taskData);
    setNotifications(notificationData);

    if (currentUser?.role === "ADMIN" || currentUser?.role === "TL") {
      const [userData, projectData] = await Promise.all([api<AppUser[]>("/auth/members/"), api<Project[]>("/projects/")]);
      setUsers(userData);
      setProjects(projectData);
    }
    if (currentUser?.role === "ADMIN") {
      const [teamData, summaryData] = await Promise.all([api<Team[]>("/teams/"), api<AdminSummary>("/admin/summary/")]);
      setTeams(teamData);
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
      setView(result.user.role === "MEMBER" ? "tasks" : "dashboard");
      await refreshData(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await api<Team>("/teams/", {
        method: "POST",
        body: JSON.stringify({
          name: teamForm.name,
          lead: Number(teamForm.lead),
          members: teamForm.members.map(Number),
        }),
      });
      setTeamForm(emptyTeamForm);
      await refreshData();
    }, "Team creation failed");
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await api<AppUser>("/auth/users/", {
        method: "POST",
        body: JSON.stringify(staffForm),
      });
      setStaffForm(emptyStaffForm);
      await refreshData();
    }, "Staff creation failed");
  }

  async function updateStaff(staffId: number, form: typeof emptyStaffEditForm) {
    await runAction(async () => {
      await api<AppUser>(`/auth/users/${staffId}/`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await refreshData();
    }, "Staff update failed");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await api<Project>("/projects/", {
        method: "POST",
        body: JSON.stringify({
          ...projectForm,
          team: Number(projectForm.team),
          start_date: projectForm.start_date || null,
          due_date: projectForm.due_date || null,
        }),
      });
      setProjectForm(emptyProjectForm);
      await refreshData();
    }, "Project creation failed");
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await api<Task>("/tasks/", {
        method: "POST",
        body: JSON.stringify({
          ...taskForm,
          project: taskForm.project ? Number(taskForm.project) : null,
          assigned_to: Number(taskForm.assigned_to),
          start_date: taskForm.start_date || null,
        }),
      });
      setTaskForm(emptyTaskForm);
      await refreshData();
    }, "Task creation failed");
  }

  async function updateStatus(taskId: number, status: Task["status"]) {
    await runAction(async () => {
      await api<Task>(`/tasks/${taskId}/set_status/`, { method: "POST", body: JSON.stringify({ status }) });
      await refreshData();
    }, "Status update failed");
  }

  async function markNotificationRead(notificationId: number) {
    await api<Notification>(`/notifications/${notificationId}/mark_read/`, { method: "POST" });
    await refreshData();
  }

  async function markAllNotificationsRead() {
    await api<{ detail: string }>("/notifications/mark_all_read/", { method: "POST" });
    await refreshData();
  }

  async function runAction(action: () => Promise<void>, fallback: string) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    }
  }

  function logout() {
    clearToken();
    setUser(null);
    setUsers([]);
    setTeams([]);
    setProjects([]);
    setTasks([]);
    setNotifications([]);
    setSummary(null);
    setView("tasks");
  }

  const calendarDays = useMemo(() => buildCalendar(tasks), [tasks]);

  if (loading) return <main className="shell center">Loading...</main>;

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Company Task Manager</p>
            <h1>Company staff sign-in</h1>
            <p className="muted">Only accounts added by the admin can access this workspace.</p>
          </div>
          <GoogleLogin onSuccess={(response) => handleGoogleLogin(response.credential)} onError={() => setError("Google login failed")} />
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
          <h1>{isAdmin ? "Admin control" : isTL ? "TL workspace" : "Member workspace"}</h1>
        </div>
        <div className="account">
          <UserRound size={18} />
          <span>{user.full_name}</span>
          <strong>{user.role}</strong>
          <button className="icon-button" onClick={logout} aria-label="Logout" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="app-tabs" aria-label="Application views">
        {canManage && (
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <ShieldCheck size={16} />
            Workspace
          </button>
        )}
        {isAdmin && (
          <button className={view === "staff" ? "active" : ""} onClick={() => setView("staff")}>
            <UserPlus size={16} />
            Staff
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

      {view === "dashboard" && isAdmin && (
        <AdminDashboard
          users={users}
          teams={teams}
          projects={projects}
          tasks={tasks}
          summary={summary}
          teamForm={teamForm}
          projectForm={projectForm}
          taskForm={taskForm}
          setTeamForm={setTeamForm}
          setProjectForm={setProjectForm}
          setTaskForm={setTaskForm}
          createTeam={createTeam}
          createProject={createProject}
          createTask={createTask}
          updateStatus={updateStatus}
        />
      )}

      {view === "staff" && isAdmin && (
        <StaffAdminPage
          users={users}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          createStaff={createStaff}
          updateStaff={updateStaff}
        />
      )}

      {view === "dashboard" && isTL && (
        <TLDashboard
          users={users}
          projects={projects}
          tasks={tasks}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          createTask={createTask}
          updateStatus={updateStatus}
        />
      )}

      {view === "tasks" && <TaskList tasks={tasks} canUpdateStatus={true} updateStatus={updateStatus} />}
      {view === "calendar" && <CalendarView days={calendarDays} />}
      {view === "notifications" && (
        <NotificationView notifications={notifications} markRead={markNotificationRead} markAllRead={markAllNotificationsRead} />
      )}
    </main>
  );
}

function AdminDashboard(props: {
  users: AppUser[];
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  summary: AdminSummary | null;
  teamForm: typeof emptyTeamForm;
  projectForm: typeof emptyProjectForm;
  taskForm: typeof emptyTaskForm;
  setTeamForm: (form: typeof emptyTeamForm) => void;
  setProjectForm: (form: typeof emptyProjectForm) => void;
  setTaskForm: (form: typeof emptyTaskForm) => void;
  createTeam: (event: FormEvent<HTMLFormElement>) => void;
  createProject: (event: FormEvent<HTMLFormElement>) => void;
  createTask: (event: FormEvent<HTMLFormElement>) => void;
  updateStatus: (taskId: number, status: Task["status"]) => void;
}) {
  const tls = props.users.filter((item) => item.role === "TL");
  const members = props.users.filter((item) => item.role === "MEMBER");
  const selectedProject = props.projects.find((project) => String(project.id) === props.taskForm.project);
  const tlOptions = selectedProject ? [selectedProject.team_detail.lead_detail] : tls;

  return (
    <section className="dashboard-grid">
      <div className="admin-stack">
        <section className="summary-grid">
          <Metric icon={<BarChart3 size={18} />} label="Total" value={props.summary?.total_tasks ?? props.tasks.length} />
          <Metric icon={<ClipboardList size={18} />} label="To do" value={props.summary?.todo_tasks ?? 0} />
          <Metric icon={<CheckCircle2 size={18} />} label="Completed" value={props.summary?.completed_tasks ?? 0} />
          <Metric icon={<UsersRound size={18} />} label="Members" value={members.length} />
        </section>
        <TeamForm users={members} tls={tls} form={props.teamForm} setForm={props.setTeamForm} onSubmit={props.createTeam} />
      </div>
      <div className="admin-stack">
        <ProjectForm teams={props.teams} form={props.projectForm} setForm={props.setProjectForm} onSubmit={props.createProject} />
        <TaskForm
          title="Assign project task to TL"
          assigneeLabel="Team lead"
          projects={props.projects}
          assignees={tlOptions}
          form={props.taskForm}
          setForm={props.setTaskForm}
          onSubmit={props.createTask}
        />
      </div>
      <TaskList tasks={props.tasks} canUpdateStatus updateStatus={props.updateStatus} compact />
    </section>
  );
}

function StaffAdminPage({
  users,
  staffForm,
  setStaffForm,
  createStaff,
  updateStaff,
}: {
  users: AppUser[];
  staffForm: typeof emptyStaffForm;
  setStaffForm: (form: typeof emptyStaffForm) => void;
  createStaff: (event: FormEvent<HTMLFormElement>) => void;
  updateStaff: (staffId: number, form: typeof emptyStaffEditForm) => Promise<void>;
}) {
  return (
    <section className="staff-page">
      <StaffForm form={staffForm} setForm={setStaffForm} onSubmit={createStaff} />
      <StaffList users={users} updateStaff={updateStaff} />
    </section>
  );
}

function StaffList({
  users,
  updateStaff,
}: {
  users: AppUser[];
  updateStaff: (staffId: number, form: typeof emptyStaffEditForm) => Promise<void>;
}) {
  const editableUsers = users.filter((staff) => staff.role !== "ADMIN");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyStaffEditForm);

  function startEdit(staff: AppUser) {
    setEditingId(staff.id);
    setEditForm({
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      role: staff.role === "TL" ? "TL" : "MEMBER",
      is_active: staff.is_active,
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    await updateStaff(editingId, editForm);
    setEditingId(null);
  }

  return (
    <section className="staff-list">
      <div className="section-title">
        <Edit3 size={18} />
        <h2>Edit staff</h2>
      </div>
      <div className="cards">
        {editableUsers.map((staff) => (
          <article className="staff-card" key={staff.id}>
            {editingId === staff.id ? (
              <form onSubmit={saveEdit}>
                <div className="form-grid">
                  <label>
                    First name
                    <input value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} required />
                  </label>
                  <label>
                    Last name
                    <input value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} />
                  </label>
                </div>
                <label>
                  Email
                  <input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} required />
                </label>
                <div className="form-grid">
                  <label>
                    Role
                    <select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>
                      <option value="MEMBER">Member</option>
                      <option value="TL">TL</option>
                    </select>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(event) => setEditForm({ ...editForm, is_active: event.target.checked })}
                    />
                    Active
                  </label>
                </div>
                <div className="status-actions">
                  <button className="primary-button compact-button" type="submit">
                    Save
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <h3>{staff.full_name}</h3>
                  <p>{staff.email}</p>
                  <div className="meta">
                    <span>{staff.role}</span>
                    <span>{staff.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                <button className="icon-button" onClick={() => startEdit(staff)} aria-label={`Edit ${staff.full_name}`} title="Edit staff">
                  <Edit3 size={16} />
                </button>
              </>
            )}
          </article>
        ))}
        {!editableUsers.length && <p className="muted">No staff added yet.</p>}
      </div>
    </section>
  );
}

function StaffForm({
  form,
  setForm,
  onSubmit,
}: {
  form: typeof emptyStaffForm;
  setForm: (form: typeof emptyStaffForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="task-form" onSubmit={onSubmit}>
      <div className="section-title">
        <UserPlus size={18} />
        <h2>Add staff</h2>
      </div>
      <div className="form-grid">
        <label>
          First name
          <input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required />
        </label>
        <label>
          Last name
          <input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
        </label>
      </div>
      <label>
        Company email
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </label>
      <label>
        Role
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="MEMBER">Member</option>
          <option value="TL">TL</option>
        </select>
      </label>
      <button className="primary-button" type="submit">
        Add staff
      </button>
    </form>
  );
}

function TLDashboard(props: {
  users: AppUser[];
  projects: Project[];
  tasks: Task[];
  taskForm: typeof emptyTaskForm;
  setTaskForm: (form: typeof emptyTaskForm) => void;
  createTask: (event: FormEvent<HTMLFormElement>) => void;
  updateStatus: (taskId: number, status: Task["status"]) => void;
}) {
  const selectedProject = props.projects.find((project) => String(project.id) === props.taskForm.project);
  const memberOptions = selectedProject ? selectedProject.team_detail.members_detail : props.users;

  return (
    <section className="workspace">
      <TaskForm
        title="Assign task to team member"
        assigneeLabel="Team member"
        projects={props.projects}
        assignees={memberOptions}
        form={props.taskForm}
        setForm={props.setTaskForm}
        onSubmit={props.createTask}
      />
      <TaskList tasks={props.tasks} canUpdateStatus updateStatus={props.updateStatus} compact />
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

function TeamForm({
  users,
  tls,
  form,
  setForm,
  onSubmit,
}: {
  users: AppUser[];
  tls: AppUser[];
  form: typeof emptyTeamForm;
  setForm: (form: typeof emptyTeamForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="task-form" onSubmit={onSubmit}>
      <div className="section-title">
        <UsersRound size={18} />
        <h2>Create team</h2>
      </div>
      <label>
        Team name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label>
        TL
        <select value={form.lead} onChange={(event) => setForm({ ...form, lead: event.target.value })} required>
          <option value="">Select TL</option>
          {tls.map((tl) => (
            <option key={tl.id} value={tl.id}>
              {tl.full_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Team members
        <span className="field-hint">{form.members.length} selected, minimum 4</span>
      </label>
      <div className="member-picker">
        {users.map((member) => {
          const memberId = String(member.id);
          const checked = form.members.includes(memberId);
          return (
            <label className="member-option" key={member.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const nextMembers = event.target.checked
                    ? [...form.members, memberId]
                    : form.members.filter((selectedId) => selectedId !== memberId);
                  setForm({ ...form, members: nextMembers });
                }}
              />
              <span>
                <strong>{member.full_name}</strong>
                <small>{member.email}</small>
              </span>
            </label>
          );
        })}
        {!users.length && <p className="muted">Add member staff before creating a team.</p>}
      </div>
      <button className="primary-button" type="submit">
        Create team
      </button>
    </form>
  );
}

function ProjectForm({
  teams,
  form,
  setForm,
  onSubmit,
}: {
  teams: Team[];
  form: typeof emptyProjectForm;
  setForm: (form: typeof emptyProjectForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="task-form" onSubmit={onSubmit}>
      <div className="section-title">
        <FolderKanban size={18} />
        <h2>Create project</h2>
      </div>
      <label>
        Project name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label>
        Team
        <select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} required>
          <option value="">Select team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} - {team.lead_detail.full_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
      </label>
      <div className="form-grid">
        <label>
          Start
          <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        </label>
        <label>
          Due
          <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
        </label>
      </div>
      <button className="primary-button" type="submit">
        Create project
      </button>
    </form>
  );
}

function TaskForm({
  title,
  assigneeLabel,
  projects,
  assignees,
  form,
  setForm,
  onSubmit,
}: {
  title: string;
  assigneeLabel: string;
  projects: Project[];
  assignees: AppUser[];
  form: typeof emptyTaskForm;
  setForm: (form: typeof emptyTaskForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="task-form" onSubmit={onSubmit}>
      <div className="section-title">
        <Plus size={18} />
        <h2>{title}</h2>
      </div>
      <label>
        Title
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </label>
      <label>
        Project
        <select value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value, assigned_to: "" })} required>
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {assigneeLabel}
        <select value={form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} required>
          <option value="">Select user</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.full_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
      </label>
      <div className="form-grid">
        <label>
          Priority
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label>
          Start
          <input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
        </label>
        <label>
          Due
          <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} required />
        </label>
      </div>
      <button className="primary-button" type="submit">
        Assign task
      </button>
    </form>
  );
}

function TaskList({
  tasks,
  canUpdateStatus,
  compact = false,
  updateStatus,
}: {
  tasks: Task[];
  canUpdateStatus: boolean;
  compact?: boolean;
  updateStatus: (taskId: number, status: Task["status"]) => void;
}) {
  return (
    <section className="task-list">
      <div className="section-title">
        <ClipboardList size={18} />
        <h2>Tasks</h2>
      </div>
      <div className={compact ? "cards compact" : "cards"}>
        {tasks.map((task) => (
          <article className="task-card" key={task.id}>
            <div className="card-header">
              <div>
                <h3>{task.title}</h3>
                <span className="project-name">{task.project_detail?.name ?? "No project"}</span>
              </div>
              <span className={`status ${task.status.toLowerCase()}`}>{task.status.replace("_", " ")}</span>
            </div>
            <StatusBar status={task.status} />
            <p>{task.description || "No description"}</p>
            <div className="meta">
              <span>{task.assigned_to_detail.full_name}</span>
              <span>{task.priority}</span>
              <span>Due {formatDate(task.due_date)}</span>
            </div>
            {canUpdateStatus && (
              <div className="status-actions">
                <button className="secondary-button" onClick={() => updateStatus(task.id, "TODO")} disabled={task.status === "TODO"}>
                  Not completed
                </button>
                <button className="secondary-button" onClick={() => updateStatus(task.id, "IN_PROGRESS")} disabled={task.status === "IN_PROGRESS"}>
                  Processing
                </button>
                <button className="secondary-button" onClick={() => updateStatus(task.id, "COMPLETED")} disabled={task.status === "COMPLETED"}>
                  Completed
                </button>
              </div>
            )}
          </article>
        ))}
        {!tasks.length && <p className="muted">No tasks yet.</p>}
      </div>
    </section>
  );
}

function StatusBar({ status }: { status: Task["status"] }) {
  const progress = status === "COMPLETED" ? 100 : status === "IN_PROGRESS" ? 55 : 12;
  return (
    <div className="progress-track" aria-label={`Status ${status}`}>
      <span className={`progress-fill ${status.toLowerCase()}`} style={{ width: `${progress}%` }} />
    </div>
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

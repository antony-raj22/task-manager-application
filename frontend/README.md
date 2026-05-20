# Frontend Documentation

Next.js frontend for the Task Manager Application.

## Frontend Features

- Google login
- Company-only access messaging
- Admin workspace
- Separate Admin Staff page
- Add and edit TL/Member staff
- Team creation with checkbox member selection
- Project creation
- Admin task assignment to TLs
- TL task assignment to team members
- Task status controls
- Task progress bars
- Calendar view
- Notifications view

## Setup

```powershell
cd frontend
npm install
```

## Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Run Development Server

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Build

```powershell
npm.cmd run build
```

## App Pages

### Login

Users sign in with Google.

Only users already added by Admin can access the app.

### Admin: Staff

Admin can:

- Add staff
- Select role: `TL` or `Member`
- Edit name, email, role, and active status

### Admin: Workspace

Admin can:

- Create teams
- Select one TL
- Select 4 or more members using checkboxes
- Create projects
- Assign project tasks to TLs

### TL Workspace

TL can:

- View assigned team projects
- Assign tasks to team members
- Update task status

### Tasks

Tasks show:

- Project name
- Assignee
- Priority
- Due date
- Status badge
- Progress bar
- Status action buttons

Statuses:

```text
TODO          Not completed
IN_PROGRESS   Processing
COMPLETED     Completed
```

### Calendar

Shows tasks by due date for the next 14 days.

### Notifications

Shows task assignment/completion notifications and supports marking notifications as read.

## Common Commands

```powershell
npm install
npm.cmd run dev
npm.cmd run build
```

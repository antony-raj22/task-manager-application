# Task Manager Application

A full-stack company task management system built with Django REST Framework, MySQL, and Next.js.

The app supports company-only Google login, role-based work assignment, team/project management, task status tracking, calendar views, notifications, and email alerts.

## Features

- Company staff login with Google OAuth
- Admin-controlled staff access
- Admin, TL, and Member roles
- Admin can add and edit staff from the frontend
- Admin can create teams with a TL and 4 or more members
- Admin can create projects for teams
- Admin can assign project tasks to TLs
- TL can assign project tasks to team members
- Members can view assigned tasks
- Task status tracking: Not completed, Processing, Completed
- Progress bar on task cards
- Calendar view for due dates
- In-app notifications
- Gmail SMTP email notifications for assigned/completed tasks
- Django admin panel for database administration

## Tech Stack

```text
Backend:   Django, Django REST Framework, MySQL
Frontend:  Next.js, React, TypeScript
Auth:      Google OAuth + Django token auth
Email:     Gmail SMTP
```

## Project Structure

```text
backend/   Django API, auth, tasks, teams, projects, notifications
frontend/  Next.js web application
```

## Roles And Workflow

### Admin

- Logs in with an approved company Google account.
- Adds staff users in the frontend Staff page.
- Assigns each staff user as `TL` or `Member`.
- Creates teams by selecting one TL and at least 4 members.
- Creates projects for teams.
- Assigns project-level tasks to TLs.
- Can update task status and view all tasks.

### TL

- Logs in after Admin creates the TL account.
- Sees projects for teams they lead.
- Assigns project tasks to members in their team.
- Updates task status.

### Member

- Logs in after Admin creates the Member account.
- Views assigned tasks.
- Updates task status.
- Receives notifications and email alerts.

## Main URLs

```text
Frontend:      http://localhost:3000
Backend API:   http://127.0.0.1:8000/api/
Django admin:  http://127.0.0.1:8000/admin/
```

The backend root URL `http://127.0.0.1:8000/` is not a page, so a 404 there is normal.

## Quick Start

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 2. Frontend

```powershell
cd frontend
npm install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Environment Configuration

Create `backend/.env` and configure database, Google OAuth, and email settings.

Example:

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

MYSQL_DATABASE=task_manager
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=Task Manager <your-email@gmail.com>
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Do not commit real `.env` or `.env.local` secrets to GitHub.

## Database Setup

Create the MySQL database before running migrations:

```sql
CREATE DATABASE task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
```

## Google Login Access

Only users already created by Admin can log in.

If a Google account is not added in the app first, login is denied with:

```text
Access denied. Ask the admin to add your company account first.
```

This keeps the site limited to company staff.

## Staff Management

After logging in as Admin:

1. Open the `Staff` tab.
2. Use `Add staff` to create a TL or Member.
3. Use `Edit staff` to update name, email, role, or active status.
4. The staff user can then log in with Google using that same email address.

## Team And Project Management

After adding staff:

1. Open the `Workspace` tab.
2. Create a team.
3. Select one TL.
4. Select at least 4 team members.
5. Create a project for that team.
6. Assign project tasks to the TL.
7. TL assigns tasks to team members.

## Email Notifications

The backend sends task notification emails when SMTP is configured.

For Gmail:

1. Enable 2-Step Verification in Google Account.
2. Create a Gmail App Password.
3. Store the 16-character app password in `EMAIL_HOST_PASSWORD`.
4. Restart Django after changing `.env`.

Test email from Django:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py shell -c "from django.core.mail import send_mail; print(send_mail('Task Manager test email', 'Test email from Django.', None, ['your-email@gmail.com'], fail_silently=False))"
```

If the output is `1`, email was sent.

## API Summary

```text
POST /api/auth/google/              Google login
GET  /api/auth/me/                  Current user
GET  /api/auth/members/             Staff list for assignment
POST /api/auth/users/               Admin creates staff
PATCH /api/auth/users/<id>/         Admin edits staff

GET  /api/teams/                    Admin lists teams
POST /api/teams/                    Admin creates team

GET  /api/projects/                 Admin/TL lists visible projects
POST /api/projects/                 Admin creates project

GET  /api/tasks/                    List visible tasks
POST /api/tasks/                    Admin/TL creates task
POST /api/tasks/<id>/set_status/    Update task status
POST /api/tasks/<id>/complete/      Mark task completed

GET  /api/calendar/                 Calendar tasks
GET  /api/notifications/            User notifications
POST /api/notifications/<id>/mark_read/
POST /api/notifications/mark_all_read/
GET  /api/admin/summary/            Admin dashboard summary
```

## Verification Commands

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py check
```

Frontend:

```powershell
cd frontend
npm.cmd run build
```

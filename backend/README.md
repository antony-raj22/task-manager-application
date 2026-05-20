# Backend Documentation

Django REST Framework backend for the Task Manager Application.

## Backend Features

- Google OAuth login validation
- Company-only login for approved users
- Token authentication
- Admin, TL, and Member roles
- Staff create/edit APIs
- Team and project APIs
- Task assignment and status APIs
- Calendar API
- In-app notification API
- Gmail SMTP task email notifications

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Environment

Create `backend/.env`:

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

## Database

Create the MySQL database:

```sql
CREATE DATABASE task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run migrations:

```powershell
python manage.py migrate
```

Create admin:

```powershell
python manage.py createsuperuser
```

Run backend:

```powershell
python manage.py runserver
```

API:

```text
http://127.0.0.1:8000/api/
```

Django admin:

```text
http://127.0.0.1:8000/admin/
```

## Roles

### Admin

Admin users are Django superusers, staff users, or users with profile role `ADMIN`.

Admin can:

- Add/edit staff
- Create teams
- Create projects
- Assign tasks to TLs
- View all tasks
- Update task status

### TL

TL users have profile role `TL`.

TL can:

- View projects for teams they lead
- Assign tasks to members in their team
- Update task status

### Member

Member users have profile role `MEMBER`.

Member can:

- View assigned tasks
- Update task status
- View notifications

## Company-Only Login

Google login does not auto-create users.

The user must already exist in Django and be active. If not, login returns `403`.

Admin should add staff from the frontend Staff tab or Django admin before the user logs in.

## Teams

Teams require:

- One TL
- At least 4 members
- Only users with role `MEMBER` can be selected as members

## Email Notifications

Task assignment and completion notifications are saved in the app. When SMTP is configured, the backend also sends email.

For Gmail, use a Google App Password, not the normal Gmail password.

Run a test:

```powershell
python manage.py shell -c "from django.core.mail import send_mail; print(send_mail('Task Manager test email', 'Test email from Django.', None, ['your-email@gmail.com'], fail_silently=False))"
```

Expected success:

```text
1
```

## Important Endpoints

```text
POST /api/auth/google/
GET  /api/auth/me/
GET  /api/auth/members/
POST /api/auth/users/
PATCH /api/auth/users/<id>/

GET  /api/teams/
POST /api/teams/

GET  /api/projects/
POST /api/projects/

GET  /api/tasks/
POST /api/tasks/
POST /api/tasks/<id>/set_status/
POST /api/tasks/<id>/complete/

GET  /api/calendar/
GET  /api/notifications/
GET  /api/admin/summary/
```

## Check Backend

```powershell
python manage.py check
```

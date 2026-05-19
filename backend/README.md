# Backend Setup

## 1. Create environment

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Configure MySQL and Google OAuth

Copy `.env.example` to `.env` and update the values.

```powershell
copy .env.example .env
```

Create the MySQL database:

```sql
CREATE DATABASE task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Run migrations and server

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000/api/`.

## SMTP Notifications

Task assignment and completion notifications are saved inside the app. If SMTP values are configured in `.env`, the app also sends email notifications.

For Gmail, create an app password and set:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Task Manager <your-email@gmail.com>
```

## Roles

- A Django superuser or staff user is treated as an admin.
- Admin users can create, update, delete, and assign tasks.
- Members can view their assigned tasks and mark them completed.

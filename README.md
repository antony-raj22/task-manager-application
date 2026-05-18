# Task Manager Application

Full-stack task management application with:

- Django REST Framework backend
- MySQL database
- Google authentication
- Next.js frontend
- Admin task creation and assignment
- Member task completion
- Calendar view for due dates

## Project Structure

```text
backend/   Django API
frontend/  Next.js web application
```

See `backend/README.md` and `frontend/README.md` for setup instructions.

## Quick Start

1. Configure and run the Django API in `backend/`.
2. Configure and run the Next.js app in `frontend/`.
3. Create a Django superuser. Superusers and staff users can create and assign tasks.
4. Members sign in with Google, view assigned tasks, complete tasks, and see due dates in the calendar.

## API Summary

- `POST /api/auth/google/` logs in with a Google ID token.
- `GET /api/auth/me/` returns the current user.
- `GET /api/auth/members/` returns users for assignment.
- `GET /api/tasks/` lists visible tasks.
- `POST /api/tasks/` creates a task as admin.
- `POST /api/tasks/{id}/complete/` marks a task complete.
- `GET /api/calendar/` returns tasks for the calendar.

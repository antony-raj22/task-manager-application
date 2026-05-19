from django.contrib import admin

from .models import Notification, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assigned_to", "created_by", "status", "priority", "due_date")
    list_filter = ("status", "priority", "due_date")
    search_fields = ("title", "description", "assigned_to__email", "created_by__email")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "actor", "kind", "read_at", "created_at")
    list_filter = ("kind", "read_at", "created_at")
    search_fields = ("title", "message", "recipient__email", "actor__email")

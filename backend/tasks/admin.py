from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assigned_to", "created_by", "status", "priority", "due_date")
    list_filter = ("status", "priority", "due_date")
    search_fields = ("title", "description", "assigned_to__email", "created_by__email")

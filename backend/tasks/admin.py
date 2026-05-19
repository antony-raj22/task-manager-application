from django.contrib import admin

from .models import Notification, Project, Task, Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "lead", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "lead__email", "lead__username", "members__email")
    filter_horizontal = ("members",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "team", "created_by", "start_date", "due_date")
    list_filter = ("team", "start_date", "due_date")
    search_fields = ("name", "description", "team__name", "team__lead__email")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "assigned_to", "created_by", "status", "priority", "due_date")
    list_filter = ("status", "priority", "project", "due_date")
    search_fields = ("title", "description", "project__name", "assigned_to__email", "created_by__email")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "recipient", "actor", "kind", "read_at", "created_at")
    list_filter = ("kind", "read_at", "created_at")
    search_fields = ("title", "message", "recipient__email", "actor__email")

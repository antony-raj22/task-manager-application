from django.db.models import Count
from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from .models import Notification, Project, Task, Team
from .permissions import (
    IsAdminOrAssignedReadOnly,
    IsAdminUserRole,
    IsAdminWriteAdminOrTLRead,
    can_manage_work,
    is_admin_user,
    is_tl_user,
)
from .serializers import NotificationSerializer, ProjectSerializer, TaskSerializer, TeamSerializer
from .services import create_notification


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return Team.objects.select_related("lead").prefetch_related("members")


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminWriteAdminOrTLRead]

    def get_queryset(self):
        queryset = Project.objects.select_related("team", "team__lead", "created_by").prefetch_related("team__members")
        if is_admin_user(self.request.user):
            return queryset
        return queryset.filter(team__lead=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAdminOrAssignedReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.select_related("assigned_to", "created_by", "project", "project__team", "project__team__lead")
        if is_admin_user(user):
            return queryset
        if is_tl_user(user):
            return queryset.filter(project__team__lead=user) | queryset.filter(assigned_to=user) | queryset.filter(created_by=user)
        return queryset.filter(assigned_to=user)

    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        create_notification(
            recipient=task.assigned_to,
            actor=self.request.user,
            task=task,
            kind=Notification.Kind.TASK_ASSIGNED,
            title=f"New task assigned: {task.title}",
            message=f"{self.request.user.get_full_name() or self.request.user.username} assigned you a task due on {task.due_date}.",
        )

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def set_status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Task.Status.values:
            return response.Response({"detail": "Invalid task status."}, status=status.HTTP_400_BAD_REQUEST)
        if not can_manage_work(request.user) and task.assigned_to_id != request.user.id:
            return response.Response({"detail": "You cannot update this task."}, status=status.HTTP_403_FORBIDDEN)

        task.status = new_status
        task.completed_at = timezone.now() if new_status == Task.Status.COMPLETED else None
        task.save(update_fields=["status", "completed_at", "updated_at"])
        return response.Response(TaskSerializer(task, context={"request": request}).data)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        task = self.get_object()
        if not is_admin_user(request.user) and task.assigned_to_id != request.user.id:
            return response.Response({"detail": "Only the assigned member can complete this task."}, status=status.HTTP_403_FORBIDDEN)

        task.status = Task.Status.COMPLETED
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
        create_notification(
            recipient=task.created_by,
            actor=request.user,
            task=task,
            kind=Notification.Kind.TASK_COMPLETED,
            title=f"Task completed: {task.title}",
            message=f"{request.user.get_full_name() or request.user.username} completed the task.",
        )
        return response.Response(TaskSerializer(task, context={"request": request}).data)


class CalendarTaskView(APIView):
    def get(self, request):
        queryset = Task.objects.select_related("assigned_to", "created_by")
        if not is_admin_user(request.user):
            queryset = queryset.filter(assigned_to=request.user)

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            queryset = queryset.filter(due_date__gte=start)
        if end:
            queryset = queryset.filter(due_date__lte=end)

        return response.Response(TaskSerializer(queryset, many=True).data)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.select_related("recipient", "actor", "task", "task__assigned_to", "task__created_by").filter(
            recipient=self.request.user
        )

    @decorators.action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return response.Response(NotificationSerializer(notification).data)

    @decorators.action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return response.Response({"detail": "Notifications marked as read."})


class AdminSummaryView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        counts = Task.objects.values("status").annotate(total=Count("id"))
        by_status = {item["status"]: item["total"] for item in counts}
        return response.Response(
            {
                "total_tasks": Task.objects.count(),
                "todo_tasks": by_status.get(Task.Status.TODO, 0),
                "in_progress_tasks": by_status.get(Task.Status.IN_PROGRESS, 0),
                "completed_tasks": by_status.get(Task.Status.COMPLETED, 0),
                "members": Task.objects.values("assigned_to").distinct().count(),
                "unread_notifications": Notification.objects.filter(recipient=request.user, read_at__isnull=True).count(),
            }
        )

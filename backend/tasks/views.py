from django.db.models import Count
from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from .models import Notification, Task
from .permissions import IsAdminOrAssignedReadOnly, IsAdminUserRole, is_admin_user
from .serializers import NotificationSerializer, TaskSerializer
from .services import create_notification


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAdminOrAssignedReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.select_related("assigned_to", "created_by")
        if is_admin_user(user):
            return queryset
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
        return response.Response(TaskSerializer(task).data)


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

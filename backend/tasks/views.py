from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView

from .models import Task
from .permissions import IsAdminOrAssignedReadOnly, is_admin_user
from .serializers import TaskSerializer


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
        serializer.save(created_by=self.request.user)

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def complete(self, request, pk=None):
        task = self.get_object()
        if not is_admin_user(request.user) and task.assigned_to_id != request.user.id:
            return response.Response({"detail": "Only the assigned member can complete this task."}, status=status.HTTP_403_FORBIDDEN)

        task.status = Task.Status.COMPLETED
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
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

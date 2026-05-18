from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source="assigned_to", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "assigned_to",
            "assigned_to_detail",
            "created_by",
            "created_by_detail",
            "status",
            "priority",
            "start_date",
            "due_date",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "completed_at", "created_at", "updated_at")

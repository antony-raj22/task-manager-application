from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Notification, Project, Task, Team
from .permissions import is_admin_user, is_tl_user


def user_role(user):
    if user.is_staff or user.is_superuser:
        return "ADMIN"
    return getattr(getattr(user, "profile", None), "role", "MEMBER")


class TeamSerializer(serializers.ModelSerializer):
    lead_detail = UserSerializer(source="lead", read_only=True)
    members_detail = UserSerializer(source="members", many=True, read_only=True)

    class Meta:
        model = Team
        fields = ("id", "name", "lead", "lead_detail", "members", "members_detail", "created_at")
        read_only_fields = ("created_at",)

    def validate_lead(self, lead):
        if user_role(lead) != "TL":
            raise serializers.ValidationError("Team lead must have TL role.")
        return lead

    def validate_members(self, members):
        if len(members) < 4:
            raise serializers.ValidationError("Select at least 4 members for a team.")
        invalid = [member.email or member.username for member in members if user_role(member) != "MEMBER"]
        if invalid:
            raise serializers.ValidationError(f"Only MEMBER users can be team members: {', '.join(invalid)}")
        return members


class ProjectSerializer(serializers.ModelSerializer):
    team_detail = TeamSerializer(source="team", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "team",
            "team_detail",
            "created_by",
            "created_by_detail",
            "start_date",
            "due_date",
            "created_at",
        )
        read_only_fields = ("created_by", "created_at")


class TaskSerializer(serializers.ModelSerializer):
    project_detail = ProjectSerializer(source="project", read_only=True)
    assigned_to_detail = UserSerializer(source="assigned_to", read_only=True)
    created_by_detail = UserSerializer(source="created_by", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "project",
            "project_detail",
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

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        project = attrs.get("project", getattr(self.instance, "project", None))

        if user and user.is_authenticated and is_admin_user(user):
            if assigned_to and user_role(assigned_to) != "TL":
                raise serializers.ValidationError({"assigned_to": "Admins assign project tasks to TL users only."})
            if project and assigned_to and project.team.lead_id != assigned_to.id:
                raise serializers.ValidationError({"project": "Admin task must be assigned to the selected project's TL."})

        if user and user.is_authenticated and is_tl_user(user):
            if assigned_to and user_role(assigned_to) != "MEMBER":
                raise serializers.ValidationError({"assigned_to": "TL users assign tasks to MEMBER users only."})
            if not project:
                raise serializers.ValidationError({"project": "TL task assignment must be linked to a project."})
            if project.team.lead_id != user.id:
                raise serializers.ValidationError({"project": "You can only assign tasks inside your own team projects."})
            if assigned_to and not project.team.members.filter(id=assigned_to.id).exists():
                raise serializers.ValidationError({"assigned_to": "Member must belong to the selected project team."})

        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source="actor", read_only=True)
    task_detail = TaskSerializer(source="task", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "recipient",
            "actor",
            "actor_detail",
            "task",
            "task_detail",
            "kind",
            "title",
            "message",
            "read_at",
            "created_at",
        )
        read_only_fields = fields

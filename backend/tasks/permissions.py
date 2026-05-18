from rest_framework import permissions


def is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    profile_role = getattr(getattr(user, "profile", None), "role", None)
    return user.is_staff or user.is_superuser or profile_role == "ADMIN"


class IsAdminOrAssignedReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return is_admin_user(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return is_admin_user(request.user) or obj.assigned_to_id == request.user.id
        return is_admin_user(request.user)

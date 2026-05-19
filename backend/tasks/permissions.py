from rest_framework import permissions


def is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    profile_role = getattr(getattr(user, "profile", None), "role", None)
    return user.is_staff or user.is_superuser or profile_role == "ADMIN"


def is_tl_user(user):
    if not user or not user.is_authenticated:
        return False
    profile_role = getattr(getattr(user, "profile", None), "role", None)
    return profile_role == "TL"


def can_manage_work(user):
    return is_admin_user(user) or is_tl_user(user)


class IsAdminOrAssignedReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return can_manage_work(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_manage_work(request.user) or obj.assigned_to_id == request.user.id
        return can_manage_work(request.user)


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_admin_user(request.user)


class IsAdminOrTLRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return can_manage_work(request.user)


class IsAdminWriteAdminOrTLRead(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return can_manage_work(request.user)
        return is_admin_user(request.user)

from django.contrib.auth.models import User
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "full_name", "is_staff", "role")

    def get_role(self, obj):
        if obj.is_staff or obj.is_superuser:
            return "ADMIN"
        return getattr(getattr(obj, "profile", None), "role", "MEMBER")

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

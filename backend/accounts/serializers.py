from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Profile


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "full_name", "is_staff", "is_active", "role")

    def get_role(self, obj):
        if obj.is_staff or obj.is_superuser:
            return "ADMIN"
        return getattr(getattr(obj, "profile", None), "role", "MEMBER")

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class CompanyUserCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=(Profile.Role.TL, Profile.Role.MEMBER), write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "role")
        read_only_fields = ("id", "username")

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A company user with this email already exists.")
        return email

    def create(self, validated_data):
        role = validated_data.pop("role")
        email = validated_data["email"]
        user = User.objects.create(
            username=email,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password"])
        Profile.objects.update_or_create(user=user, defaults={"role": role})
        return user


class CompanyUserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=(Profile.Role.TL, Profile.Role.MEMBER), write_only=True)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "is_active")

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A company user with this email already exists.")
        return email

    def validate(self, attrs):
        role = attrs.get("role")
        is_active = attrs.get("is_active", self.instance.is_active)
        if self.instance and self.instance.leading_teams.exists() and (role == Profile.Role.MEMBER or not is_active):
            raise serializers.ValidationError("Move this TL's teams to another TL before changing role or deactivating.")
        return attrs

    def update(self, instance, validated_data):
        role = validated_data.pop("role")
        email = validated_data.get("email")
        if email:
            instance.username = email
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        Profile.objects.update_or_create(user=instance, defaults={"role": role})
        return instance

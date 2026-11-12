from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"] = serializers.EmailField()
        self.fields["password"] = serializers.CharField(write_only=True)
        self.fields["designation"] = serializers.CharField(required=False, allow_blank=True)
        self.fields.pop("username", None)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        designation = (attrs.get("designation") or "").strip() or None
        user = authenticate(request=self.context.get("request"), username=email, password=password)
        if not user:
            raise AuthenticationFailed("Invalid email or password.")
        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")
        # Designation-based access control: faculty may only access using the
        # designation assigned to them by the HOD. HOD role is server-assigned.
        if user.role == User.Role.FACULTY and designation:
            try:
                profile = user.faculty_profile
            except Exception:
                profile = None
            assigned = getattr(profile, "designation", None) if profile else None
            if not assigned or assigned != designation:
                raise AuthenticationFailed(
                    "The selected designation does not match the designation assigned to you. Please contact the HOD."
                )
        refresh = self.get_token(user)
        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserProfileSerializer(user, context=self.context).data,
        }
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        try:
            token = RefreshToken(attrs["refresh"])
            token.blacklist()
        except Exception as exc:
            raise serializers.ValidationError({"refresh": "Invalid or expired refresh token."}) from exc
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    faculty_profile_id = serializers.IntegerField(source="faculty_profile.id", read_only=True, default=None)
    employee_id = serializers.CharField(source="faculty_profile.employee_id", read_only=True, default=None)
    designation = serializers.CharField(source="faculty_profile.designation", read_only=True, default=None)
    profile_status = serializers.CharField(source="faculty_profile.profile_status", read_only=True, default=None)
    contact_number = serializers.CharField(source="faculty_profile.contact_number", read_only=True, default=None)
    is_coordinator = serializers.SerializerMethodField()
    coordinator_classes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_active",
            "date_joined",
            "faculty_profile_id",
            "employee_id",
            "designation",
            "profile_status",
            "contact_number",
            "is_coordinator",
            "coordinator_classes",
        )
        read_only_fields = fields

    def _coordinator_rows(self, user):
        if getattr(user, "_coordinator_rows_cache", None) is None:
            from classes.models import ClassCoordinator

            profile = getattr(user, "faculty_profile", None)
            if profile is None:
                setattr(user, "_coordinator_rows_cache", [])
            else:
                rows = (
                    ClassCoordinator.objects.filter(faculty=profile, is_active=True)
                    .select_related("department_class", "department_class__department")
                    .order_by("department_class__section")
                )
                setattr(user, "_coordinator_rows_cache", [row.department_class for row in rows])
        return getattr(user, "_coordinator_rows_cache")

    def get_is_coordinator(self, user):
        return bool(self._coordinator_rows(user))

    def get_coordinator_classes(self, user):
        return [
            {
                "class_id": cls.pk,
                "section": cls.section,
                "year": cls.year,
                "semester": cls.semester,
                "display_name": cls.display_name,
            }
            for cls in self._coordinator_rows(user)
        ]


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class TokenRefreshResponseSerializer(TokenRefreshSerializer):
    pass

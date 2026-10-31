from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from accounts.models import User
from faculty.models import FacultyProfile
from lectures.models import Subject
from odrms.constants import ALLOWED_SECTIONS, DEPARTMENT_CSIT


class FacultyProfileSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    assigned_subject_ids = serializers.PrimaryKeyRelatedField(
        source="assigned_subjects",
        many=True,
        queryset=Subject.objects.all(),
        required=False,
    )
    assigned_subject_names = serializers.SlugRelatedField(
        source="assigned_subjects",
        many=True,
        read_only=True,
        slug_field="name",
    )

    class Meta:
        model = FacultyProfile
        fields = (
            "id",
            "user_id",
            "role",
            "employee_id",
            "full_name",
            "email",
            "designation",
            "contact_number",
            "department",
            "assigned_subject_ids",
            "assigned_subject_names",
            "assigned_sections",
            "account_status",
            "password",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user_id", "role", "created_at", "updated_at")

    def validate_department(self, value):
        if value != DEPARTMENT_CSIT:
            raise serializers.ValidationError("Only CSIT is supported.")
        return value

    def validate_assigned_sections(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("assigned_sections must be a list of A and/or B.")
        unique = []
        for section in value:
            if section not in ALLOWED_SECTIONS:
                raise serializers.ValidationError("Sections must be A or B.")
            if section not in unique:
                unique.append(section)
        return unique

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a faculty account."})
        if request and request.user.is_faculty and self.instance:
            forbidden = {"employee_id", "email", "designation", "account_status", "assigned_subjects", "assigned_sections", "department"}
            attempted = set(attrs.keys()) & forbidden
            if attempted:
                raise serializers.ValidationError(
                    {field: "Faculty cannot modify this field." for field in attempted}
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        subjects = validated_data.pop("assigned_subjects", [])
        email = validated_data["email"]
        full_name = validated_data["full_name"]
        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=User.Role.FACULTY,
            is_active=validated_data.get("account_status", FacultyProfile.AccountStatus.ACTIVE)
            == FacultyProfile.AccountStatus.ACTIVE,
        )
        profile = FacultyProfile.objects.create(user=user, department=DEPARTMENT_CSIT, **validated_data)
        if subjects:
            profile.assigned_subjects.set(subjects)
        return profile

    @transaction.atomic
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        subjects = validated_data.pop("assigned_subjects", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.department = DEPARTMENT_CSIT
        instance.save()

        user = instance.user
        user.email = instance.email
        user.full_name = instance.full_name
        if instance.account_status != FacultyProfile.AccountStatus.ACTIVE:
            user.is_active = False
        else:
            user.is_active = True
        if password:
            user.set_password(password)
        user.save()
        if subjects is not None:
            instance.assigned_subjects.set(subjects)
        return instance

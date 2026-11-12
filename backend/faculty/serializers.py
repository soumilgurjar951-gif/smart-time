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
            "faculty_code",
            "full_name",
            "email",
            "designation",
            "contact_number",
            "department",
            "assigned_subject_ids",
            "assigned_subject_names",
            "assigned_sections",
            "account_status",
            "profile_status",
            "qualifications",
            "specialization",
            "date_of_joining",
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
        if self.instance and not self.instance.user and attrs.get("password"):
            if not attrs.get("email", self.instance.email) or not attrs.get("full_name", self.instance.full_name):
                raise serializers.ValidationError(
                    {"email": "Email and full name are required before enabling a faculty account."}
                )
        if (
            self.instance
            and not self.instance.user
            and attrs.get("account_status", self.instance.account_status) == FacultyProfile.AccountStatus.ACTIVE
            and not attrs.get("password")
        ):
            raise serializers.ValidationError(
                {"password": "Set a password when activating a faculty profile without an account."}
            )
        if self.instance and not self.instance.user:
            activating = attrs.get("account_status", self.instance.account_status) == FacultyProfile.AccountStatus.ACTIVE
            if activating:
                required = {
                    "full_name": attrs.get("full_name", self.instance.full_name),
                    "employee_id": attrs.get("employee_id", self.instance.employee_id),
                    "email": attrs.get("email", self.instance.email),
                    "designation": attrs.get("designation", self.instance.designation),
                }
                missing = [field for field, value in required.items() if not value]
                if missing:
                    raise serializers.ValidationError(
                        {field: "Complete this profile field before activation." for field in missing}
                    )
        if request and request.user.is_faculty and self.instance:
            forbidden = {
                "employee_id",
                "faculty_code",
                "account_status",
                "assigned_subjects",
                "assigned_sections",
                "department",
                "role",
            }
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
        if user:
            if instance.email:
                user.email = instance.email
            if instance.full_name:
                user.full_name = instance.full_name
            user.is_active = instance.account_status == FacultyProfile.AccountStatus.ACTIVE
            if password:
                user.set_password(password)
            user.save()
        elif password:
            user = User.objects.create_user(
                email=instance.email,
                password=password,
                full_name=instance.full_name,
                role=User.Role.FACULTY,
                is_active=instance.account_status == FacultyProfile.AccountStatus.ACTIVE,
            )
            instance.user = user
            instance.save(update_fields=["user", "updated_at"])
        if subjects is not None:
            instance.assigned_subjects.set(subjects)

        # Faculty self-service onboarding: INCOMPLETE -> SUBMITTED on profile completion.
        # When the HOD sent a CHANGES_REQUESTED review, re-saving onboarding details
        # from the onboarding page counts as a fresh resubmission for verification.
        # Faculty may only update name/contact/onboarding details; College ID, official
        # email, designation and role stay assigned by the HOD and are not updatable here.
        request = self.context.get("request")
        if request and request.user.is_faculty and instance.profile_status in (
            FacultyProfile.ProfileStatus.INCOMPLETE,
            FacultyProfile.ProfileStatus.CHANGES_REQUESTED,
        ):
            onboarding_fields = (
                "full_name",
                "contact_number",
                "qualifications",
                "specialization",
                "date_of_joining",
            )
            if any(field in validated_data for field in onboarding_fields):
                instance.profile_status = FacultyProfile.ProfileStatus.SUBMITTED
                instance.account_status = FacultyProfile.AccountStatus.ACTIVE
                instance.save(update_fields=["profile_status", "account_status", "updated_at"])
                user.is_active = True
                user.save(update_fields=["is_active", "updated_at"])
        return instance

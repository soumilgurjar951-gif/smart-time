"""Assistant API endpoints.

GET  /api/assistant/context/   Live now-view: current class, next class,
                               reminders, digest (§2 + §5 + §6 of spec).
POST /api/assistant/query/     Natural-language query (English/Hinglish) →
                               database-backed answer (§7).

Both endpoints enforce the existing ODRMS permission model: authentication,
profile approval (IsProfileApproved) and class-level RBAC inside the services
layer. No student data is ever exposed to unauthorized roles.
"""

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsProfileApproved
from .answers import answer_query
from . import services


class AssistantContextView(APIView):
    permission_classes = [IsAuthenticated, IsProfileApproved]

    def get(self, request):
        return Response(services.current_context(request.user))


class AssistantQueryView(APIView):
    permission_classes = [IsAuthenticated, IsProfileApproved]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            raise ValidationError({"message": "Ask the assistant something."})
        if len(message) > 500:
            raise ValidationError({"message": "Message is too long."})
        answer = answer_query(request.user, message)
        return Response(answer, status=status.HTTP_200_OK)

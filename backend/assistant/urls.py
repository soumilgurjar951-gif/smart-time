from django.urls import path

from .views import AssistantContextView, AssistantQueryView

urlpatterns = [
    path("context/", AssistantContextView.as_view(), name="assistant-context"),
    path("query/", AssistantQueryView.as_view(), name="assistant-query"),
]

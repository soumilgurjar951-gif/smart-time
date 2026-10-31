from django.urls import include, path
from rest_framework.routers import DefaultRouter

from resources.views import ResourceBookingListCreateView, ResourceBookingReviewView, ResourceViewSet

router = DefaultRouter()
router.register("", ResourceViewSet, basename="resource")

urlpatterns = [
    path("bookings/", ResourceBookingListCreateView.as_view(), name="resource-bookings"),
    path("bookings/<int:pk>/review/", ResourceBookingReviewView.as_view(), name="booking-review"),
    path("", include(router.urls)),
]

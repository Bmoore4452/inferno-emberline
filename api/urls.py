from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("indicators/moving-averages/", views.moving_averages, name="moving_averages"),
]

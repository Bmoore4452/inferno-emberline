from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("indicators/moving-averages/", views.moving_averages, name="moving_averages"),
    path("scanner/leaders/", views.leaders_scan, name="leaders_scan"),
    path("scanner/path-setups/", views.path_setups_scan, name="path_setups_scan"),
    path("scanner/path-setups/<str:ticker>/", views.path_setup_detail, name="path_setup_detail"),
]

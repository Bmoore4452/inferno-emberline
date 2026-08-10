from django.contrib import admin

from .models import LeaderPick


@admin.register(LeaderPick)
class LeaderPickAdmin(admin.ModelAdmin):
    list_display = ("rank", "ticker", "sector", "added_at")
    ordering = ("rank",)

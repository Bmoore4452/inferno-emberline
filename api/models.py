from django.db import models


class LeaderPick(models.Model):
    """A ticker locked into the persisted 20-leader watchlist. Regenerated
    only via an explicit refresh, not on every scan, so the same names stay
    in place to study while the pullback-buy setup plays out."""

    ticker = models.CharField(max_length=10, unique=True)
    sector = models.CharField(max_length=64)
    rank = models.PositiveSmallIntegerField()
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rank"]

    def __str__(self):
        return self.ticker

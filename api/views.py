from django.db import connection, transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from backend.data.fetcher import fetch_ohlcv
from backend.indicators.moving_averages import compute_moving_averages
from backend.scanner.leaders import scan_leaders, get_leaders_stats, WATCHLIST_SIZE
from backend.scanner.path_scanner import scan_path_setups, get_path_detail
from backend.scanner.universe import LEADERS_CANDIDATES

from .models import LeaderPick


@api_view(["GET"])
def moving_averages(request):
    ticker = request.query_params.get("ticker", "").strip().upper()
    period = request.query_params.get("period", "1y").strip()

    if not ticker:
        return Response(
            {"error": "Missing required query parameter: ticker"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        df = fetch_ohlcv(ticker, period)
        ma_data = compute_moving_averages(df)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Unexpected error.", "detail": str(e)}, status=500)

    return Response({
        "ticker": ticker,
        "period": period,
        "data_points": len(df),
        "date_range": {
            "from": df.index[0].strftime("%Y-%m-%d"),
            "to":   df.index[-1].strftime("%Y-%m-%d"),
        },
        "latest_close": ma_data["latest_close"],
        "moving_averages": {
            "sma_20":  ma_data["sma_20"],
            "sma_50":  ma_data["sma_50"],
            "sma_200": ma_data["sma_200"],
        },
        "trend": ma_data["trend"],
        "series": ma_data["series"],
    })


def _watchlist_picks() -> list[LeaderPick]:
    return list(LeaderPick.objects.order_by("rank"))


@transaction.atomic
def _persist_watchlist(leaders: list[dict]) -> list[LeaderPick]:
    LeaderPick.objects.all().delete()
    picks = [
        LeaderPick(ticker=leader["ticker"], sector=leader["sector"], rank=i + 1)
        for i, leader in enumerate(leaders[:WATCHLIST_SIZE])
    ]
    LeaderPick.objects.bulk_create(picks)
    return _watchlist_picks()


# Arbitrary constant identifying the watchlist-seed critical section for
# pg_advisory_xact_lock. Only matters that it's consistent across callers.
_SEED_LOCK_KEY = 725017


def _seed_watchlist_if_empty() -> tuple[list[LeaderPick], dict | None]:
    """First-ever GET populates the watchlist. Concurrent cold-start
    requests can otherwise all see an empty table and each independently
    reseed, with the last write silently clobbering the others' rows --
    so the scan (slow, network-bound) runs unlocked, but the empty-check
    and write are re-verified under a Postgres advisory lock, letting a
    late-arriving request discard its own scan in favor of whatever the
    lock-holder already committed. Returns the freshly scanned result too,
    as a fallback for the rare case where zero candidates qualify."""
    picks = _watchlist_picks()
    if picks:
        return picks, None

    fresh = scan_leaders()

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [_SEED_LOCK_KEY])
        picks = _watchlist_picks()
        if not picks:
            picks = _persist_watchlist(fresh["leaders"])
    return picks, fresh


def _watchlist_result(picks: list[LeaderPick]) -> dict:
    candidates = {pick.ticker: pick.sector for pick in picks}
    result = get_leaders_stats(candidates)
    result["generated_at"] = picks[0].added_at.isoformat() if picks else None
    return result


@api_view(["GET"])
def leaders_scan(request):
    try:
        picks, fresh = _seed_watchlist_if_empty()
        result = _watchlist_result(picks) if picks else fresh
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Unexpected error.", "detail": str(e)}, status=500)

    return Response(result)


@api_view(["POST"])
def leaders_refresh(request):
    """Explicitly regenerate the persisted watchlist from a fresh scan.
    The GET endpoint never does this on its own -- membership only changes
    here, so the list stays stable to study between refreshes."""
    try:
        fresh = scan_leaders()
        picks = _persist_watchlist(fresh["leaders"])
        result = _watchlist_result(picks) if picks else fresh
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Unexpected error.", "detail": str(e)}, status=500)

    return Response(result)


@api_view(["GET"])
def path_setups_scan(request):
    tickers_param = request.query_params.get("tickers", "").strip()
    if tickers_param:
        tickers = [t.strip().upper() for t in tickers_param.split(",") if t.strip()]
    else:
        watchlist = [pick.ticker for pick in _watchlist_picks()]
        tickers = watchlist or list(LEADERS_CANDIDATES.keys())

    try:
        results = scan_path_setups(tickers)
    except Exception as e:
        return Response({"error": "Unexpected error.", "detail": str(e)}, status=500)

    return Response({"tickers": tickers, "results": results})


@api_view(["GET"])
def path_setup_detail(request, ticker):
    interval = request.query_params.get("interval", "1d").strip()
    if interval not in {"1d", "1h"}:
        return Response(
            {"error": f"Invalid interval '{interval}'. Use '1d' or '1h'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = get_path_detail(ticker, interval=interval)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": "Unexpected error.", "detail": str(e)}, status=500)

    return Response(result)


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "message": "inferno-emberline API is running"})

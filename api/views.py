from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from backend.data.fetcher import fetch_ohlcv
from backend.indicators.moving_averages import compute_moving_averages


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


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "message": "inferno-emberline API is running"})

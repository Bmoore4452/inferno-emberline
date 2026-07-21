import pandas as pd
from typing import Optional


def compute_sma(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window).mean()


def compute_moving_averages(df: pd.DataFrame) -> dict:
    close = df["Close"]

    sma_20  = compute_sma(close, 20)
    sma_50  = compute_sma(close, 50)
    sma_200 = compute_sma(close, 200)

    latest_close   = round(float(close.iloc[-1]), 4)
    latest_sma_20  = round(float(sma_20.iloc[-1]),  4) if not pd.isna(sma_20.iloc[-1])  else None
    latest_sma_50  = round(float(sma_50.iloc[-1]),  4) if not pd.isna(sma_50.iloc[-1])  else None
    latest_sma_200 = round(float(sma_200.iloc[-1]), 4) if not pd.isna(sma_200.iloc[-1]) else None

    trend = _classify_trend(latest_close, latest_sma_20, latest_sma_50, latest_sma_200)

    return {
        "latest_close": latest_close,
        "sma_20":  latest_sma_20,
        "sma_50":  latest_sma_50,
        "sma_200": latest_sma_200,
        "trend":   trend,
        "series":  _build_series(df.index, close, sma_20, sma_50, sma_200),
    }


def _build_series(
    dates,
    close: pd.Series,
    sma_20: pd.Series,
    sma_50: pd.Series,
    sma_200: pd.Series,
) -> list[dict]:
    def val(series, i):
        v = series.iloc[i]
        return round(float(v), 4) if not pd.isna(v) else None

    return [
        {
            "date": dates[i].strftime("%Y-%m-%d"),
            "close": val(close, i),
            "sma_20": val(sma_20, i),
            "sma_50": val(sma_50, i),
            "sma_200": val(sma_200, i),
        }
        for i in range(len(dates))
    ]


def _classify_trend(
    close: float,
    sma_20: Optional[float],
    sma_50: Optional[float],
    sma_200: Optional[float],
) -> str:
    if None in (sma_20, sma_50, sma_200):
        return "neutral"
    if close > sma_20 > sma_50 > sma_200:
        return "strong_bullish"
    elif close > sma_50 and close > sma_200:
        return "bullish"
    elif close < sma_20 < sma_50 < sma_200:
        return "strong_bearish"
    elif close < sma_50 and close < sma_200:
        return "bearish"
    else:
        return "neutral"

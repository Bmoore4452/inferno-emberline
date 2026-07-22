import pandas as pd

from backend.data.fetcher import fetch_ohlcv, fetch_ohlcv_batch
from backend.indicators.path_levels import classify_path_setup

# Bounds ATH/PATH detection to the last 5 years so decades-old cycle peaks
# (e.g. a pre-2014 oil-bust high) don't get treated as the relevant support
# level for a current breakout-retest setup.
PATH_LOOKBACK_PERIOD = "5y"


def scan_path_setups(tickers: list[str]) -> list[dict]:
    data = fetch_ohlcv_batch(tickers, period=PATH_LOOKBACK_PERIOD)

    results = []
    for ticker in tickers:
        if ticker not in data:
            results.append({"ticker": ticker, "error": "No data returned."})
            continue
        df = data[ticker]
        result = classify_path_setup(df["Close"], df["Volume"])
        result["ticker"] = ticker
        results.append(result)
    return results


def get_path_detail(ticker: str) -> dict:
    """Full PATH breakout-retest detail for a single ticker: the current
    classification plus a chartable close/SMA20 series."""
    df = fetch_ohlcv(ticker, period=PATH_LOOKBACK_PERIOD)
    close = df["Close"]
    sma20 = close.rolling(20).mean()

    result = classify_path_setup(close, df["Volume"])
    result["ticker"] = ticker.upper()
    result["series"] = _build_series(df.index, close, sma20)
    return result


def _build_series(dates, close: pd.Series, sma20: pd.Series) -> list[dict]:
    def val(series, i):
        v = series.iloc[i]
        return round(float(v), 4) if not pd.isna(v) else None

    return [
        {
            "date": dates[i].strftime("%Y-%m-%d"),
            "close": val(close, i),
            "sma_20": val(sma20, i),
        }
        for i in range(len(dates))
    ]

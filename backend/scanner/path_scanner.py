import pandas as pd

from backend.data.fetcher import fetch_ohlcv, fetch_ohlcv_batch
from backend.indicators.path_levels import classify_path_setup, compute_fibonacci_levels

# Bounds ATH/PATH detection to the last 5 years so decades-old cycle peaks
# (e.g. a pre-2014 oil-bust high) don't get treated as the relevant support
# level for a current breakout-retest setup.
PATH_LOOKBACK_PERIOD = "5y"

# Intraday history Yahoo will actually serve for hourly bars is limited (and
# a couple of years of hourly candles isn't useful to look at anyway) -- this
# keeps the hourly chart scoped to the recent action around an entry.
INTRADAY_LOOKBACK_PERIOD = "1mo"
INTRADAY_INTERVAL = "1h"


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


def get_path_detail(ticker: str, interval: str = "1d") -> dict:
    """Full PATH breakout-retest detail for a single ticker: the current
    classification plus a chartable close/SMA series.

    ATH, PATH, the classification stage, and Fibonacci levels are always
    computed from the 5-year daily history -- those are fixed "key levels"
    that shouldn't shift depending on what granularity the chart is showing.
    Only the `series` field (and its own SMA) reflects the requested
    interval, so switching to hourly zooms into recent price action without
    moving the reference levels drawn on top of it.
    """
    df = fetch_ohlcv(ticker, period=PATH_LOOKBACK_PERIOD)
    close = df["Close"]

    result = classify_path_setup(close, df["Volume"])
    result["ticker"] = ticker.upper()
    result["fibonacci"] = compute_fibonacci_levels(close)
    result["interval"] = interval

    if interval == "1h":
        intraday_df = fetch_ohlcv(
            ticker, period=INTRADAY_LOOKBACK_PERIOD, interval=INTRADAY_INTERVAL
        )
        intraday_close = intraday_df["Close"]
        result["series"] = _build_series(
            intraday_df.index, intraday_close, intraday_close.rolling(20).mean()
        )
    else:
        result["series"] = _build_series(df.index, close, close.rolling(20).mean())

    return result


def _build_series(dates, close: pd.Series, sma20: pd.Series) -> list[dict]:
    def val(series, i):
        v = series.iloc[i]
        return round(float(v), 4) if not pd.isna(v) else None

    # ISO 8601 with full timestamp -- daily bars all land on midnight, but
    # hourly bars need the time-of-day preserved or every bar in a trading
    # day would collapse to the same label.
    return [
        {
            "date": dates[i].isoformat(),
            "close": val(close, i),
            "sma_20": val(sma20, i),
        }
        for i in range(len(dates))
    ]

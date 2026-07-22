import pandas as pd

from backend.data.fetcher import fetch_ohlcv_batch
from backend.scanner.universe import LEADERS_CANDIDATES, BENCHMARK_TICKER

OUTPERFORMANCE_MULTIPLE = 2.0


def _ytd_return(close: pd.Series) -> float | None:
    ytd = close[close.index >= f"{pd.Timestamp.now().year}-01-01"]
    if len(ytd) < 2:
        return None
    return (ytd.iloc[-1] / ytd.iloc[0] - 1) * 100


def scan_leaders(candidates: dict[str, str] | None = None) -> dict:
    """Rank candidates that are outperforming the S&P 500 YTD by at least
    `OUTPERFORMANCE_MULTIPLE`x and are trading above both their 20- and
    50-day SMA -- i.e. showing momentum, not just past strength."""
    candidates = candidates or LEADERS_CANDIDATES
    tickers = list(candidates.keys())

    data = fetch_ohlcv_batch(tickers + [BENCHMARK_TICKER], period="1y")

    if BENCHMARK_TICKER not in data:
        raise ValueError("Could not fetch S&P 500 benchmark data.")
    benchmark_ytd = _ytd_return(data[BENCHMARK_TICKER]["Close"])
    if benchmark_ytd is None:
        raise ValueError("Could not compute benchmark YTD return.")

    threshold = OUTPERFORMANCE_MULTIPLE * benchmark_ytd

    leaders = []
    for ticker in tickers:
        if ticker not in data:
            continue
        close = data[ticker]["Close"]
        if len(close) < 50:
            continue

        ytd_return = _ytd_return(close)
        if ytd_return is None or ytd_return < threshold:
            continue

        last_close = float(close.iloc[-1])
        sma20 = float(close.rolling(20).mean().iloc[-1])
        sma50 = float(close.rolling(50).mean().iloc[-1])
        if not (last_close > sma20 and last_close > sma50):
            continue

        leaders.append({
            "ticker": ticker,
            "sector": candidates[ticker],
            "price": round(last_close, 2),
            "ytd_return_pct": round(ytd_return, 2),
            "outperformance_pct": round(ytd_return - threshold, 2),
        })

    leaders.sort(key=lambda r: r["ytd_return_pct"], reverse=True)

    return {
        "benchmark_ytd_return_pct": round(benchmark_ytd, 2),
        "outperformance_threshold_pct": round(threshold, 2),
        "leaders": leaders,
    }

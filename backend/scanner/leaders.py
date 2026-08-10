import pandas as pd

from backend.data.fetcher import fetch_ohlcv_batch
from backend.scanner.universe import LEADERS_CANDIDATES, BENCHMARK_TICKER

OUTPERFORMANCE_MULTIPLE = 2.0
WATCHLIST_SIZE = 20


def _ytd_return(close: pd.Series) -> float | None:
    ytd = close[close.index >= f"{pd.Timestamp.now().year}-01-01"]
    if len(ytd) < 2:
        return None
    return (ytd.iloc[-1] / ytd.iloc[0] - 1) * 100


def _ticker_stats(
    ticker: str, sector: str, df: pd.DataFrame | None, threshold: float
) -> dict | None:
    """Price/YTD/SMA snapshot for a single ticker, or None if there isn't
    enough history to compute one. `meets_criteria` reports whether the
    ticker currently clears the outperformance + SMA momentum bar, without
    that being used to drop it from a fixed/persisted list."""
    if df is None:
        return None
    close = df["Close"]
    if len(close) < 50:
        return None

    ytd_return = _ytd_return(close)
    if ytd_return is None:
        return None

    last_close = float(close.iloc[-1])
    sma20 = float(close.rolling(20).mean().iloc[-1])
    sma50 = float(close.rolling(50).mean().iloc[-1])

    return {
        "ticker": ticker,
        "sector": sector,
        "price": round(last_close, 2),
        "ytd_return_pct": round(ytd_return, 2),
        "outperformance_pct": round(ytd_return - threshold, 2),
        "meets_criteria": bool(ytd_return >= threshold and last_close > sma20 and last_close > sma50),
    }


def _benchmark_threshold(data: dict[str, pd.DataFrame]) -> float:
    if BENCHMARK_TICKER not in data:
        raise ValueError("Could not fetch S&P 500 benchmark data.")
    benchmark_ytd = _ytd_return(data[BENCHMARK_TICKER]["Close"])
    if benchmark_ytd is None:
        raise ValueError("Could not compute benchmark YTD return.")
    return benchmark_ytd


def scan_leaders(candidates: dict[str, str] | None = None) -> dict:
    """Rank candidates that are outperforming the S&P 500 YTD by at least
    `OUTPERFORMANCE_MULTIPLE`x and are trading above both their 20- and
    50-day SMA -- i.e. showing momentum, not just past strength."""
    candidates = candidates or LEADERS_CANDIDATES
    tickers = list(candidates.keys())

    data = fetch_ohlcv_batch(tickers + [BENCHMARK_TICKER], period="1y")
    benchmark_ytd = _benchmark_threshold(data)
    threshold = OUTPERFORMANCE_MULTIPLE * benchmark_ytd

    leaders = []
    for ticker in tickers:
        stat = _ticker_stats(ticker, candidates[ticker], data.get(ticker), threshold)
        if stat is None or not stat.pop("meets_criteria"):
            continue
        leaders.append(stat)

    leaders.sort(key=lambda r: r["ytd_return_pct"], reverse=True)

    return {
        "benchmark_ytd_return_pct": round(benchmark_ytd, 2),
        "outperformance_threshold_pct": round(threshold, 2),
        "leaders": leaders,
        "generated_at": None,
    }


def get_leaders_stats(candidates: dict[str, str]) -> dict:
    """Live price/YTD/SMA stats for a fixed set of tickers, in the given
    order, with no pass/fail filtering -- used to refresh the numbers on an
    already-persisted watchlist without changing its membership."""
    tickers = list(candidates.keys())

    data = fetch_ohlcv_batch(tickers + [BENCHMARK_TICKER], period="1y")
    benchmark_ytd = _benchmark_threshold(data)
    threshold = OUTPERFORMANCE_MULTIPLE * benchmark_ytd

    leaders = []
    for ticker in tickers:
        stat = _ticker_stats(ticker, candidates[ticker], data.get(ticker), threshold)
        if stat is not None:
            leaders.append(stat)

    return {
        "benchmark_ytd_return_pct": round(benchmark_ytd, 2),
        "outperformance_threshold_pct": round(threshold, 2),
        "leaders": leaders,
    }

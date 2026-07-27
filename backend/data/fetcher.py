import yfinance as yf
import pandas as pd

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}


def fetch_ohlcv(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    if period not in VALID_PERIODS:
        raise ValueError(f"Invalid period '{period}'.")

    ticker_obj = yf.Ticker(ticker.upper())
    df = ticker_obj.history(period=period, interval=interval)

    if df.empty:
        raise ValueError(f"No data returned for ticker '{ticker}'.")

    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.index = pd.to_datetime(df.index)
    df.index.name = "date"
    return df


def fetch_ohlcv_batch(tickers: list[str], period: str = "1y") -> dict[str, pd.DataFrame]:
    """Fetch OHLCV for multiple tickers in one request. Silently omits any
    ticker yfinance couldn't return data for (delisted, typo, etc.) rather
    than failing the whole batch."""
    if period not in VALID_PERIODS:
        raise ValueError(f"Invalid period '{period}'.")

    raw = yf.download(
        tickers, period=period, auto_adjust=True, progress=False, group_by="ticker"
    )

    result = {}
    for ticker in tickers:
        try:
            df = raw[ticker][["Open", "High", "Low", "Close", "Volume"]].dropna()
        except KeyError:
            continue
        if df.empty:
            continue
        df.index = pd.to_datetime(df.index)
        df.index.name = "date"
        result[ticker.upper()] = df
    return result

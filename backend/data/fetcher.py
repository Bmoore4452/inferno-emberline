import yfinance as yf
import pandas as pd

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}


def fetch_ohlcv(ticker: str, period: str = "1y") -> pd.DataFrame:
    if period not in VALID_PERIODS:
        raise ValueError(f"Invalid period '{period}'.")

    ticker_obj = yf.Ticker(ticker.upper())
    df = ticker_obj.history(period=period)

    if df.empty:
        raise ValueError(f"No data returned for ticker '{ticker}'.")

    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.index = pd.to_datetime(df.index)
    df.index.name = "date"
    return df

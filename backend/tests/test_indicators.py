import pandas as pd
from backend.indicators.moving_averages import compute_sma, _classify_trend, _build_series


def make_close(n=250, start=100.0):
    return pd.Series([start + i * 0.5 for i in range(n)])


def test_sma_length_matches_input():
    result = compute_sma(make_close(100), 20)
    assert len(result) == 100


def test_sma_first_values_are_nan():
    result = compute_sma(make_close(100), 20)
    assert result.iloc[:19].isna().all()


def test_sma_calculation_is_correct():
    series = pd.Series([1.0, 2.0, 3.0, 4.0, 5.0])
    assert round(compute_sma(series, 3).iloc[-1], 4) == 4.0


def test_trend_strong_bullish():
    assert _classify_trend(210, 200, 180, 150) == "strong_bullish"


def test_trend_strong_bearish():
    assert _classify_trend(100, 110, 130, 160) == "strong_bearish"


def test_trend_neutral_when_none():
    assert _classify_trend(100, None, None, None) == "neutral"


def test_build_series_length_and_shape():
    close = make_close(30)
    dates = pd.date_range("2024-01-01", periods=30)
    sma_20 = compute_sma(close, 20)
    series = _build_series(dates, close, sma_20, sma_20, sma_20)

    assert len(series) == 30
    assert series[0]["sma_20"] is None
    assert series[-1]["date"] == "2024-01-30"
    assert series[-1]["close"] == round(float(close.iloc[-1]), 4)

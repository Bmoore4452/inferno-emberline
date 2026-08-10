import pandas as pd

import backend.scanner.leaders as leaders_module
from backend.scanner.leaders import scan_leaders, get_leaders_stats


def _climb(start, end, n=260):
    step = (end - start) / (n - 1)
    return [start + step * i for i in range(n)]


def make_df(prices):
    dates = pd.date_range(end=pd.Timestamp.now().normalize(), periods=len(prices), freq="D")
    close = pd.Series(prices, index=dates)
    return pd.DataFrame(
        {
            "Open": close,
            "High": close,
            "Low": close,
            "Close": close,
            "Volume": [1_000_000] * len(prices),
        }
    )


def _patch_data(monkeypatch, data):
    monkeypatch.setattr(
        leaders_module, "fetch_ohlcv_batch", lambda tickers, period="1y": data
    )


def test_scan_leaders_filters_to_qualifying_tickers(monkeypatch):
    data = {
        "^GSPC": make_df(_climb(4000, 4300)),
        "STRONG": make_df(_climb(100, 500)),
        "WEAK": make_df(_climb(100, 103)),
    }
    _patch_data(monkeypatch, data)

    result = scan_leaders({"STRONG": "Tech", "WEAK": "Tech"})
    tickers = [leader["ticker"] for leader in result["leaders"]]

    assert tickers == ["STRONG"]


def test_scan_leaders_response_shape_has_no_internal_flag(monkeypatch):
    data = {
        "^GSPC": make_df(_climb(4000, 4300)),
        "STRONG": make_df(_climb(100, 500)),
    }
    _patch_data(monkeypatch, data)

    result = scan_leaders({"STRONG": "Tech"})

    assert "meets_criteria" not in result["leaders"][0]


def test_get_leaders_stats_includes_non_qualifying_ticker(monkeypatch):
    data = {
        "^GSPC": make_df(_climb(4000, 4300)),
        "WEAK": make_df(_climb(100, 103)),
    }
    _patch_data(monkeypatch, data)

    result = get_leaders_stats({"WEAK": "Tech"})

    assert len(result["leaders"]) == 1
    assert result["leaders"][0]["ticker"] == "WEAK"
    assert result["leaders"][0]["meets_criteria"] is False


def test_get_leaders_stats_preserves_input_order(monkeypatch):
    data = {
        "^GSPC": make_df(_climb(4000, 4300)),
        "SECOND": make_df(_climb(100, 500)),
        "FIRST": make_df(_climb(100, 400)),
    }
    _patch_data(monkeypatch, data)

    result = get_leaders_stats({"SECOND": "Tech", "FIRST": "Tech"})
    tickers = [leader["ticker"] for leader in result["leaders"]]

    assert tickers == ["SECOND", "FIRST"]

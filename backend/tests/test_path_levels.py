import pandas as pd
from backend.indicators.path_levels import find_ath_and_path, classify_path_setup


def make_series(values):
    return pd.Series([float(v) for v in values])


def test_find_ath_and_path_basic():
    # rallies to 100 (a swing high), pulls back >10% to 80, then breaks out
    # to a new ATH of 150 -- 100 is PATH, 150 is the ATH.
    close = make_series([50, 70, 100, 90, 80, 120, 150])
    ath, path = find_ath_and_path(close)
    assert ath == 150
    assert path == 100


def test_find_ath_and_path_ignores_shallow_pullback():
    # dips from 100 to 98 (a 2% pullback -- noise, not a real swing) before
    # continuing on to a new high of 150. That shallow dip shouldn't count.
    close = make_series([50, 100, 98, 120, 150])
    ath, path = find_ath_and_path(close)
    assert ath == 150
    assert path is None


def test_find_ath_and_path_no_prior_peak():
    close = make_series([10, 20, 30])
    ath, path = find_ath_and_path(close)
    assert ath == 30
    assert path is None


def test_classify_at_new_highs():
    close = make_series([50, 100, 90, 120, 150] + [150] * 20)
    volume = make_series([1_000_000] * len(close))
    result = classify_path_setup(close, volume)
    assert result["stage"] == "at_new_highs"


def test_classify_entry_1_path_reclaim():
    # ATH=150 (PATH=100), pulls back below 100, then closes back above 100
    close = make_series([50, 100, 90, 120, 150, 130, 95, 105])
    volume = make_series([1_000_000] * len(close))
    result = classify_path_setup(close, volume, sma_window=3)
    assert result["stage"] == "entry_1_path_reclaim"
    assert result["path"] == 100


def test_classify_entry_2_sma20_reclaim():
    # Rally to new ATH (PATH=100), settle well below PATH long enough to
    # establish a 20-day SMA, dip under that SMA, then reclaim it.
    close = make_series(
        [50, 100, 90, 120, 150]  # rally to new ATH (PATH=100)
        + [95] * 25               # settle well below PATH, establishing the SMA
        + [93, 96]                 # dip under the SMA then reclaim it
    )
    volume = make_series([1_000_000] * len(close))
    result = classify_path_setup(close, volume)
    assert result["stage"] == "entry_2_sma20_reclaim"


def test_classify_below_sma20_invalidated():
    close = make_series([50, 100, 90, 120, 150] + [95] * 25 + [90, 85])
    volume = make_series([1_000_000] * len(close))
    result = classify_path_setup(close, volume)
    assert result["stage"] == "below_sma20_invalidated"


def test_high_volume_flag():
    close = make_series([50, 100, 90, 120, 150, 130, 95, 105])
    volume = make_series([1_000_000] * 7 + [2_000_000])
    result = classify_path_setup(close, volume, sma_window=3)
    assert result["high_volume"] is True
    assert result["volume_vs_avg"] == 1.5

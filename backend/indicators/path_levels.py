import pandas as pd
from typing import Optional

# The standard Fibonacci retracement ratios; 0.618 is the "golden ratio" level.
FIB_RATIOS = (0.236, 0.382, 0.5, 0.618, 0.786)
GOLDEN_RATIO = 0.618


def _confirmed_pivots(
    close: pd.Series, end_idx: int, min_pullback_pct: float
) -> list[tuple[int, float, str]]:
    """Confirmed zigzag swing pivots -- (index, price, 'high'|'low') -- found
    scanning close[0:end_idx+1]. Each pivot requires a min_pullback_pct
    reversal to confirm, which filters day-to-day noise from genuine swings."""
    pivots: list[tuple[int, float, str]] = []
    direction: Optional[str] = None
    extreme_idx = 0
    extreme_price = float(close.iloc[0])

    for i in range(1, end_idx + 1):
        price = float(close.iloc[i])
        if direction is None:
            if price >= extreme_price * (1 + min_pullback_pct):
                direction = "up"
                extreme_idx, extreme_price = i, price
            elif price <= extreme_price * (1 - min_pullback_pct):
                direction = "down"
                extreme_idx, extreme_price = i, price
            continue

        if direction == "up":
            if price > extreme_price:
                extreme_idx, extreme_price = i, price
            elif price <= extreme_price * (1 - min_pullback_pct):
                pivots.append((extreme_idx, extreme_price, "high"))
                direction = "down"
                extreme_idx, extreme_price = i, price
        else:
            if price < extreme_price:
                extreme_idx, extreme_price = i, price
            elif price >= extreme_price * (1 + min_pullback_pct):
                pivots.append((extreme_idx, extreme_price, "low"))
                direction = "up"
                extreme_idx, extreme_price = i, price

    return pivots


def find_ath_and_path(
    close: pd.Series, min_pullback_pct: float = 0.10
) -> tuple[Optional[float], Optional[float]]:
    """Return (all-time high, previous all-time high) from a close price series.

    PATH is the most recent prior swing high the stock pulled back from by at
    least `min_pullback_pct` before breaking out to the current all-time high
    -- i.e. the old resistance level a breakout must reclaim as support after
    a pullback. Requiring a minimum drawdown filters out noise: every tick on
    the way up to a new high is technically "a new high", but only a genuine
    pullback-then-breakout establishes a level worth calling PATH.
    """
    if close.empty:
        return None, None

    close = close.reset_index(drop=True)
    ath_idx = int(close.values.argmax())
    ath = float(close.iloc[ath_idx])

    if ath_idx == 0:
        return ath, None

    highs = [p for p in _confirmed_pivots(close, ath_idx, min_pullback_pct) if p[2] == "high"]
    path = highs[-1][1] if highs else None
    return ath, path


def find_swing_low_before_ath(
    close: pd.Series, min_pullback_pct: float = 0.10
) -> Optional[float]:
    """The most recent confirmed swing low before the all-time high -- i.e.
    where the rally to the current ATH began. Paired with the ATH, this is
    the anchor leg for Fibonacci retracement levels."""
    if close.empty:
        return None

    close = close.reset_index(drop=True)
    ath_idx = int(close.values.argmax())
    if ath_idx == 0:
        return None

    lows = [p for p in _confirmed_pivots(close, ath_idx, min_pullback_pct) if p[2] == "low"]
    return lows[-1][1] if lows else None


def compute_fibonacci_levels(
    close: pd.Series, min_pullback_pct: float = 0.10
) -> Optional[dict]:
    """Fibonacci retracement levels for the rally leg from the swing low
    before the ATH up to the ATH itself. Returns None when that leg can't be
    established (e.g. the stock rallied to its ATH with no confirmed pullback
    along the way)."""
    ath, _ = find_ath_and_path(close, min_pullback_pct=min_pullback_pct)
    swing_low = find_swing_low_before_ath(close, min_pullback_pct=min_pullback_pct)

    if ath is None or swing_low is None or ath <= swing_low:
        return None

    span = ath - swing_low
    levels = {str(ratio): round(ath - span * ratio, 2) for ratio in FIB_RATIOS}

    return {
        "swing_low": round(swing_low, 2),
        "swing_high": round(ath, 2),
        "levels": levels,
        "golden_ratio": levels[str(GOLDEN_RATIO)],
    }


def classify_path_setup(
    close: pd.Series,
    volume: pd.Series,
    sma_window: int = 20,
    min_pullback_pct: float = 0.10,
    new_high_tolerance: float = 0.005,
    volume_multiple: float = 1.2,
) -> dict:
    """Classify where a stock sits in the PATH breakout/retest cycle.

    Stages:
      at_new_highs           - trading at/near its all-time high, no pullback yet
      pulled_back_above_path - pulled back from the ATH but still holding above PATH
      entry_1_path_reclaim   - closed back above PATH after trading below it (entry #1)
      below_path_above_sma20 - lost PATH, now consolidating above the moving average
      entry_2_sma20_reclaim  - closed back above the moving average after losing it (entry #2)
      below_sma20_invalidated- lost the moving average too; setup no longer valid
      insufficient_history   - not enough price history to establish PATH
    """
    ath, path = find_ath_and_path(close, min_pullback_pct=min_pullback_pct)
    sma = close.rolling(sma_window).mean()
    avg_volume = volume.rolling(sma_window).mean()

    last_close = float(close.iloc[-1])
    prev_close = float(close.iloc[-2]) if len(close) > 1 else last_close
    last_sma = float(sma.iloc[-1]) if not pd.isna(sma.iloc[-1]) else None
    prev_sma = float(sma.iloc[-2]) if len(sma) > 1 and not pd.isna(sma.iloc[-2]) else None
    last_volume = float(volume.iloc[-1])
    last_avg_volume = float(avg_volume.iloc[-1]) if not pd.isna(avg_volume.iloc[-1]) else None
    high_volume = (
        last_avg_volume is not None
        and last_avg_volume > 0
        and last_volume >= volume_multiple * last_avg_volume
    )

    if path is None or ath is None:
        stage = "insufficient_history"
    elif last_close >= ath * (1 - new_high_tolerance):
        stage = "at_new_highs"
    elif last_close >= path:
        stage = "entry_1_path_reclaim" if prev_close < path <= last_close else "pulled_back_above_path"
    elif last_sma is not None and last_close >= last_sma:
        stage = (
            "entry_2_sma20_reclaim"
            if prev_sma is not None and prev_close < prev_sma <= last_close
            else "below_path_above_sma20"
        )
    else:
        stage = "below_sma20_invalidated"

    return {
        "ath": round(ath, 2) if ath is not None else None,
        "path": round(path, 2) if path is not None else None,
        "last_close": round(last_close, 2),
        "sma20": round(last_sma, 2) if last_sma is not None else None,
        "stage": stage,
        "high_volume": high_volume,
        "volume_vs_avg": (
            round(last_volume / last_avg_volume, 2)
            if last_avg_volume
            else None
        ),
    }

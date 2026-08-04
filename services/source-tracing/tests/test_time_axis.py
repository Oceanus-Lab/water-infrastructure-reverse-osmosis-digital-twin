"""Regression tests for the cycle time axis.

`days_since_replacement` comes from the OCWD source and counts from the last membrane
REPLACEMENT, while `cycle_id` is delimited by CIP cleanings. They are different events, so
the column resets to 0 partway through a cycle whenever a membrane is swapped mid-cycle.

In the real dataset that happens on exactly 2 of the 92 cycles (C01#4, D01#4) — verified
against BigQuery, where C01#4 spans 122 days by date but 0..1736 by days_since_replacement.
Because the other 90 agreed, using it as the time axis looked correct for years' worth of
readings and silently corrupted those two: the regression x-axis stretched ~14x, the clean
anchor window selected post-replacement readings from the END of the cycle, and "latest
reading" picked the wrong row.

These tests pin the fix so a future refactor cannot quietly reintroduce it.
"""
import numpy as np
import pandas as pd
import pytest

from common import CLEAN_DAYS, clean_anchor, cycle_days
from economics import PARAMS, unit_economics
from forecast_anomaly import SIGNAL, forecast_unit


def _cycle_with_midcycle_replacement():
    """40 daily readings; days_since_replacement resets to 0 at row 30, like C01#4/D01#4."""
    n = 40
    dsr = list(range(1700, 1730)) + list(range(0, n - 30))
    return pd.DataFrame({
        "unit_id": ["C01"] * n,
        "bank_id": ["C"] * n,
        "cycle_id": [4] * n,
        "reading_date": pd.date_range("2020-06-19", periods=n, freq="D"),
        "days_since_replacement": dsr,
        "unit_n_delta_p": np.linspace(40.0, 46.0, n),
        SIGNAL: np.linspace(0.0, 6.0, n),
    })


def test_cycle_days_is_monotonic_even_when_replacement_resets():
    cyc = _cycle_with_midcycle_replacement()
    d = cycle_days(cyc).to_numpy(float)

    assert np.all(np.diff(d) >= 0), "cycle_days must never go backwards"
    assert d[0] == 0.0
    assert d[-1] == 39.0, "span must be the 40-day date range, not the ~1730 dsr range"

    # the column it replaces does exactly the wrong thing here
    dsr = cyc["days_since_replacement"].to_numpy(float)
    assert np.any(np.diff(dsr) < 0), "fixture must actually contain the reset"
    assert dsr.max() - dsr.min() > 1000, "fixture must actually show the stretched span"


def test_clean_anchor_uses_the_start_of_the_cycle_not_the_post_replacement_tail():
    cyc = _cycle_with_midcycle_replacement()
    anchor = clean_anchor(cyc, "unit_n_delta_p")

    early = cyc.iloc[: CLEAN_DAYS + 1]["unit_n_delta_p"]
    assert anchor == pytest.approx(early.mean())

    # Selecting by days_since_replacement would have grabbed the post-reset tail instead,
    # which sits at the fouled END of the cycle and gives a much higher "clean" baseline.
    tail = cyc[cyc["days_since_replacement"] <= CLEAN_DAYS]["unit_n_delta_p"]
    assert tail.mean() > anchor + 4.0


def test_forecast_slope_reflects_the_real_elapsed_days():
    cyc = _cycle_with_midcycle_replacement()
    res = forecast_unit(cyc)

    # 6.0 psi of deviation accrued over 39 days -> ~0.154/day.
    assert res["fouling_rate_per_day"] == pytest.approx(6.0 / 39.0, rel=0.02)
    # Against the ~1730-day dsr axis the same rise would look ~44x flatter.
    assert res["fouling_rate_per_day"] > 0.1


def test_latest_reading_is_the_latest_by_date():
    cyc = _cycle_with_midcycle_replacement()
    res = unit_economics(cyc, PARAMS)

    # last row by reading_date carries deviation 6.0; sorting by days_since_replacement
    # would have ended on row 29 (dsr 1729), whose deviation is ~4.46.
    assert res["dp_rise_psi"] == pytest.approx(6.0, abs=0.01)


def test_modules_agree_on_rise_over_clean():
    """003's deviation, 004's current_rise and 006's dp_rise_psi must be the same number."""
    cyc = _cycle_with_midcycle_replacement()

    fc = forecast_unit(cyc)
    econ = unit_economics(cyc, PARAMS)
    latest_deviation = cyc.sort_values("reading_date")[SIGNAL].iloc[-1]

    assert fc["current_rise"] == pytest.approx(latest_deviation, abs=0.01)
    assert econ["dp_rise_psi"] == pytest.approx(latest_deviation, abs=0.01)

"""
Test suite for the source-tracing backend (specs 003–007).

Strategy (agreed by the QA panel): synthetic DataFrames + pure functions, no BigQuery /
no 15k-row CSV / no physics solve. Priorities: (1) regression tests for the 12 bugs the
code review found, (2) honesty invariants (no bare 'nan', no self-contradiction, co-candidates,
reproducibility, 100% coverage), (3) the 003 deviation math.
"""
import numpy as np
import pandas as pd
import pytest

import common
import deviation
import forecast_anomaly as fc
import attribute as attr
import economics as econ
import fouling_validation as val
import assistant


# ── synthetic data ────────────────────────────────────────────────
def make_cycle(unit="A01", bank="A", cycle=1, stage=1, n=40, base=44.0, slope=0.05,
               rej_start=0.98, rej_slope=0.0, feed=None):
    """One cleaning cycle: monotonic ΔP fouling ramp + feed signals."""
    d0 = 100
    days = np.arange(n)
    rows = pd.DataFrame({
        "unit_id": unit, "bank_id": bank, "stage": stage, "cycle_id": cycle,
        "reading_date": [pd.Timestamp("2020-01-01") + pd.Timedelta(days=int(d)) for d in days],
        "days_since_replacement": d0 + days,
        "unit_n_delta_p": base + slope * days,
        "unit_recovery": 0.85,
        "percent_ec_removal": rej_start + rej_slope * days,
        "cip": False,
    })
    f = feed or {}
    for col, default in [("temp_c", 23.0), ("ec", 1500.0), ("ph", 6.9),
                         ("turb", 0.1), ("cl2_tot", 3.0), ("rof_toc_avg", 3.2)]:
        rows[col] = f.get(col, default)
    rows["salt_passage"] = 100.0 - rows["percent_ec_removal"] * 100.0
    return rows


# ── 003 deviation math + honesty invariants ───────────────────────
def test_add_deviation_is_value_minus_clean_anchor():
    df = make_cycle(base=44.0, slope=0.1, n=40)
    out = common.add_deviation(df, "unit_n_delta_p")
    anchor = common.clean_anchor(df, "unit_n_delta_p")
    # anchor = mean of first CLEAN_DAYS; deviation = raw - anchor
    assert anchor == pytest.approx(df.head(common.CLEAN_DAYS + 1)["unit_n_delta_p"].mean())
    assert out["unit_n_delta_p_deviation"].iloc[-1] == pytest.approx(
        df["unit_n_delta_p"].iloc[-1] - anchor)


def test_clean_anchor_thin_cycle_returns_none():
    df = make_cycle(n=2)  # <3 early points
    assert common.clean_anchor(df, "unit_n_delta_p") is None


def test_deviation_reproducible_and_full_coverage():
    df = make_cycle(n=40)
    a = deviation.compute(df)
    b = deviation.compute(df)
    # FR-016 reproducibility
    pd.testing.assert_frame_equal(a, b)
    # SC-001 coverage: every (reading × metric) yields a record
    assert len(a) == len(df) * len(deviation.METRICS)


def test_safe_std_guards_nan():
    # single-value series → std is NaN → must fall back to 1.0 (else out-of-range never fires)
    assert deviation._safe_std(pd.Series([5.0])) == 1.0
    assert deviation._safe_std(pd.Series([1.0, 3.0])) > 0


# ── 004 forecast NaN-safety + guards ──────────────────────────────
def test_forecast_is_nan_safe_with_gappy_signal():
    df = common.add_deviation(make_cycle(n=40, slope=0.1))
    df.loc[5, "unit_n_delta_p_deviation"] = np.nan  # inject a gap
    r = fc.forecast_unit(df)
    assert r is not None
    assert np.isfinite(r["fouling_rate_per_day"])   # never NaN → no "rising nan" in briefings

def test_forecast_trend_none_when_too_short():
    assert fc.robust_trend(np.arange(3.0), np.arange(3.0)) is None


# ── 005 attribution: oxidation threshold + no-significant + evidence ─
def test_oxidation_triggers_on_fractional_rejection_drop():
    # flat ΔP (no rise) + rejection 0.98 -> 0.95 (fractional -0.03). Old buggy threshold -0.2 missed this.
    df = make_cycle(n=40, slope=0.0, rej_start=0.98, rej_slope=-0.001)
    df = attr.percentile_ranks(df)
    r = attr.attribute_cycle(df)
    assert r["attributed_mechanism"] == "oxidation"
    assert r["confidence"] == "defensible"

def test_clean_cycle_is_no_significant_fouling():
    df = make_cycle(n=40, slope=0.0, rej_slope=0.0)  # nothing happens
    df = attr.percentile_ranks(df)
    r = attr.attribute_cycle(df)
    assert r["attributed_mechanism"] == "no-significant-fouling"

def test_fouled_cycle_gets_a_mechanism_with_evidence():
    df = make_cycle(n=40, slope=0.15)  # strong ΔP rise
    df = attr.percentile_ranks(df)
    r = attr.attribute_cycle(df)
    assert r["attributed_mechanism"] != "no-significant-fouling"
    assert r["ndp_rise"] > 0.5 and "confidence" in r


# ── 006 economics formula ─────────────────────────────────────────
def test_extra_sec_monotonic_and_zero_floor():
    assert econ.extra_sec_kwh_m3(0.0, econ.PARAMS) == 0.0
    assert econ.extra_sec_kwh_m3(-5.0, econ.PARAMS) == 0.0
    assert econ.extra_sec_kwh_m3(10.0, econ.PARAMS) > econ.extra_sec_kwh_m3(5.0, econ.PARAMS)


# ── 005 backtest empty-frame guard ────────────────────────────────
def test_backtest_no_cip_events_does_not_crash():
    df = make_cycle(n=40)  # cip all False → no events
    # API is cip_events() + evaluate_signal() (there is no single backtest()).
    assert val.cip_events(df).empty
    res = val.evaluate_signal(df, "unit_n_delta_p", 3.0)
    assert res["tps"] == 0 and res["fps"] == 0 and res["fns"] == 0


# ── 007 assistant: no bare 'nan', no self-contradiction ───────────
def test_briefing_never_prints_nan_or_contradiction():
    fc_df = pd.DataFrame([{  # a unit whose latest cycle could not be fit (NaN rate)
        "unit_id": "A01", "bank_id": "A", "cycle_id": 2,
        "fouling_rate_per_day": np.nan, "trend_r2": np.nan, "current_rise": np.nan,
        "days_to_clean": np.nan, "anomalies": 0}])
    att_df = pd.DataFrame([{  # only a no-significant row exists
        "unit_id": "A01", "cycle_id": 2, "attributed_mechanism": "no-significant-fouling",
        "confidence": "n/a", "ndp_rise": -0.4, "rej_change_pct": 0.1}])
    econ_df = pd.DataFrame([{
        "unit_id": "A01", "daily_energy_penalty_usd": 0.0, "cum_energy_penalty_usd": 0.0,
        "cip_cost_usd": 5000.0, "recommendation": "WAIT"}])
    text = assistant.brief("A01", fc_df, att_df, econ_df)
    assert "nan" not in text.lower()
    assert "significant cycle → no-significant" not in text
    assert "no significant-fouling cycle on record" in text

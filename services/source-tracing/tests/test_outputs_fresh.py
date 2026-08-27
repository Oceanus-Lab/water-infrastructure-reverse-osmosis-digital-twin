"""Guards against serving pipeline outputs that are older than the code that produces them.

This is the failure that actually happened. readings.csv was a byte-perfect extract of
BigQuery, but forecasts.csv and economics.csv were written at 19:56 while
forecast_anomaly.py and economics.py were finished at 23:18 and 01:11. Nobody re-ran
run_all.py, so the CSVs were missing five columns the code had since started emitting
(forecast_drivers, ci_lower, ci_upper, fouling_onset_score, anomalies_count) and the serving
API returned its "incomplete evidence" fallback for every unit — with no error anywhere.

Skips when data/ has not been generated, so a fresh clone still runs the suite.
"""
import pandas as pd
import pytest

from common import DATA

# The columns each module is expected to emit today. If a module gains an output and this
# list is not updated, the shape test below is what fails.
EXPECTED_COLUMNS = {
    "forecasts.csv": {
        "unit_id", "bank_id", "cycle_id", "fouling_rate_per_day", "trend_r2", "current_rise",
        "days_to_clean", "forecast_band_days", "ci_lower", "ci_upper", "forecast_drivers",
        "fouling_onset_score", "feature_attribution", "anomalies_count", "anomalies",
    },
    "economics.csv": {
        "unit_id", "bank_id", "cycle_id", "dp_rise_psi", "extra_sec_kwh_m3",
        "daily_energy_penalty_usd", "cum_energy_penalty_usd", "cip_cost_usd",
        "recommendation", "break_even_day", "provenance", "credibility",
    },
    "deviations.csv": {
        "unit_id", "cycle_id", "reading_date", "metric", "expected_clean", "actual",
        "deviation", "deviation_pct", "fidelity", "provenance", "resolution", "status",
    },
}

SOURCE_OF = {
    "forecasts.csv": "forecast_anomaly.py",
    "economics.csv": "economics.py",
    "deviations.csv": "deviation.py",
}

# Deliberately NOT an mtime comparison. `git checkout` stamps every file with the checkout
# time in no useful order, so "is the CSV older than the module?" is meaningless in CI and
# would fail on a fresh clone. The column and cross-module checks below detect the same
# staleness semantically: a CSV written by older code is missing columns, or its numbers no
# longer reconcile.


def _load(name: str) -> pd.DataFrame:
    f = DATA / name
    if not f.exists():
        pytest.skip(f"{name} not generated — run run_all.py")
    return pd.read_csv(f)


@pytest.mark.parametrize("name", sorted(EXPECTED_COLUMNS))
def test_output_has_every_column_its_module_emits(name):
    df = _load(name)
    missing = EXPECTED_COLUMNS[name] - set(df.columns)
    assert not missing, (
        f"{name} is missing {sorted(missing)} — it is stale relative to "
        f"{SOURCE_OF[name]}. Re-run `python run_all.py`."
    )


def test_the_three_modules_report_the_same_rise_over_clean():
    """003, 004 and 006 must agree per (unit, cycle) — the point of the shared clean anchor."""
    dev = _load("deviations.csv")
    fc = _load("forecasts.csv")
    econ = _load("economics.csv")

    dp = dev[dev["metric"] == "unit_n_delta_p"].dropna(subset=["deviation"])
    latest = dp.sort_values("reading_date").groupby(["unit_id", "cycle_id"]).tail(1)

    for name, df, col in (("004 current_rise", fc, "current_rise"),
                          ("006 dp_rise_psi", econ, "dp_rise_psi")):
        merged = df.merge(latest, on=["unit_id", "cycle_id"])
        assert not merged.empty, f"no overlap between {name} and deviations.csv"
        worst = (merged[col] - merged["deviation"]).abs().max()
        assert worst <= 0.011, (   # 0.01 = the rounding both sides apply
            f"{name} disagrees with 003 deviations.csv by up to {worst:.3f} across "
            f"{len(merged)} cycles"
        )

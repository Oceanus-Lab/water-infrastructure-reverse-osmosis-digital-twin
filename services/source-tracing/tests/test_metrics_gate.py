"""Unit tests for the fouling-backtest regression gate (eval/metrics_gate.py).

Pure-stdlib: runs in CI without pandas/numpy, so the gate that guards the model
is itself guarded by tests even when no real data is present.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "eval"))

from metrics_gate import evaluate  # noqa: E402

BASELINE = {
    "leading_indicator": "salt_passage",
    "metrics": {"precision": 0.5, "recall": 0.211, "median_lead_days": 39.0},
    "max_regression": {"precision": 0.05, "recall": 0.05, "median_lead_days": 5.0},
}


def _report(signal="salt_passage", precision=0.5, recall=0.211, lead=39.0):
    return {
        "leading_indicator": {
            "signal": signal,
            "precision": precision,
            "recall": recall,
            "median_lead_days": lead,
        }
    }


def test_pass_when_equal_to_baseline():
    ok, warns, _ = evaluate(_report(), BASELINE)
    assert ok is True
    assert warns == []


def test_pass_when_strictly_better():
    ok, _, _ = evaluate(_report(precision=0.7, recall=0.4, lead=50.0), BASELINE)
    assert ok is True


def test_pass_within_tolerance():
    # precision 0.46 sits above the floor (0.50 - 0.05 = 0.45)
    ok, _, _ = evaluate(_report(precision=0.46), BASELINE)
    assert ok is True


def test_fail_precision_regression():
    ok, _, rows = evaluate(_report(precision=0.40), BASELINE)  # floor 0.45
    assert ok is False
    assert any(r[0] == "precision" and r[4] == "REGRESSED" for r in rows)


def test_fail_lead_time_regression():
    ok, _, _ = evaluate(_report(lead=30.0), BASELINE)  # floor 34.0
    assert ok is False


def test_fail_on_missing_metric():
    ok, _, rows = evaluate(_report(lead=None), BASELINE)
    assert ok is False
    assert any(r[0] == "median_lead_days" and r[4] == "MISSING" for r in rows)


def test_warn_on_signal_change_but_metrics_ok():
    ok, warns, _ = evaluate(_report(signal="unit_n_delta_p"), BASELINE)
    assert ok is True
    assert any("leading signal changed" in w for w in warns)

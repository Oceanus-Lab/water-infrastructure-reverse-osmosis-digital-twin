#!/usr/bin/env python3
"""
Model-quality regression gate for the fouling early-warning backtest (spec 005).

Turns the one-shot 71-CIP backtest into a repeatable CI guard: compares a freshly
produced ``validation_report.json`` against a committed baseline and fails
(exit 1) if the leading-indicator metrics regress beyond the allowed tolerance.

Semantics
---------
* precision, recall, median_lead_days are all "higher is better".
* A regression is ``current < baseline - max_regression`` (the floor).
* A missing metric is a failure — the gate never passes on absent evidence.
* A change in the *chosen* leading signal is reported as a WARN, not a failure
  (the metrics still have to clear their floors).

Depends only on the standard library, so it runs in CI without pandas/numpy.

Usage
-----
    python metrics_gate.py \
        --report data/validation_report.json \
        --baseline eval/baseline_metrics.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

METRICS = ("precision", "recall", "median_lead_days")


def load_json(path: str | Path) -> dict:
    return json.loads(Path(path).read_text())


def leading_metrics(report: dict) -> dict:
    """Pull the leading-indicator block out of a validation_report.json."""
    li = report.get("leading_indicator") or {}
    return {
        "signal": li.get("signal"),
        "precision": li.get("precision"),
        "recall": li.get("recall"),
        "median_lead_days": li.get("median_lead_days"),
    }


def evaluate(report: dict, baseline: dict):
    """Compare a report against the baseline.

    Returns ``(ok, warnings, rows)`` where each row is
    ``(metric, baseline, floor, current, status)`` and status is one of
    ``ok`` / ``REGRESSED`` / ``MISSING``.
    """
    cur = leading_metrics(report)
    base = baseline["metrics"]
    tol = baseline.get("max_regression", {})
    rows, warnings = [], []
    ok = True

    for m in METRICS:
        b = base.get(m)
        floor = None if b is None else round(b - tol.get(m, 0.0), 6)
        c = cur.get(m)
        if c is None:  # no silent pass on absent evidence
            rows.append((m, b, floor, None, "MISSING"))
            ok = False
            continue
        status = "ok" if (floor is None or c >= floor) else "REGRESSED"
        if status == "REGRESSED":
            ok = False
        rows.append((m, b, floor, round(float(c), 6), status))

    expected_signal = baseline.get("leading_indicator")
    if expected_signal and cur.get("signal") and cur["signal"] != expected_signal:
        warnings.append(
            f"leading signal changed: {expected_signal} -> {cur['signal']} "
            "(review whether the baseline should move)"
        )
    return ok, warnings, rows


def _fmt(v) -> str:
    return "—" if v is None else f"{v:.3f}"


def format_report(rows, warnings) -> str:
    lines = [
        f"{'metric':<18}{'baseline':>10}{'floor':>10}{'current':>10}  status",
        "-" * 60,
    ]
    for metric, base, floor, current, status in rows:
        lines.append(
            f"{metric:<18}{_fmt(base):>10}{_fmt(floor):>10}{_fmt(current):>10}  {status}"
        )
    for w in warnings:
        lines.append(f"WARN  {w}")
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Fouling backtest regression gate.")
    ap.add_argument("--report", required=True, help="path to a produced validation_report.json")
    ap.add_argument("--baseline", required=True, help="path to eval/baseline_metrics.json")
    args = ap.parse_args(argv)

    report = load_json(args.report)
    baseline = load_json(args.baseline)
    ok, warnings, rows = evaluate(report, baseline)

    print(format_report(rows, warnings))
    if ok:
        print("\nPASS — no metric regressed beyond tolerance.")
        return 0
    print(
        "\nFAIL — a metric regressed beyond tolerance (or is missing). "
        "If this change is intended, update eval/baseline_metrics.json deliberately."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())

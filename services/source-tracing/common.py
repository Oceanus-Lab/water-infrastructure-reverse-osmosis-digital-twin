"""Shared data loading for the RO twin backend prototype (specs 003–007)."""
from __future__ import annotations
import pathlib
import pandas as pd

HERE = pathlib.Path(__file__).parent
DATA = HERE / "data"
CSV = DATA / "readings.csv"


def load_readings() -> pd.DataFrame:
    if not CSV.exists():
        raise SystemExit(f"missing {CSV} — run the bq extract first (see README)")
    df = pd.read_csv(CSV, parse_dates=["reading_date"])
    df["cip"] = df["cip"].astype(str).str.lower().eq("true")
    # salt passage (%) is the fouling-relevant inverse of EC removal
    df["salt_passage"] = 100.0 - df["percent_ec_removal"] * 100.0
    return df.sort_values(["unit_id", "reading_date"]).reset_index(drop=True)


# ── the 003 confound-free deviation = the single shared bus (spec 004 FR-007 / SC-005) ──
CLEAN_DAYS = 10   # first N days of a cleaning cycle define the freshly-cleaned anchor (matches deviation.py)


def cycle_days(cyc: pd.DataFrame) -> pd.Series:
    """Days elapsed since the start of this cleaning cycle, measured from reading_date.

    Use this as the time axis, never `days_since_replacement`. That column counts from the
    last membrane REPLACEMENT, not the last CIP, so it resets to 0 partway through a cycle
    whenever a membrane is swapped. Two of the 92 OCWD cycles (C01#4, D01#4) do exactly that:
    both actually run ~130 days, but sorting them by days_since_replacement reorders their
    readings and stretches the span to ~1750 — which corrupted the fouling slope, the
    clean-anchor window, and the "latest reading" every downstream module picked.
    """
    d = pd.to_datetime(cyc["reading_date"])
    return (d - d.min()).dt.days.astype(float)


def clean_anchor(cyc: pd.DataFrame, col: str) -> float | None:
    """Expected clean-membrane value for a cycle = mean over its freshly-cleaned start.
    ONE definition, shared by 003/004/005/006 so every 'rise over clean' number reconciles."""
    early = cyc[cycle_days(cyc) <= CLEAN_DAYS]
    vals = early[col].dropna()
    return float(vals.mean()) if len(vals) >= 3 else None


def add_deviation(df: pd.DataFrame, col: str = "unit_n_delta_p") -> pd.DataFrame:
    """Compute the 003 deviation (value − clean anchor) per (unit, cycle) in-process.

    Use this when the anchor must be derived from exactly the rows you were given — the
    serving API's as-of-date path, where anything else would leak the future: early in a
    cycle the full-cycle 10-day anchor is itself made of readings that have not happened yet.

    For the batch pipeline use `load_deviation_bus` instead, so 003 stays the single producer.
    """
    df = df.copy()
    anchors = {(u, c): clean_anchor(cyc, col) for (u, c), cyc in df.groupby(["unit_id", "cycle_id"])}
    keys = list(zip(df["unit_id"], df["cycle_id"]))
    df[f"{col}_anchor"] = [anchors.get(k) for k in keys]
    df[f"{col}_deviation"] = df[col] - df[f"{col}_anchor"]
    return df


DEVIATIONS_CSV = DATA / "deviations.csv"


def load_deviation_bus(df: pd.DataFrame, col: str = "unit_n_delta_p") -> pd.DataFrame:
    """Attach the 003 deviation by JOINING `deviations.csv` — 003 is the single producer.

    004 and 006 used to recompute the same quantity through `add_deviation`. The numbers
    agreed, but 003 stayed a dead-end output: when `deviation.py` upgrades a cycle's baseline
    from the analytical clean anchor to the WaterTAP `fidelity="high"` physics baseline,
    recomputing downstream would silently ignore it. Joining makes that upgrade propagate,
    and carries the per-row fidelity/provenance with it.

    `deviations.csv` stores `deviation` already oriented so positive == worse health. For
    `unit_n_delta_p` (worse == "up") that is the raw rise, which is what 004/006 want.

    Falls back to computing in-process when the file is absent (first run) or does not cover
    these rows, so the modules still work standalone.
    """
    if not DEVIATIONS_CSV.exists():
        return add_deviation(df, col)

    dev = pd.read_csv(DEVIATIONS_CSV, parse_dates=["reading_date"])
    dev = dev[dev["metric"] == col][
        ["unit_id", "cycle_id", "reading_date", "expected_clean", "deviation", "fidelity"]
    ]
    out = df.merge(dev, on=["unit_id", "cycle_id", "reading_date"], how="left")
    if out["deviation"].notna().sum() == 0:      # stale or mismatched file — don't serve nulls
        return add_deviation(df, col)

    out[f"{col}_anchor"] = out.pop("expected_clean")
    out[f"{col}_deviation"] = out.pop("deviation")
    out[f"{col}_fidelity"] = out.pop("fidelity")
    return out

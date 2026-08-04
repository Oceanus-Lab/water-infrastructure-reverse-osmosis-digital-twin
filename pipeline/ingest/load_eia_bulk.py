#!/usr/bin/env python3
"""
Load EIA electricity price and generation mix from the Total Energy BULK download.

Why bulk instead of `fetch_eia.py`'s API calls: the replay window is fixed history
(2019-01-01 .. 2021-01-13). A bulk file needs no API key, has no rate limit, and re-running
it produces byte-identical tables — which the API path cannot promise. `fetch_eia.py` remains
the right tool for keeping the data current.

    https://www.eia.gov/opendata/bulk/TOTAL.zip

HONESTY — this dataset is US NATIONAL, not California. OCWD is in Fountain Valley, CA, and
`fetch_eia.py` requests `stateid=CA` for that reason. The Total Energy bulk file contains no
state-level series (checked: 0 of its 2,210 series mention California). Rows are therefore
written with `state_id = 'US'` and every downstream consumer can see that it is a national
proxy rather than the local tariff. Over the replay window the US commercial average is
~10.6 cents/kWh; California's commercial tariff runs materially higher, so LCOW built on this
is a floor, not an estimate of what OCWD pays.

Usage:
    python load_eia_bulk.py --source ~/Downloads/total.zip
    GOOGLE_CLOUD_PROJECT=my-proj python load_eia_bulk.py --source TOTAL.txt --dry-run
"""
from __future__ import annotations

import argparse
import io
import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "spatial-cat-489006-a4")
DATASET_ID = os.environ.get("BQ_RAW_DATASET", "ro_raw")

# Sector price series. Commercial is the one economics.py consumes; the others are loaded so
# a later scenario ("what if this plant were billed industrial?") does not need a re-ingest.
PRICE_SERIES = {
    "TOTAL.ESCMUUS.M": "commercial",
    "TOTAL.ESICUUS.M": "industrial",
    "TOTAL.ESRCUUS.M": "residential",
    "TOTAL.ESTCUUS.M": "all_sectors",
}

# Electric power sector net generation by fuel, monthly. Used for the carbon intensity factor.
GENERATION_SERIES = {
    "TOTAL.CLEGPUS.M": "coal",
    "TOTAL.NGEGPUS.M": "natural_gas",
    "TOTAL.PAEGPUS.M": "petroleum",
    "TOTAL.NUEGPUS.M": "nuclear",
    "TOTAL.HVEGPUS.M": "hydro",
    "TOTAL.WYEGPUS.M": "wind",
    "TOTAL.SOEGPUS.M": "solar",
    "TOTAL.GEEGPUS.M": "geothermal",
    "TOTAL.WDEGPUS.M": "wood",
    "TOTAL.WSEGPUS.M": "waste",
}

STATE_ID = "US"     # see the module docstring — national proxy, deliberately not "CA"


def read_series(source: Path) -> dict[str, dict]:
    """Return {series_id: series object} for the series we care about.

    The file is ~11 MB of NDJSON with 2,210 series, so it is streamed line by line and only
    the handful we need are retained.
    """
    wanted = set(PRICE_SERIES) | set(GENERATION_SERIES)
    found: dict[str, dict] = {}

    if source.suffix == ".zip":
        with zipfile.ZipFile(source) as z:
            names = [n for n in z.namelist() if n.upper().endswith(".TXT")]
            if not names:
                raise SystemExit(f"no .txt inside {source}")
            handle: io.TextIOBase = io.TextIOWrapper(z.open(names[0]), encoding="utf-8")
            with handle as f:
                found = _scan(f, wanted)
    else:
        with source.open(encoding="utf-8") as f:
            found = _scan(f, wanted)

    missing = wanted - set(found)
    if missing:
        print(f"Warning: {len(missing)} series not present in the file: {sorted(missing)}")
    return found


def _scan(f, wanted: set[str]) -> dict[str, dict]:
    found = {}
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue                      # the bulk file carries a trailing metadata line
        sid = obj.get("series_id")
        if sid in wanted:
            found[sid] = obj
            if len(found) == len(wanted):
                break
    return found


def _number(value) -> float | None:
    """EIA encodes a missing observation as the string 'NA', not null."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _period_to_date(period: str) -> str | None:
    """EIA monthly periods are YYYYMM; represent them as the first of the month."""
    try:
        return datetime.strptime(period, "%Y%m").date().isoformat()
    except ValueError:
        return None


def build_rows(series: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    ingest_time = datetime.now(timezone.utc).isoformat()

    prices = []
    for sid, sector in PRICE_SERIES.items():
        obj = series.get(sid)
        if not obj:
            continue
        for period, raw in obj.get("data", []):
            date, value = _period_to_date(period), _number(raw)
            if date is None or value is None:
                continue
            prices.append({
                "date": date,
                "state_id": STATE_ID,
                "sector": sector,
                "price_cents_per_kwh": value,
                "ingest_timestamp": ingest_time,
            })

    generation = []
    for sid, fuel in GENERATION_SERIES.items():
        obj = series.get(sid)
        if not obj:
            continue
        for period, raw in obj.get("data", []):
            date, value = _period_to_date(period), _number(raw)
            if date is None or value is None:
                continue
            generation.append({
                "date": date,
                "state_id": STATE_ID,
                "fuel_type": fuel,
                # Total Energy reports generation in billion kWh; the curated layer wants MWh.
                "generation_mwh": value * 1_000_000.0,
                "ingest_timestamp": ingest_time,
            })

    return prices, generation


def load(rows: list[dict], table: str, schema) -> None:
    from google.cloud import bigquery

    client = bigquery.Client(project=PROJECT_ID)
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{table}"
    # WRITE_TRUNCATE so re-running is idempotent — this is a full historical snapshot, not an
    # append-only feed, and duplicate months would quietly double the generation mix.
    job = client.load_table_from_json(
        rows, table_id,
        job_config=bigquery.LoadJobConfig(schema=schema,
                                          write_disposition="WRITE_TRUNCATE"),
    )
    job.result()
    print(f"  {table_id}: {len(rows):,} rows")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="TOTAL.zip or TOTAL.txt from EIA bulk")
    ap.add_argument("--dry-run", action="store_true", help="parse and summarise, write nothing")
    args = ap.parse_args()

    source = Path(args.source).expanduser()
    if not source.exists():
        raise SystemExit(f"not found: {source}")

    print(f"Reading {source}")
    series = read_series(source)
    prices, generation = build_rows(series)

    span = lambda rows: (min(r["date"] for r in rows), max(r["date"] for r in rows)) if rows else ("-", "-")
    print(f"  prices     : {len(prices):,} rows  {span(prices)[0]} .. {span(prices)[1]}  "
          f"({len(PRICE_SERIES)} sectors)")
    print(f"  generation : {len(generation):,} rows  {span(generation)[0]} .. {span(generation)[1]}  "
          f"({len(GENERATION_SERIES)} fuels)")
    print(f"  state_id   : {STATE_ID}  (US national proxy — see module docstring)")

    if args.dry_run:
        print("dry run — nothing written")
        return

    from google.cloud import bigquery

    print(f"Loading into {PROJECT_ID}.{DATASET_ID}")
    load(prices, "eia_prices_raw", [
        bigquery.SchemaField("date", "DATE"),
        bigquery.SchemaField("state_id", "STRING"),
        bigquery.SchemaField("sector", "STRING"),
        bigquery.SchemaField("price_cents_per_kwh", "FLOAT"),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP"),
    ])
    load(generation, "eia_generation_mix_raw", [
        bigquery.SchemaField("date", "DATE"),
        bigquery.SchemaField("state_id", "STRING"),
        bigquery.SchemaField("fuel_type", "STRING"),
        bigquery.SchemaField("generation_mwh", "FLOAT"),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP"),
    ])


if __name__ == "__main__":
    main()

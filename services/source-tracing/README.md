# Source-Tracing Backend — specs 003→007 (prototype)

Runnable prototype of the RO digital-twin's backend/AI brains, built on the real OCWD
history (15,624 readings · 21 units · 71 CIP events) in `ro_curated.unit_readings`. Somi's
scope. Each module runs on real data and is honest about what the data can and cannot support.

The through-line is **fouling source-tracing**: not just *that* a unit is fouling and *when*
to clean it, but *which feed-side mechanism* is driving it — grounded in cited membrane-science
standards (see [`EVIDENCE.md`](EVIDENCE.md)).

## Modules

| Spec | File | What it does |
|---|---|---|
| **003** physics deviation | `deviation.py` | Confound-free deviation per reading vs a clean-cycle anchor (analytical, all readings) + a **high-fidelity WaterTAP `ReverseOsmosis0D`** clean baseline (BWRO, solves `optimal`). Provenance + fidelity + out-of-range on every record. |
| **004** forecast & anomaly | `forecast_anomaly.py` + **`forecast_bq.sql`** | Per-cycle fouling trend → **projected days-to-clean** + rolling-MAD **anomaly** early-warning (offline twin). `forecast_bq.sql` is the **architecture-aligned** path — BigQuery `AI.FORECAST` (TimesFM) + `AI.DETECT_ANOMALIES` in-SQL, verified on real data (AGENTS.md: BQ is the primary AI compute layer). |
| **005** fouling validation | `fouling_validation.py` | **Lead-time backtest** against the 71 real CIP events (catch-rate, median lead time) + **mechanism attribution** with measured/modeled labels and co-candidates. |
| **006** economics | `economics.py` | Delta-first **clean-now-vs-wait**: fouling energy penalty vs CIP cost (6 editable params). |
| **007** AI assistant | `assistant.py` | Advise-only **decision briefings** composing 003–006 with evidence on every number (no-hallucinated-numbers). |

## Run

```bash
# 1. env (once): py3.11 venv + WaterTAP 1.6.0 + Ipopt solver
#    uv venv --python python3.11 ../../.venv-watertap-spike
#    uv pip install --python ../../.venv-watertap-spike/bin/python watertap==1.6.0
#    ../../.venv-watertap-spike/bin/idaes get-extensions   # fetches the Ipopt solver (pip installs do NOT bundle it)

# 2. data (once): extract real readings from BigQuery → data/readings.csv
#    bq --project_id=spatial-cat-489006-a4 query --nouse_legacy_sql --format=csv --max_rows=20000 \
#      'SELECT unit_id,bank_id,stage,reading_date,temp_c,ec,ph,turb,cl2_tot,rof_toc_avg,
#              unit_n_delta_p,unit_recovery,percent_ec_removal,days_since_replacement,cip,cycle_id
#       FROM `spatial-cat-489006-a4.ro_curated.unit_readings` ORDER BY unit_id,reading_date' > data/readings.csv

# 3. run the whole pipeline
../../.venv-watertap-spike/bin/python run_all.py
```

Outputs land in `data/` (deviations, forecasts, attributions, economics, briefings, chart PNG).
`data/*.csv` are gitignored — regenerate from BigQuery with step 2.

## Honesty boundary (data-limited, stated not hidden)

The feed signals are temp, EC (TDS proxy), pH, turbidity, total chlorine, TOC. With these we
attribute at the **mechanism level** (scaling / particulate / biofouling / organic / oxidation).
We **cannot** speciate the exact scale, separate biofouling from organic fouling, treat turbidity
as ASTM SDI, or treat total chlorine as free chlorine. Closing those needs added instrumentation
(individual-ion analysis, SDI, AOC/ATP, free-Cl₂/ORP) — see `EVIDENCE.md` feasibility verdict.
Production compute path per `AGENTS.md`: BigQuery in-SQL AI (`AI.FORECAST`, `AI.DETECT_ANOMALIES`)
+ Gemini Agent Platform for orchestration; these local modules are the runnable prototype.

## Known limitations (prototype, honest)

- **The clean baseline is now one definition** — `common.clean_anchor` (mean over the first
  `CLEAN_DAYS` of a cycle). 003 re-exports it and 004/006 consume `common.add_deviation`'s
  output directly instead of re-deriving an anchor from the first 5 readings. 003's
  `deviations.csv`, 004's `current_rise` and 006's `dp_rise_psi` agree on all 92 cycles to
  within rounding, so the numbers reconcile for an operator cross-checking them.
- **003's `deviations.csv` is still not the literal input to 004–006.** They recompute the
  same deviation via the shared helper rather than reading the file, so the WaterTAP
  high-fidelity baseline does not yet propagate down the chain. That remains the next step.
- **Time is measured from `reading_date`, not `days_since_replacement`.** The latter counts
  from the last membrane *replacement* and resets mid-cycle when one is swapped (C01#4,
  D01#4). Use `common.cycle_days` for any per-cycle time axis.
- **Lead-time is threshold/anchor-dependent.** The 005 catch-rate and lead time move with
  `WARN_RISE` and the anchor choice; they are reported as measured-from-history, not as tuned
  targets.
- **`baseline_error` is leave-one-out**, so it is a held-out number rather than the clean
  window's own spread. It is larger than the previous in-sample figure by construction.

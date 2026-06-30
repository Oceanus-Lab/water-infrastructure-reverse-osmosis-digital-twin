# Validation & Live-Replay
**Brief for:** the two credibility deliverables — proving the twin is *live-ready* (honestly) and *correct* (against reality)
**Feeds into:** implementation plan ([07](07-implementation-plan.md)), data pipeline ([02](02-data-pipeline.md)), physics engine ([03](03-physics-engine.md)), GCP infra ([05](05-gcp-infrastructure.md)), agent eval ([04](04-ai-agent.md))
**Answers plan-review findings:** C1 (live-twin claim), H2 / M1 (validation gap + headline metric)

---

## Why this doc exists

A digital twin earns the name on two properties a dashboard does not have:

1. **A live digital thread** — it synchronizes with its physical counterpart in (near) real time.
2. **Validated fidelity** — its baselines and predictions are checked against the real asset, not asserted.

The prototype runs on a **static historical record** (OCWD, `2019-01-01 → 2021-01-13`, batch). That is fine — but only if we are honest about it and *demonstrate the live-ready spine* rather than claiming a live feed we don't have. This doc specifies how we do both:

- **Live-Replay** turns the honest weakness ("it's historical") into a strength ("here's exactly how it runs in production").
- **Validation** turns asserted accuracy into an evidence-backed headline number, using the **71 labeled CIP events we already own**.

> **Maturity statement (say this out loud):** today the system sits at **descriptive → diagnostic → predictive** — a **digital shadow** on a **live-ready architecture**. Bidirectional / prescriptive control is roadmap, consistent with the advise-only governance in [04-ai-agent.md](04-ai-agent.md).

---

## Part A — Live-Replay (addresses C1)

### Principle

The pipeline is event-driven and live-ready. The prototype's "live" feeling comes from a **clock-driven replay harness** that streams the real OCWD history through the *same* path a production SCADA feed would use. Only the **source connector** differs between prototype and production.

```
Prototype "live": OCWD history → REPLAY harness → Pub/Sub (ro-readings) → BigQuery → agent / twin UI / anomaly path
Production:       Plant SCADA / OPC-UA / MQTT  → Pub/Sub (ro-readings) → BigQuery → (identical downstream)
```

### Replay harness contract

| Aspect | Specification |
|---|---|
| Input | Curated OCWD rows, ordered by `reading_date` (and `unit_id`) |
| Clock | Configurable acceleration — wall-clock seconds → simulated days (default ≈ 1 sim-day / 3–5 s) |
| Output | One message per (unit, reading) to Pub/Sub topic `ro-readings`; payload = harmonized core schema row + `event_time` |
| Sink | Pub/Sub → BigQuery streaming insert into `ro_curated.unit_readings` (same table batch load writes) |
| Idempotency | Message key = `unit_id + reading_date`; downstream upsert tolerates replays/restarts |
| Demo control | Start / pause / seek-to-date endpoints (or Cloud Run Job args) so a demo can jump to an interesting cycle |
| Production swap-in | Replace the harness with a SCADA/OPC-UA/MQTT connector publishing to the **same** `ro-readings` topic; nothing downstream changes |

### Deployment

- `replay-harness` as a **Cloud Run Job** (or a small service exposing start/stop for live demos) — see [05-gcp-infrastructure.md](05-gcp-infrastructure.md).
- Topic `ro-readings`; BigQuery streaming insert; partition by `DATE(reading_date)`, cluster `(bank_id, unit_id, stage)`.
- For the demo, the harness can run **one bank** (vertical slice) before fanning out to all seven.

### Honesty guardrails

- The UI and agent label the data source as **"Replay — historical OCWD"** with the current sim-clock date visible. We never imply a live plant connection.
- "Right now" in agent answers means **"as of the replay clock"** — legitimate, because the stream is genuinely flowing; the anti-stale cache guard in [04](04-ai-agent.md) already bypasses cache for live-state questions.

---

## Part B — Validation (addresses H2 / M1)

We own the answer to "is the twin correct?": **71 labeled CIP (clean-in-place) events.** A CIP is the operator's own decision that fouling had reached the point of action — a real, human-validated ground-truth label. Two validations follow.

### B1 — Anomaly / fouling-detector backtest (the headline metric)

**Goal:** quantify how early, and how reliably, the fouling detector would have warned the operator before each real CIP.

**Ground truth.** Each CIP event = a `cip` flag transition; it also resets the `dss` (days-since-cleaning) saw-tooth. Fouling is **cyclical, not age-monotonic** — segment every series into clean→CIP cycles using `dss`, never absolute membrane age.

**Detector under test (design).** `AI.DETECT_ANOMALIES` over the **Δ between the WaterTAP clean-membrane baseline and the actual reading** — WaterTAP predicts what a *clean* membrane would produce at each day's actual temperature, pressure, and feed, so the Δ normalizes out operating-condition drift. The primary observable is **`stage_3_flux` decline** (see signal-discovery below); `total_kw` rise corroborates on F–G. Two traps a naive detector falls into, both confirmed on the data:
- The plant **holds recovery at a fixed setpoint** (`unit_recovery` ≈ 0.850, std 0.001) — recovery is a *control variable, not a fouling signal*. Never use it as a degradation feature.
- **Raw `unit_dp`/`total_kw` are temperature-confounded** (warmer feed → lower viscosity → lower ΔP, *masking* fouling); `corr(dss, unit_dp)` is even **negative** on some Bank F stages. The WaterTAP-Δ is what removes this confound — *the edge a pure data-driven detector lacks here.*

> **Status:** the WaterTAP-Δ detector + calibrated backtest is **deferred to implementation** (milestones V-2 / V-3 / B2). The numbers in *Signal-discovery findings* below come from a fast **data-only proxy**, used only to identify which variable carries the signal — **not** the physics detector.

**Procedure.**
1. For each clean→CIP cycle, run the detector forward from the post-CIP clean state.
2. Define an **alert** as *k* consecutive anomalous days (default k = 3) to suppress single-day noise.
3. **Lead time** = days between the first sustained alert and the actual CIP date.
4. A **true positive** = a sustained alert within a horizon window (default 30 days) preceding a CIP; alerts with no CIP inside the horizon = **false positives**.

**Metrics reported.**

| Metric | Definition | Pitch use |
|---|---|---|
| Median lead time | Median days the alert precedes the real CIP | "alerts a median of **N days** early" |
| Precision | TP / (TP + FP) | "at **X%** precision" |
| Recall | CIPs preceded by an alert / 71 | coverage of real events |
| Lead-time distribution | P10 / P50 / P90 | honesty about variance |

**Headline sentence (template — to be finalized from the WaterTAP-Δ run):**
> *"Our physics-grounded detector flags fouling onset in **~79%** of cleaning cycles; the gap from onset to the operator's actual CIP averages **~140 days**, a window in which the membrane runs at a measured **~9%** energy penalty — exactly the clean-now-or-wait trade-off the agent quantifies."*
>
> Phrased as **decision-window economics**, not as foresight the operator lacked. A precision/lead-time "alerts N days early" claim is **avoided** — see why in signal-discovery below.

**Confounders to disclose (not hide):**
- Some CIPs may be **scheduled/preventive**, not fouling-driven → these depress apparent lead time; flag if identifiable.
- **Temperature confounding is real** — never run the detector on raw ΔP/energy; normalize first (`unit_n_delta_p` / WaterTAP Δ). A naive raw-signal detector will look broken on this data.
- `dss` cycle boundaries must be clean; drop partial cycles at the series edges (dataset starts/ends mid-cycle).
- Tune k and horizon as **pre-registered** parameters, not fit-to-pretty-number after the fact.

**Signal-discovery findings (proxy backtest, all 21 units, 2026-07-01).**
_Fast pass using a **data-only** clean baseline (each cycle's first-7-day `stage_3_flux` median) instead of WaterTAP, purely to find which variable carries the signal. **Provisional** — to be re-run against the WaterTAP-Δ in implementation._
- **`stage_3_flux` is the fouling signal:** clean→pre-CIP shift of **−28%** (effect size **−0.93**, strongest of 12 candidates) — the last stage sees the most concentrated feed, so it scales first. `stage_2_flux` rises (+0.79, flow redistributes upstream); `total_kw` rises **+9%** (measured energy penalty); `unit_n_delta_p` is weak (+0.18); recovery / EC-removal / TOC-removal ≈ 0.
- **Detection:** a sustained ≥10% stage-3 flux decline flags **79% of 92 observed cycles** (k = 3 days).
- **Not an "early-warning" claim:** the decline is detectable at a median **dss ≈ 36**, while the CIP lands at median **dss ≈ 179** (baseline-spike check: only +3.4%, so not an artifact). CIPs here are **not** triggered by a 10% flux loss — operators tolerate it deliberately. Honest, stronger framing: detection marks **fouling onset**, and the **~140-day onset→CIP gap is the decision window** where the +9% energy penalty accrues = the clean-now-or-wait economics, grounded in measured behavior.
- **Caveats:** 92 dss-reset cycles vs 71 labelled `cip` events (reconcile cycle definition to the flag); a true "CIP-imminent" predictor needs the WaterTAP-Δ plus the severe threshold operators actually respond to (prescriptive roadmap).

### B2 — WaterTAP clean-baseline validation

**Goal:** show the physics baseline matches reality in the **clean** state (small `dss`, just after a CIP), which is the anchor every fouling Δ is measured from.

**Procedure.** For low-`dss` readings, compare WaterTAP-predicted flux / `unit_dp` / SEC against OCWD actuals; report **MAPE** per quantity. This doubles as the acceptance check for the WaterTAP A/B-coefficient calibration in [07](07-implementation-plan.md) Phase 4.

**Reporting rule (from the economics honesty principle):** every figure is labeled **measured vs. modeled**. The baseline is modeled; the actuals are measured; the Δ is the diagnostic signal.

---

## Named milestones

| ID | Milestone | Acceptance criteria | Maps to |
|---|---|---|---|
| **V-1** | Replay harness streams one bank | Bank's history flows `harness → ro-readings → ro_curated.unit_readings`; sim-clock visible | C1, H1 |
| **V-2** | Fouling score computed in-place | `fouling_scores` populated as Δ vs WaterTAP baseline over the live stream | H2 |
| **V-3** | CIP backtest → headline metric | Median lead time + precision + recall reported over all 71 CIP events, with k / horizon pre-registered | H2, M1 |
| **V-4** | WaterTAP clean-baseline MAPE | Per-quantity MAPE on low-`dss` readings; calibration acceptance gate | H2 |
| **V-5** | Demo control + production swap-in note | Pause/seek works; SCADA swap-in documented as one connector change | C1 |

---

## Honesty caveat (read before quoting any number)

The backtest is a **real experiment with an unknown result.** The detector might lead the CIP by 10 days — or by 2. We commit to running V-3 **before** any lead-time/precision number goes into a doc, a deck, or a demo script. Evidence first, claim second. A modest, true number ("2 days early at 85% precision") beats an impressive, unverified one.

---

## What this is *not* (scope guard)

- Not a live SCADA integration (roadmap — Part A documents the swap-in point).
- Not drift/retraining (named as a gap in [2026-06-30-plan-review.md](2026-06-30-plan-review.md) blindspots; defer with intent).
- Not element-level spatial diagnosis — the 0D model cannot localize *which* element scales; the agent must not claim it (M2).

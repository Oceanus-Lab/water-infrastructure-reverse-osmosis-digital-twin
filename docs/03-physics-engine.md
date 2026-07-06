# Physics Engine — WaterTAP Integration
**Brief for:** WaterTAP Cloud Run service implementation, PhysicsEngine abstraction, calibration  
**Feeds into:** Physics service coding agent, Cloud Run deployment

---

## Decision

**ADOPT WaterTAP as primary physics engine.** ✅ Validation spike passed 2026-06-30.

> All 4 gates passed on Python 3.11 / macOS ARM64. Solve latency ~2s — viable for on-demand what-if via Cloud Run Service.

---

## Library

| Item | Value |
|---|---|
| Package | `watertap` (PyPI) |
| Version | 1.6.0 |
| Dependencies | `idaes-pse` 2.12.0, `pyomo` 6.10.1, `watertap-solvers` 24.12.9 |
| Solver | Ipopt 3.13.2 — **bundled via `watertap-solvers`** if using conda. For **pip/uv** installs, you MUST run `idaes get-extensions` to fetch the binary. |
| Python requirement | 3.11 (3.9–3.12 supported; 3.13+ not yet) |
| Install | `pip install watertap` — self-contained |

---

## Model Variant: BWRO (Brackish Water RO)

Confirmed for Municipal/Industrial BWRO platform — matches OCWD dataset exactly.

| Parameter | Value |
|---|---|
| Feed source | Groundwater / municipal tap / reclaimed water |
| Feed TDS | 100–2,000 ppm (OCWD: ~500–1,500 ppm) |
| Operating pressure | 150–600 psi (10–41 bar) |
| Recovery rate | 70–85% |
| SEC | 0.3–1.0 kWh/m³ |
| Unit model | `ReverseOsmosis0D` (single-stage, 0D lumped) |
| Property model | `NaClParameterBlock` (NaCl as proxy solute) |

**Correct import paths (WaterTAP 1.6.0):**
```python
from watertap.property_models.NaCl_prop_pack import NaClParameterBlock
from watertap.unit_models.reverse_osmosis_0D import (
    ReverseOsmosis0D,
    ConcentrationPolarizationType,
    MassTransferCoefficient,
)
from idaes.core.solvers import get_solver
```

---

## Validation Spike Results (2026-06-30)

**Script:** `spike_watertap.py` | **Environment:** Python 3.11.15, macOS ARM64

| Gate | Result | Detail |
|---|---|---|
| [1] Imports | ✅ PASS | All packages import in 0.3s |
| [2] Ipopt solver | ✅ PASS | `~/.idaes/bin/ipopt` — bundled, no extra step |
| [3] BWRO model solve | ✅ PASS | status=optimal, recovery=30.9%, salt_rejection=99.29%, avg_flux=21.49 kg/m²/h |
| [4] Timing | ✅ PASS | build=1.6s, solve=2.1s → **fast enough for on-demand what-if** |

**Remaining open risk:** Docker containerization not yet validated. Defer to scaffolding phase.

---

## WaterTAP Use Cases in This Project

1. **Physics baseline** — Compute expected flux, salt rejection, TMP, and SEC for clean-membrane conditions given feed TDS, temperature, pressure
2. **Fouling anomaly detection** — `Δ(actual_BigQuery_reading − WaterTAP_baseline)` → fouling/scaling anomaly score, written back to BigQuery
3. **On-demand what-if** — Agent tool: *"What happens at 35°C feed, 800 ppm TDS?"* → returns predicted performance in ~2s
4. **Optimization** — Pyomo-based solver finds optimal recovery rate / pressure trade-off given energy cost and scaling risk
5. **Synthetic data generation** — Generate thousands of operating scenarios to augment sparse Harvard data

---

## PhysicsEngine Abstraction

**Rule:** Nothing in the system (agent, anomaly detection, UI serving) calls WaterTAP directly. All callers go through this interface.

```python
class PhysicsEngine(Protocol):
    def predict_baseline(
        self,
        feed_tds_ppm: float,
        feed_temp_celsius: float,
        feed_pressure_bar: float,
        target_recovery: float,
        membrane_age_days: int,
    ) -> BaselineResult:
        ...

@dataclass
class BaselineResult:
    permeate_flux_kg_m2_h: float
    salt_rejection_pct: float
    tmp_bar: float                  # transmembrane pressure
    sec_kwh_m3: float               # specific energy consumption
    lcow_usd_m3: float | None       # None if costing module unavailable
    solve_time_s: float
    solver_status: str              # "optimal" | "infeasible" | "error"
```

**Implementations:**
- `WaterTAPEngine` — primary (confirmed viable). Calls WaterTAP BWRO flowsheet.
- `AnalyticalROEngine` — fallback (pure NumPy, van't Hoff osmotic pressure, flux = A·(ΔP − Δπ)). Build only if WaterTAP containerization fails.

---

## Cloud Run Deployment Shape

| Aspect | Decision |
|---|---|
| Service type | Cloud Run **Service** (not Job) — 2s latency OK for on-demand |
| Framework | FastAPI |
| Python version | 3.11 |
| Install | `pip install watertap fastapi uvicorn` — Ipopt bundled |
| Min instances | 0 (scales to zero; cold start ~10–20s, acceptable) |
| Max instances | 3 for prototype |
| Memory | 2 GiB (Pyomo/Ipopt solve) |
| CPU | 2 vCPU |
| Timeout | 30s per request |

**Caching:** Cache solved baselines (keyed on `{tds, temp, pressure, recovery, membrane_age}`) in BigQuery `unit_baselines` table. Check cache before solving — most repeated lookups return in <100ms.

**Suggested endpoints:**
```
POST /predict          — predict_baseline(feed params) → BaselineResult
POST /optimize         — find optimal recovery/pressure given constraints
POST /generate-synthetic — generate N operating scenarios → CSV/JSONL
GET  /health           — liveness probe
```

---

## WaterTAP Calibration Against OCWD Data

**Open question** (to resolve before production): WaterTAP's default membrane parameters (A, B coefficients) are literature values. The OCWD dataset gives us real observed flux/rejection vs. feed conditions — we should calibrate `A_comp` and `B_comp` per membrane bank.

**Calibration approach (to design):**
1. For each bank (A–G), take readings where membrane is "clean" (early readings, no fouling signal)
2. Fit WaterTAP model to observed flux/rejection by adjusting `A_comp[H2O]` and `B_comp[NaCl]`
3. Store calibrated parameters per bank in BigQuery
4. WaterTAP service reads bank-specific parameters at solve time

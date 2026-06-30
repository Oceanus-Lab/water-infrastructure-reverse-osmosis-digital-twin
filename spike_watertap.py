#!/usr/bin/env python3
"""
WaterTAP Validation Spike
Gates: [1] imports  [2] Ipopt solver  [3] BWRO model solve  [4] timing verdict
"""
import sys, time

PASS = "✅ PASS"
FAIL = "❌ FAIL"
WARN = "⚠️  WARN"

print(f"Python: {sys.version.split()[0]}  |  Platform: {sys.platform}")
print("=" * 60)

# ── Gate 1: Imports ─────────────────────────────────────────────
print("\n[1/4] Imports")
t = time.time()
try:
    import importlib.metadata as meta
    import watertap, idaes, pyomo.environ as pyo
    wt_ver = meta.version("watertap")
    id_ver = meta.version("idaes-pse")
    py_ver = meta.version("pyomo")
    print(f"  {PASS}  watertap={wt_ver}  idaes-pse={id_ver}  "
          f"pyomo={py_ver}  ({time.time()-t:.1f}s)")
    IMPORTS_OK = True
except ImportError as e:
    print(f"  {FAIL}  {e}")
    IMPORTS_OK = False

if not IMPORTS_OK:
    sys.exit(1)

# ── Gate 2: Ipopt solver ─────────────────────────────────────────
print("\n[2/4] Ipopt solver availability")
t = time.time()
try:
    solver = pyo.SolverFactory("ipopt")
    available = solver.available()
    exe = solver.executable() if available else "n/a"
    label = PASS if available else FAIL
    print(f"  {label}  available={available}  exe={exe}  ({time.time()-t:.2f}s)")
    SOLVER_OK = available
except Exception as e:
    print(f"  {FAIL}  {e}")
    SOLVER_OK = False

# ── Gate 3: BWRO model build + solve ────────────────────────────
print("\n[3/4] BWRO single-stage model — build + solve")
SOLVE_OK = False
try:
    t_build = time.time()
    from idaes.core import FlowsheetBlock
    from watertap.property_models.NaCl_prop_pack import NaClParameterBlock
    from watertap.unit_models.reverse_osmosis_0D import (
        ReverseOsmosis0D,
        ConcentrationPolarizationType,
        MassTransferCoefficient,
    )
    from idaes.core.solvers import get_solver as idaes_get_solver

    m = pyo.ConcreteModel()
    m.fs = FlowsheetBlock(dynamic=False)
    m.fs.properties = NaClParameterBlock()
    m.fs.unit = ReverseOsmosis0D(
        property_package=m.fs.properties,
        concentration_polarization_type=ConcentrationPolarizationType.none,
        mass_transfer_coefficient=MassTransferCoefficient.none,
    )
    build_elapsed = time.time() - t_build
    print(f"  Model built  ({build_elapsed:.2f}s)")

    # Fix degrees of freedom — brackish water conditions
    m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "H2O"].fix(0.965)   # kg/s
    m.fs.unit.inlet.flow_mass_phase_comp[0, "Liq", "NaCl"].fix(0.035)  # kg/s (~35 g/L ≈ seawater; change to 0.002 for BWRO)
    m.fs.unit.inlet.temperature[0].fix(298.15)    # K (25 °C)
    m.fs.unit.inlet.pressure[0].fix(50e5)         # Pa (50 bar)
    m.fs.unit.A_comp[0, "H2O"].fix(4.2e-12)       # membrane water permeance
    m.fs.unit.B_comp[0, "NaCl"].fix(3.5e-8)       # membrane salt permeance
    m.fs.unit.area.fix(50)                         # m²
    m.fs.unit.permeate.pressure[0].fix(101325)     # Pa (atmospheric)

    t_solve = time.time()
    m.fs.unit.initialize()
    solver = idaes_get_solver()
    results = solver.solve(m, tee=False)
    solve_elapsed = time.time() - t_solve

    status = str(results.solver.termination_condition)
    recovery = pyo.value(m.fs.unit.recovery_mass_phase_comp[0, "Liq", "H2O"])
    rejection = pyo.value(m.fs.unit.rejection_phase_comp[0, "Liq", "NaCl"])
    flux = pyo.value(m.fs.unit.flux_mass_phase_comp_avg[0, "Liq", "H2O"])

    SOLVE_OK = "optimal" in status.lower()
    label = PASS if SOLVE_OK else WARN
    print(f"  {label}  status={status}  solve_time={solve_elapsed:.2f}s")
    print(f"         recovery={recovery*100:.1f}%  salt_rejection={rejection*100:.2f}%  "
          f"avg_flux={flux*3600:.2f} kg/m²/h")

except Exception as e:
    print(f"  {FAIL}  {e}")
    import traceback; traceback.print_exc()

# ── Gate 4: Timing verdict ───────────────────────────────────────
print("\n[4/4] Verdict")
print(f"  Imports   : {'OK' if IMPORTS_OK else 'FAILED'}")
print(f"  Solver    : {'OK' if SOLVER_OK  else 'FAILED — run: idaes get-extensions'}")
print(f"  Model     : {'OK' if SOLVE_OK   else 'FAILED'}")

if IMPORTS_OK and SOLVER_OK and SOLVE_OK:
    print("\n  → WaterTAPEngine: VIABLE as primary physics engine")
    if 'solve_elapsed' in dir() and solve_elapsed < 5:
        print(f"  → Solve latency {solve_elapsed:.2f}s: fast enough for on-demand what-if (Cloud Run Service)")
    elif 'solve_elapsed' in dir():
        print(f"  → Solve latency {solve_elapsed:.2f}s: use Cloud Run Job (batch) + result caching")
elif IMPORTS_OK and not SOLVER_OK:
    print("\n  → Try: .venv-watertap-spike/bin/idaes get-extensions  then re-run")
else:
    print("\n  → Fall back to AnalyticalROEngine; revisit WaterTAP containerization later")

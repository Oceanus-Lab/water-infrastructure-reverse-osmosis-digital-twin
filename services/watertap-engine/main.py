#!/usr/bin/env python3
"""
watertap-engine — the physics service docs/05-gcp-infrastructure.md specifies.

services/agent/tools.py has always pointed `WATERTAP_API_URL` at a POST /predict endpoint
that did not exist, so `simulate_watertap` could only ever return a connection error. This is
that endpoint.

Kept separate from ro-serving-api because the solver stack needs its own image (see
Dockerfile). physics.py is copied in at build time from services/source-tracing, so the
flowsheet has one definition rather than two that drift.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from physics import LIMITS, simulate, what_if

app = FastAPI(title="WaterTAP Engine", version="1.0.0")


class PredictRequest(BaseModel):
    """Feed conditions for one clean-membrane solve."""
    tds_ppm: float = Field(1500.0, description="feed salinity, mg/L")
    temp_c: float = Field(23.0, description="feed temperature, C")
    pressure_bar: float = Field(15.0, description="feed pressure, bar")
    recovery: float = Field(0.85, description="recovery setpoint, fraction")
    membrane_area_m2: float = Field(50.0, description="element area, m2")
    unit_id: str | None = Field(None, description="echoed back for the caller's traceability")


class WhatIfRequest(BaseModel):
    base: dict[str, float] = Field(default_factory=dict)
    change: dict[str, float]


@app.get("/health")
def health():
    """Solver reachability, not just process liveness.

    A container whose Ipopt binaries failed to download still serves HTTP perfectly well and
    returns available=False on every solve, so a plain liveness probe would call it healthy.
    """
    r = simulate()
    return {
        "status": "ok" if r.get("fidelity") == "high" else "degraded",
        "solver": r.get("solver_status") or r.get("reason") or r.get("solve_failed"),
        "fidelity": r.get("fidelity"),
    }


@app.post("/predict")
def predict(req: PredictRequest):
    """Solve at one operating point. Matches the contract in docs/04-ai-agent.md."""
    result = simulate(tds_ppm=req.tds_ppm, temp_c=req.temp_c, pressure_bar=req.pressure_bar,
                      recovery=req.recovery, membrane_area_m2=req.membrane_area_m2)
    if result.get("out_of_envelope"):
        raise HTTPException(status_code=422, detail=result["reason"])
    return {**result, "unit_id": req.unit_id}


@app.post("/what-if")
def what_if_endpoint(req: WhatIfRequest):
    """Two solves reported as a delta — see physics.what_if for why deltas."""
    allowed = set(LIMITS) | {"membrane_area_m2"}
    unknown = sorted((set(req.base) | set(req.change)) - allowed)
    if unknown:
        raise HTTPException(status_code=422,
                            detail=f"unknown parameter(s): {unknown}; allowed: {sorted(allowed)}")
    if not req.change:
        raise HTTPException(status_code=422, detail="change must name at least one parameter")
    return what_if(req.base, req.change)


@app.get("/")
def root():
    return {"service": "watertap-engine",
            "model": "WaterTAP ReverseOsmosis0D (NaCl property package)",
            "endpoints": ["/health", "/predict", "/what-if"]}

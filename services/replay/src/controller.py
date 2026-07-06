import asyncio
import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .clock import RunState
from .harness import ReplayHarness
from .logger import get_logger

logger = get_logger(__name__)

app = FastAPI(title="RO Digital Twin - Replay Controller")
harness = ReplayHarness(start_date="2019-01-01")

class JumpRequest(BaseModel):
    target_date: str

class SpeedRequest(BaseModel):
    multiplier: float

@app.on_event("startup")
async def startup_event():
    # Start the simulation loop in the background
    asyncio.create_task(harness.run_loop())
    logger.info("Replay Controller and Harness started.")

@app.get("/api/clock")
async def get_clock():
    return {
        "current_date": harness.clock.current_date.isoformat(),
        "state": harness.clock.state.value,
        "speed_multiplier": harness.clock.speed_multiplier
    }

@app.post("/api/clock/play")
async def play_clock():
    await harness.clock.play()
    return {"status": "PLAYING"}

@app.post("/api/clock/pause")
async def pause_clock():
    await harness.clock.pause()
    return {"status": "PAUSED"}

@app.post("/api/clock/jump")
async def jump_clock(req: JumpRequest):
    try:
        target_dt = datetime.datetime.strptime(req.target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
    await harness.clock.jump_to(target_dt)
    return {"status": "JUMPED", "target_date": req.target_date}

@app.post("/api/clock/speed")
async def set_speed(req: SpeedRequest):
    if req.multiplier <= 0:
        raise HTTPException(status_code=400, detail="Speed multiplier must be > 0.")
        
    await harness.clock.set_speed(req.multiplier)
    return {"status": "SPEED_UPDATED", "speed_multiplier": req.multiplier}

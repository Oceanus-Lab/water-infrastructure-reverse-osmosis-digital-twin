import datetime
from enum import Enum
import asyncio

from .logger import get_logger

logger = get_logger(__name__)

class RunState(Enum):
    PLAYING = "PLAYING"
    PAUSED = "PAUSED"

class SimulationClock:
    def __init__(self, start_date: datetime.date):
        self.current_date = start_date
        self.state = RunState.PAUSED
        self.speed_multiplier = 1.0  # 1 simulated day per X wall-clock seconds. (e.g. 1.0 = 1 day/sec)
        self._lock = asyncio.Lock()
        
    async def play(self):
        async with self._lock:
            if self.state == RunState.PAUSED:
                self.state = RunState.PLAYING
                logger.info("Simulation clock RESUMED")

    async def pause(self):
        async with self._lock:
            if self.state == RunState.PLAYING:
                self.state = RunState.PAUSED
                logger.info("Simulation clock PAUSED")
                
    async def jump_to(self, target_date: datetime.date):
        async with self._lock:
            self.current_date = target_date
            logger.info(f"Simulation clock JUMPED to {self.current_date}")

    async def set_speed(self, multiplier: float):
        async with self._lock:
            if multiplier > 0:
                self.speed_multiplier = multiplier
                logger.info(f"Simulation speed set to {multiplier} days/sec")

    async def advance(self):
        """Advances the clock by 1 day if playing."""
        async with self._lock:
            if self.state == RunState.PLAYING:
                self.current_date += datetime.timedelta(days=1)
                logger.debug(f"Clock advanced to {self.current_date}")

import asyncio
import datetime
from typing import Dict, List, Any

from .clock import SimulationClock, RunState
from .data_loader import load_historical_data, get_readings_by_date
from .pubsub_connector import PubSubConnector
from .logger import get_logger

logger = get_logger(__name__)

class ReplayHarness:
    def __init__(self, start_date: str = "2019-01-01"):
        try:
            start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            logger.warning(f"Invalid date format {start_date}, defaulting to 2019-01-01")
            start_dt = datetime.date(2019, 1, 1)

        self.clock = SimulationClock(start_date=start_dt)
        self.pubsub = PubSubConnector()
        
        logger.info("Loading history...")
        self.df = load_historical_data()
        self.history = get_readings_by_date(self.df)
        
        self.max_date = self.df["reading_date"].max().date()
        logger.info(f"Harness initialized. Max available date: {self.max_date}")

    async def _emit_readings_for_date(self, target_date: datetime.date):
        date_str = target_date.strftime("%Y-%m-%d")
        readings = self.history.get(date_str, [])
        if not readings:
            logger.debug(f"No readings found for {date_str}")
            return
            
        logger.info(f"Emitting {len(readings)} readings for {date_str}...")
        for reading in readings:
            # We must not block the async event loop with synchronous network calls
            # Use run_in_executor to offload Pub/Sub publish if needed, but for prototype we can do it directly
            # or wrap it if it's too slow.
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self.pubsub.publish_reading, reading, target_date)

    async def run_loop(self):
        """The main simulation loop."""
        logger.info("Starting simulation loop...")
        
        while True:
            # Quick exit if we exceed max history
            if self.clock.current_date > self.max_date:
                logger.info("Reached end of historical data. Pausing.")
                await self.clock.pause()
                
            state = self.clock.state
            if state == RunState.PLAYING:
                current_dt = self.clock.current_date
                await self._emit_readings_for_date(current_dt)
                await self.clock.advance()
                
                # Sleep based on speed multiplier
                # speed_multiplier = 1.0 means 1 real second = 1 sim day
                # e.g., if multiplier is 2.0, sleep for 0.5s
                sleep_time = 1.0 / self.clock.speed_multiplier
                await asyncio.sleep(sleep_time)
            else:
                # Polling interval when paused
                await asyncio.sleep(0.5)

async def main():
    harness = ReplayHarness(start_date="2019-01-01")
    # For testing purposes, auto-start:
    await harness.clock.play()
    await harness.run_loop()

if __name__ == "__main__":
    asyncio.run(main())

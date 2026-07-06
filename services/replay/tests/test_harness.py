import pytest
import datetime
from services.replay.src.clock import SimulationClock, RunState

@pytest.mark.asyncio
async def test_simulation_clock():
    clock = SimulationClock(datetime.date(2019, 1, 1))
    
    assert clock.state == RunState.PAUSED
    assert clock.current_date == datetime.date(2019, 1, 1)
    
    await clock.play()
    assert clock.state == RunState.PLAYING
    
    await clock.advance()
    assert clock.current_date == datetime.date(2019, 1, 2)
    
    await clock.pause()
    assert clock.state == RunState.PAUSED
    
    await clock.advance()
    # Should not advance if paused
    assert clock.current_date == datetime.date(2019, 1, 2)
    
    await clock.jump_to(datetime.date(2020, 1, 1))
    assert clock.current_date == datetime.date(2020, 1, 1)

@pytest.mark.asyncio
async def test_set_speed():
    clock = SimulationClock(datetime.date(2019, 1, 1))
    assert clock.speed_multiplier == 1.0
    
    await clock.set_speed(5.0)
    assert clock.speed_multiplier == 5.0

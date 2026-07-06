import { create } from 'zustand';
import { ReplayState } from '../types';
import { addDays, parseISO, formatISO } from 'date-fns';

const REPLAY_API = process.env.NEXT_PUBLIC_REPLAY_API_URL || "http://localhost:8001";

interface ReplayStore extends ReplayState {
  setCurrentDate: (date: string) => Promise<void>;
  setIsPlaying: (playing: boolean) => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  setAvailableDateRange: (range: [string, string]) => void;
  setSelectedUnitId: (unitId: string | null) => void;
  syncClock: () => Promise<void>;
  advanceTime: () => void;
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
  currentDate: "2019-01-01T00:00:00Z",
  isPlaying: false,
  speed: 1,
  availableDateRange: ["2019-01-01T00:00:00Z", "2021-01-13T00:00:00Z"],
  selectedUnitId: null,
  
  setCurrentDate: async (date) => {
    // Optimistic UI update
    set({ currentDate: date });
    try {
      await fetch(`${REPLAY_API}/api/clock/jump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: date.substring(0, 10) })
      });
    } catch (e) {
      console.warn("Failed to jump backend clock", e);
    }
  },
  
  setIsPlaying: async (playing) => {
    set({ isPlaying: playing });
    try {
      const endpoint = playing ? 'play' : 'pause';
      await fetch(`${REPLAY_API}/api/clock/${endpoint}`, { method: 'POST' });
    } catch (e) {
      console.warn("Failed to update backend play state", e);
    }
  },
  
  setSpeed: async (speed) => {
    set({ speed });
    try {
      await fetch(`${REPLAY_API}/api/clock/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: speed })
      });
    } catch (e) {
      console.warn("Failed to update backend speed", e);
    }
  },
  
  setAvailableDateRange: (range) => set({ availableDateRange: range }),
  setSelectedUnitId: (unitId) => set({ selectedUnitId: unitId }),
  
  syncClock: async () => {
    try {
      const res = await fetch(`${REPLAY_API}/api/clock`);
      if (res.ok) {
        const data = await res.json();
        // data: { current_date: "2020-05-15", state: "PLAYING" | "PAUSED", speed_multiplier: 1.0 }
        set({
          currentDate: `${data.current_date}T00:00:00Z`,
          isPlaying: data.state === "PLAYING",
          speed: data.speed_multiplier
        });
      }
    } catch (e) {
      // Backend unreachable, fallback to local advanceTime if playing
      if (get().isPlaying) get().advanceTime();
    }
  },
  
  advanceTime: () => {
    const { currentDate, speed, availableDateRange } = get();
    const current = parseISO(currentDate);
    const end = parseISO(availableDateRange[1]);
    
    let nextDate = addDays(current, speed);
    if (nextDate > end) {
      set({ isPlaying: false, currentDate: availableDateRange[1] });
      return;
    }
    set({ currentDate: formatISO(nextDate) });
  }
}));

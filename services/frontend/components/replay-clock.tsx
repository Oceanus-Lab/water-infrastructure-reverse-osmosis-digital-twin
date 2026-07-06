'use client';
import { useReplayStore } from "@/lib/store/replay-store";
import { format, parseISO } from "date-fns";
import { Play, Pause } from "lucide-react";
import { useEffect } from "react";

export function ReplayClock() {
  const { currentDate, isPlaying, setIsPlaying, syncClock } = useReplayStore();

  useEffect(() => {
    const interval = setInterval(() => {
      syncClock();
    }, 500);
    return () => clearInterval(interval);
  }, [syncClock]);

  const dateStr = format(parseISO(currentDate), "MMM dd, yyyy");

  return (
    <div className="flex items-center gap-4 px-2 py-2 drop-shadow-sm">
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
        className="w-[42px] h-[42px] flex items-center justify-center rounded-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-all flex-shrink-0 cursor-pointer active:scale-95"
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current translate-x-[1px]" />}
      </button>
      <div className="flex flex-col pr-6">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-extrabold mb-0.5">Simulation Clock</span>
        <span className="font-sans text-[15px] font-black tracking-tight text-foreground">{dateStr}</span>
      </div>
    </div>
  );
}

'use client';
import { useReplayStore } from "@/lib/store/replay-store";
import { parseISO, differenceInDays, formatISO, addDays } from "date-fns";
import { Slider } from "@/components/ui/slider";

export function TimelineScrubber() {
  const { currentDate, availableDateRange, setCurrentDate } = useReplayStore();
  
  const start = parseISO(availableDateRange[0]);
  const end = parseISO(availableDateRange[1]);
  const current = parseISO(currentDate);
  
  const totalDays = differenceInDays(end, start);
  const currentDay = Math.max(0, Math.min(totalDays, differenceInDays(current, start)));

  const handleSliderChange = (vals: number | readonly number[]) => {
    const val = Array.isArray(vals) ? vals[0] : (vals as number);
    const newDate = addDays(start, val);
    setCurrentDate(formatISO(newDate));
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-2 drop-shadow-sm">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-[9px] text-muted-foreground font-extrabold tracking-widest uppercase">
          Timeline Scrubber
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {totalDays} Days Available
        </span>
      </div>
      
      <Slider 
        value={[currentDay]} 
        max={totalDays} 
        step={1} 
        onValueChange={handleSliderChange}
        className="w-full cursor-grab active:cursor-grabbing pb-0.5"
      />
    </div>
  );
}

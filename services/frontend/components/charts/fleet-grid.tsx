'use client';

import { useEffect, useState } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchFleetStatus } from "@/lib/api";
import { UnitHealth } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FleetGrid() {
  const { currentDate, selectedUnitId, setSelectedUnitId } = useReplayStore();
  const [fleet, setFleet] = useState<UnitHealth[]>([]);

  useEffect(() => {
    fetchFleetStatus(currentDate).then(setFleet);
  }, [currentDate]);

  const banks = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const stages = [1, 2, 3];

  const getColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-white border border-border/40';
      case 'watch': return 'bg-muted border border-border/40';
      case 'alert': return 'bg-primary border-transparent';
      default: return 'bg-muted/50 border border-border/20';
    }
  };

  return (
    <div className="flex flex-col h-full p-5 cursor-default bg-white border border-border/40 rounded-[20px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-foreground">Fleet Fouling Map</h3>
      </div>
      
      <div className="flex-1 flex flex-col justify-center px-1">
        <div className="grid grid-cols-7 gap-x-1.5 gap-y-2 w-full max-w-[280px] mx-auto">
          {banks.map(bank => (
            <div key={`header-${bank}`} className="text-center text-[10px] font-bold text-muted-foreground mb-1">
              {bank}
            </div>
          ))}
          {stages.map(stage => (
            banks.map(bank => {
              const id = `${bank}0${stage}`;
              const unit = fleet.find(u => u.id === id);
              const isSelected = selectedUnitId === id;
              const status = unit?.status || 'unknown';
              
              return (
                <button
                  key={id}
                  onClick={() => setSelectedUnitId(id)}
                  className={cn(
                    "w-full aspect-square rounded-[6px] transition-all duration-300 relative group overflow-hidden border border-black/5 hover:scale-110 hover:z-10",
                    getColor(status),
                    isSelected ? "ring-2 ring-black ring-offset-2 scale-110 z-10" : ""
                  )}
                  aria-label={`Bank ${bank} Stage ${stage} - ${status}`}
                  title={id}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          ))}
        </div>
      </div>
    </div>
  );
}

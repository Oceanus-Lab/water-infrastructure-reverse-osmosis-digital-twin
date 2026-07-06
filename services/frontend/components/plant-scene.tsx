'use client';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { EquipmentSprite } from "./equipment-sprite";
import { fetchFleetStatus } from "@/lib/api";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function PlantScene() {
  const { currentDate } = useReplayStore();
  const [fleet, setFleet] = useState<UnitHealth[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFleetStatus(currentDate).then(setFleet);
  }, [currentDate]);

  const getUnit = (id: string) => fleet.find(u => u.id === id);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative w-full flex flex-col gap-6">
      
      {/* 1. Backdrop */}
      <div className="relative w-full aspect-[21/9] max-h-[500px] rounded-[20px] overflow-hidden bg-white shadow-sm border border-border/40">
        <Image
          src="/assets/equipment/ro-plant.png"
          alt="RO Plant Overview"
          fill
          className="object-cover mix-blend-multiply opacity-90"
          priority
        />
      </div>

      {/* 2. Equipment Strip (Horizontal Scroll) */}
      <div className="w-full flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h2 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-foreground">
              Equipment Visualization
            </h2>
            <div className="h-4 w-px bg-border/60" />
            <span className="text-[11px] uppercase text-muted-foreground font-semibold tracking-widest">
              21 Units Monitored
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => scroll('left')} className="p-2.5 rounded-full border border-border/50 bg-white hover:bg-black/5 transition-colors cursor-pointer">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scroll('right')} className="p-2.5 rounded-full border border-border/50 bg-white hover:bg-black/5 transition-colors cursor-pointer">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x pt-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Flat horizontal list instead of grid */}
          <EquipmentSprite id="F01" label="HP Feed Pump" imageSrc="/assets/equipment/hp-feed-pump.png" unit={getUnit('F01')} />
          <EquipmentSprite id="F02" label="RO Rack" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('F02')} />
          <EquipmentSprite id="F03" label="ERD System" imageSrc="/assets/equipment/erd.png" unit={getUnit('F03')} />
          <EquipmentSprite id="CIP1" label="CIP Skid" imageSrc="/assets/equipment/cip-skid.png" unit={getUnit('CIP1')} />
          <EquipmentSprite id="A01" label="Pre-Filter A" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('A01')} />
          <EquipmentSprite id="C02" label="Membrane Stage 1" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('C02')} />
          <EquipmentSprite id="E03" label="Membrane Stage 2" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('E03')} />
          <EquipmentSprite id="G03" label="Product Transfer" imageSrc="/assets/equipment/hp-feed-pump.png" unit={getUnit('G03')} />
        </div>
      </div>
    </section>
  );
}

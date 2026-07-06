'use client';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { EquipmentSprite } from "./equipment-sprite";
import { SpritePlaceholder } from "./sprite-placeholder";
import { fetchFleetStatus } from "@/lib/api";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { ReplayClock } from "./replay-clock";
import { TimelineScrubber } from "./timeline-scrubber";

export function PlantScene() {
  const { currentDate, selectedUnitId } = useReplayStore();
  const [fleet, setFleet] = useState<UnitHealth[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFleetStatus(currentDate).then(setFleet);
  }, [currentDate]);

  const getUnit = (id: string) => fleet.find(u => u.id === id);

  const getSpriteImage = (id: string | null) => {
    if (!id || id === 'PLANT') return "/assets/equipment/ro-plant3.png";
    if (id === 'F01' || id.startsWith('G')) return "/assets/equipment/hp-feed-pump.png";
    if (id === 'F03') return "/assets/equipment/erd.png";
    if (id === 'CIP1') return "/assets/equipment/cip-skid.png";
    // Everything else (stages A-E, F02, etc.) is likely a membrane rack
    return "/assets/equipment/ro-membrane-rack.png";
  };

  const currentMainImage = getSpriteImage(selectedUnitId);

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
    <section className="relative w-full flex flex-col gap-4">

      {/* 1. Backdrop */}
      <div className="relative w-full h-[550px] overflow-hidden bg-transparent">
        <Image
          key={currentMainImage}
          src={currentMainImage}
          alt="Plant Overview"
          fill
          className="object-cover object-[center_35%] mix-blend-multiply opacity-90 animate-in fade-in duration-500"
          priority
        />

        {/* Replay Controls - Overlapping top empty space */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <ReplayClock />
          </div>
          <div className="w-[400px] pointer-events-auto">
            <TimelineScrubber />
          </div>
        </div>
      </div>

      {/* 2. Equipment Strip (Horizontal Scroll) */}
      <div className="w-full flex flex-col gap-3 mt-1">
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
            <button onClick={() => scroll('left')} className="p-2.5 rounded-[8px] border border-border/50 bg-white hover:bg-black/5 transition-colors cursor-pointer">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scroll('right')} className="p-2.5 rounded-[8px] border border-border/50 bg-white hover:bg-black/5 transition-colors cursor-pointer">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x pt-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Flat horizontal list instead of grid */}
          <EquipmentSprite id="PLANT" label="Water Plant" imageSrc="/assets/equipment/ro-plant3.png" isDefault />
          <EquipmentSprite id="F01" label="HP Feed Pump" imageSrc="/assets/equipment/hp-feed-pump.png" unit={getUnit('F01')} />
          <EquipmentSprite id="F02" label="RO Rack" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('F02')} />
          <EquipmentSprite id="F03" label="ERD System" imageSrc="/assets/equipment/erd.png" unit={getUnit('F03')} />
          <EquipmentSprite id="CIP1" label="CIP Skid" imageSrc="/assets/equipment/cip-skid.png" unit={getUnit('CIP1')} />
          <SpritePlaceholder id="A01" label="Pre-Filter A" unit={getUnit('A01')} />
          <SpritePlaceholder id="C02" label="Membrane Stage 1" unit={getUnit('C02')} />
          <SpritePlaceholder id="E03" label="Membrane Stage 2" unit={getUnit('E03')} />
          <SpritePlaceholder id="G03" label="Product Transfer" unit={getUnit('G03')} />
        </div>
      </div>
    </section>
  );
}

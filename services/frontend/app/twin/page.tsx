"use client";

import { PlantScene } from "@/components/plant-scene";
import { InspectionDrawer } from "@/components/inspection-drawer";
import { FleetGrid } from "@/components/charts/fleet-grid";
import { FluxTrendChart } from "@/components/charts/flux-trend-chart";
import { BreakevenChart } from "@/components/charts/breakeven-chart";
import { useAssistantStore } from "@/lib/store/assistant-store";

export default function TwinPage() {
  const { isOpen } = useAssistantStore();

  return (
    <main 
      className="flex-1 w-full h-full overflow-hidden bg-background grid transition-[grid-template-columns] duration-[800ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{ gridTemplateColumns: `1fr auto ${isOpen ? '400px' : '0px'}` }}
    >
      {/* Center Column - Main Content Area */}
      <div className="flex flex-col overflow-y-auto relative border-r border-white/5">
        <div className="flex-none px-8 pt-4 pb-8">
          <PlantScene />
        </div>
        
        {/* Charts Grid */}
        <div className="flex-none px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-[260px]">
            <FleetGrid />
            <FluxTrendChart />
            <BreakevenChart />
          </div>
        </div>
      </div>

      {/* Right Column - Inspection Drawer */}
      <div className="relative">
        <InspectionDrawer />
      </div>

      {/* Spacer for Assistant Panel */}
      <div className="relative pointer-events-none" />
    </main>
  );
}

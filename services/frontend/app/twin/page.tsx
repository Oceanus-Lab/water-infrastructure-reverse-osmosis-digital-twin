import { PlantScene } from "@/components/plant-scene";
import { InspectionDrawer } from "@/components/inspection-drawer";
import { FleetGrid } from "@/components/charts/fleet-grid";
import { FluxTrendChart } from "@/components/charts/flux-trend-chart";
import { BreakevenChart } from "@/components/charts/breakeven-chart";

export default function TwinPage() {
  return (
    <main className="flex-1 flex w-full h-full overflow-hidden bg-background">
      
      {/* Left Column - Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        <div className="flex-none px-8 pt-4 pb-8">
          <PlantScene />
        </div>
        
        {/* Charts Grid */}
        <div className="flex-none px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[260px]">
            <FleetGrid />
            <FluxTrendChart />
            <BreakevenChart />
          </div>
        </div>
      </div>

      {/* Right Column - Inspection Drawer */}
      <InspectionDrawer />
    </main>
  );
}

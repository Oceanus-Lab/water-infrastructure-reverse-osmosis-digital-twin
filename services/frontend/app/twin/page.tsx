import { PlantScene } from "@/components/plant-scene";
import { InspectionDrawer } from "@/components/inspection-drawer";
import { ReplayClock } from "@/components/replay-clock";
import { TimelineScrubber } from "@/components/timeline-scrubber";

export default function TwinPage() {
  return (
    <main className="flex-1 flex w-full h-full overflow-hidden bg-[#EFEFEF]">
      
      {/* Left Column - Main Scene */}
      <div className="flex-1 flex flex-col overflow-y-auto px-8 pt-8 pb-24 relative">
        
        {/* Replay Controls integrated above the plant */}
        <div className="w-full mb-6 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-700 z-10 relative">
          <ReplayClock />
          <TimelineScrubber />
        </div>

        <PlantScene />
        
      </div>

      {/* Right Column - Inspection Drawer */}
      <InspectionDrawer />
    </main>
  );
}

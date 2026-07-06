import { PlantScene } from "@/components/plant-scene";
import { InspectionDrawer } from "@/components/inspection-drawer";

export default function TwinPage() {
  return (
    <main className="flex-1 flex w-full h-full overflow-hidden bg-[#FBFBFA] dark:bg-background">
      
      {/* Left Column - Main Scene */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto pb-24 px-6 relative">
        
        {/* Top Header Placeholder (Replay Clock + Timeline Scrubber) */}
        <div className="w-full max-w-5xl mt-8 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="h-14 bg-background/50 backdrop-blur-sm w-48 rounded-[1rem] border border-dashed border-border/50 animate-pulse flex items-center justify-center">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Clock Stub</span>
          </div>
          <div className="h-14 bg-background/50 backdrop-blur-sm flex-1 rounded-[1rem] border border-dashed border-border/50 animate-pulse flex items-center justify-center">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Timeline Stub</span>
          </div>
        </div>

        <PlantScene />
        
        {/* Bottom Charts Placeholder */}
        <div className="w-full max-w-5xl mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-background/50 backdrop-blur-sm rounded-[1.5rem] border border-dashed border-border/40 animate-pulse" />
            <div className="h-64 bg-background/50 backdrop-blur-sm rounded-[1.5rem] border border-dashed border-border/40 animate-pulse" />
            <div className="h-64 bg-background/50 backdrop-blur-sm rounded-[1.5rem] border border-dashed border-border/40 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right Column - Inspection Drawer */}
      <InspectionDrawer />
    </main>
  );
}

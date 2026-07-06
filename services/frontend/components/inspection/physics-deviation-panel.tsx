import { PhysicsDeviation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Activity, Beaker, Zap, AlertTriangle } from "lucide-react";

interface PhysicsDeviationPanelProps {
  deviations: PhysicsDeviation[];
}

export function PhysicsDeviationPanel({ deviations }: PhysicsDeviationPanelProps) {
  if (!deviations || deviations.length === 0) return null;

  const getMetricConfig = (metric: string) => {
    switch (metric) {
      case "unit_n_delta_p":
        return { label: "Differential Pressure", unit: "bar", icon: <Activity className="w-4 h-4" /> };
      case "salt_passage":
        return { label: "Salt Passage", unit: "%", icon: <Beaker className="w-4 h-4" /> };
      case "unit_recovery":
        return { label: "Recovery", unit: "%", icon: <Zap className="w-4 h-4" /> };
      default:
        return { label: metric, unit: "", icon: <Activity className="w-4 h-4" /> };
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" /> Physics Deviation
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {deviations.map((dev) => {
          const config = getMetricConfig(dev.metric);
          const isOOR = dev.status === "out-of-range";
          const isUnavailable = dev.status === "unavailable";
          
          return (
            <div 
              key={dev.metric} 
              className={cn(
                "p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden transition-colors",
                isOOR ? "bg-destructive/5 border-destructive/20" : "bg-muted/20 border-border/10",
                isUnavailable && "opacity-50 grayscale"
              )}
            >
              {isOOR && (
                <div className="absolute top-0 right-0 w-12 h-12 flex items-start justify-end p-2">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                {config.icon}
                <span className="text-xs font-medium uppercase tracking-wider">{config.label}</span>
              </div>
              
              {!isUnavailable ? (
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl font-normal tracking-tight">
                      {dev.actual?.toFixed(2)} <span className="text-sm text-muted-foreground font-normal">{config.unit}</span>
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Expected clean: {dev.expectedClean?.toFixed(2)} {config.unit}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-lg font-medium tracking-tight",
                      dev.deviation && dev.deviation > 0 ? (dev.metric === "unit_recovery" ? "text-destructive" : "text-warning") : "text-success",
                      dev.deviation && dev.deviation < 0 ? (dev.metric === "unit_recovery" ? "text-warning" : "text-success") : ""
                    )}>
                      {dev.deviation && dev.deviation > 0 ? "+" : ""}{dev.deviation?.toFixed(2)} {config.unit}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                      Deviation
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-sm text-muted-foreground italic">
                  Data unavailable for this cycle
                </div>
              )}
              
              {/* Provenance footer */}
              <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/10">
                <div className="text-xs uppercase tracking-widest text-muted-foreground/70">
                  {dev.provenance} • {dev.fidelity} baseline
                </div>
                {dev.deviationPct !== null && !isUnavailable && (
                  <div className="text-xs uppercase tracking-widest text-muted-foreground/70">
                    {Math.abs(dev.deviationPct!).toFixed(1)}% delta
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

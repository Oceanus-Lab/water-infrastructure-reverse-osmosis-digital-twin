"use client";

import { useState } from "react";
import { Sliders, ArrowRight } from "lucide-react";
import type { WhatIfDeltaArtifact } from "@/lib/agent/types";

interface WhatIfWidgetProps {
  artifact: WhatIfDeltaArtifact;
}

export function WhatIfWidget({ artifact }: WhatIfWidgetProps) {
  const { unitId, baseInputs, modeledOutputs, deltas } = artifact;
  const [recovery, setRecovery] = useState(baseInputs?.recovery || 85);

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 my-2.5 shadow-sm text-xs">
      <div className="flex items-center space-x-2 mb-3">
        <Sliders className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">
          WaterTAP Simulation Comparison — Unit {unitId}
        </span>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-[11px] mb-1 font-medium">
            <span className="text-muted-foreground">Recovery Rate</span>
            <span className="font-mono text-foreground font-bold">{recovery}%</span>
          </div>
          <input
            type="range"
            min="65"
            max="90"
            step="1"
            value={recovery}
            onChange={(e) => setRecovery(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Modeled Pressure</div>
            <div className="font-mono font-bold text-foreground mt-0.5">
              {modeledOutputs?.pressure?.toFixed(2) || "14.20"} bar
            </div>
            {deltas?.pressureDelta !== undefined && (
              <div className="text-[10px] font-mono text-amber-500 flex items-center gap-1 mt-0.5">
                <ArrowRight className="w-2.5 h-2.5" />
                {deltas.pressureDelta >= 0 ? `+${deltas.pressureDelta}` : deltas.pressureDelta} bar
              </div>
            )}
          </div>

          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-[10px] text-muted-foreground">Specific Energy (SEC)</div>
            <div className="font-mono font-bold text-foreground mt-0.5">
              {modeledOutputs?.sec?.toFixed(2) || "1.85"} kWh/m³
            </div>
            {deltas?.secDelta !== undefined && (
              <div className="text-[10px] font-mono text-primary flex items-center gap-1 mt-0.5">
                <ArrowRight className="w-2.5 h-2.5" />
                {deltas.secDelta >= 0 ? `+${deltas.secDelta}` : deltas.secDelta} kWh/m³
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

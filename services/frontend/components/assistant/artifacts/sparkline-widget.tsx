"use client";

import { Activity } from "lucide-react";
import type { SparklineArtifact } from "@/lib/agent/types";

interface SparklineWidgetProps {
  artifact: SparklineArtifact;
}

export function SparklineWidget({ artifact }: SparklineWidgetProps) {
  const { unitId, metric, measuredData, baselineData } = artifact;

  if (!measuredData || measuredData.length === 0) return null;

  // Simple SVG sparkline rendering for guaranteed zero-width-crash safety in animated drawers
  const minVal = Math.min(...measuredData.map((d) => d.value));
  const maxVal = Math.max(...measuredData.map((d) => d.value), 1);
  const range = maxVal - minVal || 1;

  const points = measuredData
    .map((d, i) => {
      const x = (i / (measuredData.length - 1 || 1)) * 200;
      const y = 50 - ((d.value - minVal) / range) * 40;
      return `${x},${y}`;
    })
    .join(" ");

  const latestVal = measuredData[measuredData.length - 1]?.value.toFixed(2);

  return (
    <div className="rounded-xl border border-border/80 bg-background/95 p-3.5 my-2.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-semibold text-xs text-foreground">
            Unit {unitId} — {metric}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-primary">
          {latestVal}
        </span>
      </div>

      <div className="w-full h-[60px] bg-muted/20 rounded-lg p-1 flex items-center justify-center">
        <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground font-mono">
        <span>Start: {measuredData[0]?.date || "Historical"}</span>
        <span>Latest: {measuredData[measuredData.length - 1]?.date || "Replay Date"}</span>
      </div>
    </div>
  );
}

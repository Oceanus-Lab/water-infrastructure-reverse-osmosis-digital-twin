'use client';

import { Forecast, Anomaly } from "@/lib/types";
import { AlertTriangle, Activity, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EarlyWarningPanelProps {
  forecast: Forecast | null;
  anomalies: Anomaly[];
}

export function EarlyWarningPanel({ forecast, anomalies }: EarlyWarningPanelProps) {
  if (!forecast && anomalies.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" /> Early Warning Signals
        </div>
        <div className="p-4 bg-muted/30 border border-border/20 rounded-xl text-muted-foreground text-sm flex items-center gap-2">
          <Info className="w-4 h-4" /> No forecast or anomaly data available for this cycle.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
        <Activity className="w-4 h-4" /> Early Warning Signals
      </div>

      {forecast && (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 border border-border/20 rounded-xl flex flex-col gap-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Fouling Onset Score</div>
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-3xl font-light tracking-tight",
                forecast.foulingOnsetScore > 75 ? "text-destructive" :
                forecast.foulingOnsetScore > 50 ? "text-warning" : "text-success"
              )}>
                {forecast.foulingOnsetScore.toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground mb-1">/ 100</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 border-t border-border/10 pt-2">
              <span className="font-medium text-foreground">Driven by:</span> {forecast.featureAttribution.join(', ')}
            </div>
          </div>

          <div className="p-4 bg-muted/30 border border-border/20 rounded-xl flex flex-col gap-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Days to Clean (Forecast)</div>
            <div className="flex items-end gap-2">
              {forecast.daysToClean !== null ? (
                <>
                  <span className={cn(
                    "text-3xl font-light tracking-tight",
                    forecast.daysToClean < 14 ? "text-destructive" :
                    forecast.daysToClean < 30 ? "text-warning" : "text-success"
                  )}>
                    {forecast.daysToClean}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">days</span>
                </>
              ) : (
                <span className="text-xl text-muted-foreground">Incomplete Evidence</span>
              )}
            </div>
            {forecast.daysToClean !== null && (
              <div className="text-xs text-muted-foreground mt-2 border-t border-border/10 pt-2">
                <span className="font-medium text-foreground">90% CI:</span> {forecast.ciLower} - {forecast.ciUpper} days
                <br />
                <span className="font-medium text-foreground mt-1 inline-block">Drivers:</span> {forecast.forecastDrivers.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Active Anomalies</div>
          <div className="flex flex-col gap-2">
            {anomalies.map((anom, idx) => (
              <div key={idx} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-destructive">
                    {anom.signal} deviated by {anom.deviation_from_baseline > 0 ? '+' : ''}{anom.deviation_from_baseline}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Z-Score: {anom.z_score} (vs clean baseline)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

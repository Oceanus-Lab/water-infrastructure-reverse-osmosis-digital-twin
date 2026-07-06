'use client';

import { useEffect, useState } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchUnitInspection, fetchAlerts, fetchFleetStatus } from "@/lib/api";
import { UnitInspection, AlertItem, UnitHealth } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert, Activity, Cpu, BotMessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function InspectionDrawer() {
  const { selectedUnitId, currentDate, setSelectedUnitId } = useReplayStore();
  
  const [inspection, setInspection] = useState<UnitInspection | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unitHealth, setUnitHealth] = useState<UnitHealth | null>(null);

  useEffect(() => {
    if (!selectedUnitId) {
      setInspection(null);
      setAlerts([]);
      setUnitHealth(null);
      return;
    }
    
    // In real app, we'd use React Query or Promise.all
    fetchUnitInspection(selectedUnitId, currentDate).then(setInspection);
    fetchAlerts(currentDate).then(data => setAlerts(data.filter(a => a.unitId === selectedUnitId)));
    fetchFleetStatus(currentDate).then(fleet => setUnitHealth(fleet.find(u => u.id === selectedUnitId) || null));

  }, [selectedUnitId, currentDate]);

  return (
    <aside 
      role="region" 
      aria-label="Unit Inspection Details" 
      aria-live="polite"
      className={cn(
      "shrink-0 bg-background border-l border-border/40 shadow-[-8px_0_30px_rgba(0,0,0,0.02)] flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
      selectedUnitId ? "w-[380px] lg:w-[420px]" : "w-[320px] bg-background/50 backdrop-blur-sm"
    )}>
      {!selectedUnitId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in fill-mode-both duration-1000">
          <Activity className="size-8 mb-4 opacity-20" />
          <p className="text-sm font-medium tracking-tight">Select an equipment unit<br/>to view details</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto p-8 gap-8 animate-in fade-in slide-in-from-right-8 fill-mode-both duration-700" key={selectedUnitId}>
          
          {/* Header */}
          <header className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-1">Unit Inspection</div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedUnitId}</h2>
              </div>
              <button onClick={() => setSelectedUnitId(null)} className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted/20">
                Close
              </button>
            </div>
            
            {unitHealth && (
              <StatusBadge score={unitHealth.score} scoreSource={unitHealth.scoreSource} />
            )}
          </header>

          <div className="h-px bg-border/40 w-full" />

          {/* Diagnostics Panel */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground flex items-center gap-2">
              <TriangleAlert className="size-3" /> Diagnostics
            </h3>
            {alerts.length === 0 ? (
              <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 text-sm text-green-700 font-medium">
                No active alerts for this unit.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {alerts.map(alert => (
                  <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'} className="bg-background rounded-2xl shadow-sm border-border/50">
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle className="font-semibold">{alert.message}</AlertTitle>
                    <AlertDescription className="text-xs opacity-90 mt-1.5 leading-relaxed">
                      {alert.evidence}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </section>

          {/* Current Telemetry */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground flex items-center gap-2">
              <Cpu className="size-3" /> Current Telemetry
            </h3>
            
            {inspection ? (
              <div className="grid grid-cols-2 gap-3">
                <TelemetryCard label="Flux" value={inspection.flux.value} unit="LMH" source={inspection.flux.source} />
                <TelemetryCard label="Delta P" value={inspection.pressureDrop.value} unit="bar" source={inspection.pressureDrop.source} />
                <TelemetryCard label="Energy" value={inspection.energyUsage.value} unit="kWh/m³" source={inspection.energyUsage.source} />
                <TelemetryCard label="Clean Cycle" value={inspection.daysSinceClean} unit="days" source="measured" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-muted/10 rounded-2xl animate-pulse" />
                <div className="h-24 bg-muted/10 rounded-2xl animate-pulse" />
              </div>
            )}
          </section>

          {/* AI Assistant Stub (Gemini Enterprise Runtime compatible) */}
          <section className="flex flex-col gap-3 mt-auto pt-8">
            <div className="rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-primary/[0.03] to-transparent p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <BotMessageSquare className="size-4" />
                AI Assistant
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I am analyzing the latest signals. Ask me to forecast fouling accumulation or recommend CIP schedules.
              </p>
              <div className="w-full h-10 rounded-full bg-background border border-border/50 text-xs text-muted-foreground font-medium flex items-center px-4 mt-2 cursor-text hover:border-primary/30 transition-colors shadow-sm">
                Ask a question...
              </div>
            </div>
          </section>

        </div>
      )}
    </aside>
  );
}

function TelemetryCard({ label, value, unit, source }: { label: string, value: number, unit: string, source: string }) {
  return (
    <div className="flex flex-col p-4 rounded-2xl border border-border/40 bg-background hover:bg-muted/20 transition-colors shadow-sm group">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight text-foreground">{value.toFixed(1)}</span>
        <span className="text-[10px] text-muted-foreground font-semibold">{unit}</span>
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-2 font-bold group-hover:text-muted-foreground/60 transition-colors">
        {source}
      </div>
    </div>
  );
}

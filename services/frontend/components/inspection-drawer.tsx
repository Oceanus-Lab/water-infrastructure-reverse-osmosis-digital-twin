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
    
    fetchUnitInspection(selectedUnitId, currentDate).then(setInspection);
    fetchAlerts(currentDate).then(data => setAlerts(data.filter(a => a.unitId === selectedUnitId)));
    fetchFleetStatus(currentDate).then(fleet => setUnitHealth(fleet.find(u => u.id === selectedUnitId) || null));

  }, [selectedUnitId, currentDate]);

  return (
    <aside 
      role="region"
      aria-label="Inspection Pane"
      className={cn(
      "shrink-0 bg-[#E8E8E8] border-l border-border/20 shadow-[-8px_0_30px_rgba(0,0,0,0.03)] flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
      "w-[400px] lg:w-[460px] h-full relative"
    )}>
      {!selectedUnitId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 animate-in fade-in fill-mode-both duration-1000">
          <Activity className="size-8 mb-4 opacity-30" />
          <p className="text-sm font-semibold tracking-tight uppercase">Select an equipment unit<br/>to view details</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto p-8 gap-10 animate-in fade-in slide-in-from-right-8 fill-mode-both duration-700" key={selectedUnitId}>
          
          {/* Header */}
          <header className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 mb-2">Unit Inspection</div>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{selectedUnitId}</h2>
              </div>
              <button onClick={() => setSelectedUnitId(null)} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors p-2 bg-white rounded-full shadow-sm">
                Close
              </button>
            </div>
            
            {unitHealth && (
              <StatusBadge score={unitHealth.score} scoreSource={unitHealth.scoreSource} />
            )}
          </header>

          <div className="h-px bg-border/30 w-full" />

          {/* Diagnostics Panel */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
              <TriangleAlert className="size-3" /> Diagnostics
            </h3>
            {alerts.length === 0 ? (
              <div className="bg-white/50 border border-border/20 rounded-[20px] p-5 text-sm text-foreground font-semibold">
                No active anomalies.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {alerts.map(alert => (
                  <Alert key={alert.id} className="bg-white border-none rounded-[20px] shadow-sm">
                    <TriangleAlert className="h-4 w-4 text-foreground" />
                    <AlertTitle className="font-extrabold">{alert.message}</AlertTitle>
                    <AlertDescription className="text-[12px] opacity-80 mt-2 font-medium leading-relaxed text-foreground">
                      {alert.evidence}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </section>

          {/* Current Telemetry */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
              <Cpu className="size-3" /> Current Telemetry
            </h3>
            
            {inspection ? (
              <div className="grid grid-cols-2 gap-4">
                <TelemetryCard label="Flux" value={inspection.flux.value} unit="LMH" source={inspection.flux.source} />
                <TelemetryCard label="Delta P" value={inspection.pressureDrop.value} unit="bar" source={inspection.pressureDrop.source} />
                <TelemetryCard label="Energy" value={inspection.energyUsage.value} unit="kWh/m³" source={inspection.energyUsage.source} />
                <TelemetryCard label="Clean Cycle" value={inspection.daysSinceClean} unit="days" source="measured" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="h-28 bg-white/40 rounded-[20px] animate-pulse" />
                <div className="h-28 bg-white/40 rounded-[20px] animate-pulse" />
              </div>
            )}
          </section>

          {/* AI Assistant Stub */}
          <section className="flex flex-col gap-4 mt-auto pt-8">
            <div className="rounded-[20px] border-none bg-white p-6 flex flex-col gap-5 shadow-sm">
              <div className="flex items-center gap-2 text-foreground font-extrabold text-sm uppercase tracking-widest">
                <BotMessageSquare className="size-4" />
                AI Assistant
              </div>
              <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                Analyzing the latest signals. Ask me to forecast fouling accumulation or recommend CIP schedules.
              </p>
              <div className="w-full h-12 rounded-[16px] bg-[#F9F9F8] border border-border/20 text-[12px] text-muted-foreground font-bold flex items-center px-5 cursor-text hover:border-black/20 transition-colors shadow-inner">
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
    <div className="flex flex-col p-5 rounded-[20px] bg-white transition-colors shadow-sm">
      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-3">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tracking-tight text-foreground">{value.toFixed(1)}</span>
        <span className="text-[11px] text-muted-foreground font-bold">{unit}</span>
      </div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mt-3 font-extrabold">
        {source}
      </div>
    </div>
  );
}

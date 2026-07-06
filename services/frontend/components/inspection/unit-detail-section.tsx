import { UnitInspection, AlertItem, UnitHealth, SourceProvenance } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert, Cpu } from "lucide-react";
import { EvidenceFigure } from "@/components/evidence-figure";
import { ForecastPlaceholder } from "./forecast-placeholder";

interface UnitDetailSectionProps {
  selectedUnitId: string;
  unitHealth: UnitHealth | null;
  activeAlerts: AlertItem[];
  inspection: UnitInspection | null;
  onClose: () => void;
}

export function UnitDetailSection({ selectedUnitId, unitHealth, activeAlerts, inspection, onClose }: UnitDetailSectionProps) {
  return (
    <>
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 mb-2">Unit Inspection</div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{selectedUnitId}</h2>
          </div>
          <button onClick={onClose} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 bg-white rounded-[8px] border border-border/40">
            Close
          </button>
        </div>
        
        {unitHealth && (
          <StatusBadge score={unitHealth.score} scoreSource={unitHealth.scoreSource} />
        )}
      </header>

      <div className="h-px bg-border/30 w-full" />

      {/* Diagnostics Panel */}
      <section className="flex flex-col gap-5">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
          <TriangleAlert className="size-3" /> Diagnostics
        </h3>
        {activeAlerts.length === 0 ? (
          <div className="bg-white/50 border border-border/20 rounded-[20px] p-5 text-sm text-foreground font-semibold">
            No active anomalies.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeAlerts.map(alert => (
              <Alert key={alert.id} className="bg-white border-border/40 rounded-[20px]">
                <TriangleAlert className="h-4 w-4 text-foreground" />
                <AlertTitle className="font-extrabold">{alert.message}</AlertTitle>
                <AlertDescription className="text-[12px] opacity-80 mt-2 font-medium leading-relaxed text-foreground bg-border/10 p-2 rounded-md">
                  <span className="font-bold block mb-1">Evidence:</span> {alert.evidence}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </section>

      {/* Current Telemetry */}
      <section className="flex flex-col gap-5">
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

      {/* Fouling Forecast */}
      <ForecastPlaceholder />
    </>
  );
}

function TelemetryCard({ label, value, unit, source }: { label: string, value: number | null, unit: string, source: SourceProvenance }) {
  return (
    <div className="flex flex-col p-5 rounded-[20px] bg-white border border-border/20 transition-colors">
      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-3">{label}</span>
      <EvidenceFigure value={value === null ? null : Number(value.toFixed(1))} unit={unit} source={source} />
    </div>
  );
}

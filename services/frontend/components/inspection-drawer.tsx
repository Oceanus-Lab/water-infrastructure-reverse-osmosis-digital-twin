'use client';

import { useEffect, useState, useMemo } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchUnitInspection, fetchAlerts, fetchFleetStatus, fetchEnvironmentContext, fetchPhysicsDeviation, fetchForecast, fetchAnomaly } from "@/lib/api";
import { UnitInspection, AlertItem, UnitHealth, EnvironmentalContext, PhysicsDeviation, Forecast, Anomaly } from "@/lib/types";
import { BotMessageSquare, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { FleetSummaryPanel } from "./inspection/fleet-summary-panel";
import { UnitDetailSection } from "./inspection/unit-detail-section";
import { AlertsFeed } from "./inspection/alerts-feed";
import { AIAssistantPanel } from "./inspection/ai-assistant-panel";
import { PhysicsDeviationPanel } from "./inspection/physics-deviation-panel";
import { EarlyWarningPanel } from "./inspection/early-warning-panel";

function EnvContextPanel({ env }: { env: EnvironmentalContext | null }) {
  if (!env) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" /> Environmental Context
      </div>
      <div className="p-4 bg-muted/30 border border-border/20 rounded-xl grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Ambient Temp (7d)</div>
          <div className="text-xl font-medium">{env.ambientTemperatureC.toFixed(1)}°C</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Energy Cost</div>
          <div className="text-xl font-medium">${env.electricityCostUsdPerKwh.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

export function InspectionDrawer() {
  const { selectedUnitId, currentDate, setSelectedUnitId } = useReplayStore();
  
  const [inspection, setInspection] = useState<UnitInspection | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [fleetHealth, setFleetHealth] = useState<UnitHealth[]>([]);
  const [envContext, setEnvContext] = useState<EnvironmentalContext | null>(null);
  const [physicsDeviations, setPhysicsDeviations] = useState<PhysicsDeviation[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  
  const unitHealth = useMemo(() => fleetHealth.find(u => u.id === selectedUnitId) || null, [fleetHealth, selectedUnitId]);
  const activeAlerts = useMemo(() => alerts.filter(a => a.unitId === selectedUnitId), [alerts, selectedUnitId]);
  
  const fleetAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical' || a.severity === 'warning'), [alerts]);
  const watchUnits = useMemo(() => fleetHealth.filter(u => u.status === 'watch' || u.status === 'alert'), [fleetHealth]);

  useEffect(() => {
    fetchAlerts(currentDate).then(setAlerts);
    fetchFleetStatus(currentDate).then(setFleetHealth);
    fetchEnvironmentContext(currentDate).then(setEnvContext);

    if (selectedUnitId) {
      fetchUnitInspection(selectedUnitId, currentDate).then(setInspection);
      fetchPhysicsDeviation(selectedUnitId, currentDate).then(setPhysicsDeviations);
      fetchForecast(selectedUnitId, currentDate).then(setForecast);
      fetchAnomaly(selectedUnitId, currentDate).then(setAnomalies);
    } else {
      setInspection(null);
      setPhysicsDeviations([]);
      setForecast(null);
      setAnomalies([]);
    }
  }, [selectedUnitId, currentDate]);

  const handleClose = () => {
    setSelectedUnitId(null);
  };

  return (
    <aside 
      role="region"
      aria-label="Inspection Pane"
      className={cn(
      "shrink-0 bg-background/50 border-l border-border/20 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
      "w-[400px] xl:w-[460px] h-full relative z-10"
    )}>
      {!selectedUnitId ? (
        <div className="flex-1 flex flex-col overflow-y-auto pb-8 gap-8">
          <FleetSummaryPanel 
            fleetHealth={fleetHealth}
            fleetAlerts={fleetAlerts}
            watchUnits={watchUnits}
          />
          <div className="px-6">
            <EnvContextPanel env={envContext} />
          </div>
          <AlertsFeed alerts={fleetAlerts} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto p-10 gap-12 animate-in fade-in slide-in-from-right-8 fill-mode-both duration-700" key={selectedUnitId}>
          <UnitDetailSection 
            selectedUnitId={selectedUnitId}
            unitHealth={unitHealth}
            activeAlerts={activeAlerts}
            inspection={inspection}
            onClose={handleClose}
          />
          
          <PhysicsDeviationPanel deviations={physicsDeviations} />

          <EarlyWarningPanel forecast={forecast} anomalies={anomalies} />

          <AIAssistantPanel />
        </div>
      )}
    </aside>
  );
}

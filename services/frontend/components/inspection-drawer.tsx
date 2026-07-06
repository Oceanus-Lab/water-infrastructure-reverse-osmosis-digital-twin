'use client';

import { useEffect, useState, useMemo } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchUnitInspection, fetchAlerts, fetchFleetStatus } from "@/lib/api";
import { UnitInspection, AlertItem, UnitHealth } from "@/lib/types";
import { BotMessageSquare, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { FleetSummaryPanel } from "./inspection/fleet-summary-panel";
import { UnitDetailSection } from "./inspection/unit-detail-section";
import { AlertsFeed } from "./inspection/alerts-feed";
import { AIAssistantPanel } from "./inspection/ai-assistant-panel";

export function InspectionDrawer() {
  const { selectedUnitId, currentDate, setSelectedUnitId } = useReplayStore();
  
  const [inspection, setInspection] = useState<UnitInspection | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [fleetHealth, setFleetHealth] = useState<UnitHealth[]>([]);
  
  const unitHealth = useMemo(() => fleetHealth.find(u => u.id === selectedUnitId) || null, [fleetHealth, selectedUnitId]);
  const activeAlerts = useMemo(() => alerts.filter(a => a.unitId === selectedUnitId), [alerts, selectedUnitId]);
  
  const fleetAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical' || a.severity === 'warning'), [alerts]);
  const watchUnits = useMemo(() => fleetHealth.filter(u => u.status === 'watch' || u.status === 'alert'), [fleetHealth]);

  useEffect(() => {
    fetchAlerts(currentDate).then(setAlerts);
    fetchFleetStatus(currentDate).then(setFleetHealth);

    if (selectedUnitId) {
      fetchUnitInspection(selectedUnitId, currentDate).then(setInspection);
    } else {
      setInspection(null);
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
        <div className="flex-1 overflow-y-auto">
          <FleetSummaryPanel 
            fleetHealth={fleetHealth}
            fleetAlerts={fleetAlerts}
            watchUnits={watchUnits}
          />
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

          <AIAssistantPanel />
        </div>
      )}
    </aside>
  );
}

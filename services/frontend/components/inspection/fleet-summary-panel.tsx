import { UnitHealth, AlertItem } from "@/lib/types";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetSummaryPanelProps {
  fleetHealth: UnitHealth[];
  fleetAlerts: AlertItem[];
  watchUnits: UnitHealth[];
}

export function FleetSummaryPanel({ fleetHealth, fleetAlerts, watchUnits }: FleetSummaryPanelProps) {
  return (
    <div className="flex-1 flex flex-col p-10 gap-10 animate-in fade-in fill-mode-both duration-1000 overflow-y-auto">
      <header className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80">Default View</div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Fleet Summary</h2>
      </header>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[20px] p-5 border border-border/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-2">Total Alerts</span>
          <span className="text-4xl font-black text-foreground">{fleetAlerts.length}</span>
        </div>
        <div className="bg-white rounded-[20px] p-5 border border-border/20 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-2">Units Degraded</span>
          <span className="text-4xl font-black text-foreground">{watchUnits.length}<span className="text-sm font-bold text-muted-foreground ml-1">/ 21</span></span>
        </div>
      </div>
      
      <section className="flex flex-col gap-4">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
          <Activity className="size-3" /> Fleet Health Status
        </h3>
        <div className="bg-white rounded-[20px] p-6 border border-border/20 flex flex-col gap-4">
          {['healthy', 'watch', 'alert'].map((status) => {
            const count = fleetHealth.filter(u => u.status === status).length;
            const pct = fleetHealth.length ? Math.round((count / fleetHealth.length) * 100) : 0;
            let colorClass = "bg-foreground/20";
            if (status === 'watch') colorClass = "bg-muted-foreground";
            if (status === 'alert') colorClass = "bg-primary";
            
            return (
              <div key={status} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-foreground">{status}</span>
                  <span className="text-muted-foreground">{count} units</span>
                </div>
                <div className="w-full bg-border/20 h-2 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-1000", colorClass)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

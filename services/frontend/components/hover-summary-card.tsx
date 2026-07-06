import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnitHoverSummary, UnitHealth } from "@/lib/types";
import { StatusBadge } from "./status-badge";

interface HoverSummaryCardProps {
  unit?: UnitHealth;
  children: React.ReactNode;
}

export function HoverSummaryCard({ unit, children }: HoverSummaryCardProps) {
  if (!unit) return <>{children}</>;

  // Mocking the hover summary data based on the unit health since we don't have a dedicated API endpoint for it yet.
  const summary: UnitHoverSummary = {
    ...unit,
    stage3FluxPct: unit.score ? Math.max(0, 100 - unit.score) : 0,
    recoveryPct: 84.5,
    lastCipDate: "2020-05-10",
    stage3FluxSource: "measured",
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-white border border-border/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-[16px] p-4 flex flex-col gap-3 min-w-[200px]" sideOffset={12}>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">Hover Summary</span>
          <h4 className="text-[13px] font-bold text-foreground">{unit.id} KPIs</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Stage 3 Flux</span>
            <span className="text-lg font-mono tabular-nums font-black tracking-tight text-foreground">{summary.stage3FluxPct.toFixed(1)}<span className="text-[10px] font-sans ml-0.5">%</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Recovery</span>
            <span className="text-lg font-mono tabular-nums font-black tracking-tight text-foreground">{summary.recoveryPct.toFixed(1)}<span className="text-[10px] font-sans ml-0.5">%</span></span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border/20 mt-1">
          <StatusBadge score={unit.score} scoreSource={unit.scoreSource} showDetails={false} />
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

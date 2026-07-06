import { SourceProvenance } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, FlaskConical } from "lucide-react";

interface EvidenceFigureProps {
  value: number | string | null;
  source?: SourceProvenance;
  label?: string;
  unit?: string;
  validated?: boolean;
  className?: string;
}

export function EvidenceFigure({ 
  value, 
  source = "measured", 
  label, 
  unit, 
  validated = true, 
  className 
}: EvidenceFigureProps) {
  
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-sm italic">Unavailable</span>;
  }

  if (!validated) {
    return (
      <div className={cn("flex flex-col gap-0.5", className)}>
        <span className="text-sm font-medium italic text-muted-foreground/70">Not yet validated</span>
        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/50">
          Awaiting confirmation
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-baseline gap-1 font-mono tabular-nums">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {unit && <span className="text-xs font-bold text-muted-foreground leading-none">{unit}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        {source === "measured" ? (
          <CheckCircle2 className="w-3 h-3 text-foreground" />
        ) : (
          <FlaskConical className="w-3 h-3 text-primary" />
        )}
        <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground leading-none">
          {source} {label && <span className="text-muted-foreground/50 mx-0.5">•</span>} {label}
        </span>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { SourceProvenance } from "@/lib/types";

interface StatusBadgeProps {
  score: number | null;
  scoreSource: SourceProvenance;
  className?: string;
  showDetails?: boolean;
}

export function StatusBadge({ score, scoreSource, className, showDetails = true }: StatusBadgeProps) {
  // Pure monochrome editorial style. Removes bright AI Slop colors.
  return (
    <div className={cn("flex flex-col gap-1 items-start", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold tracking-widest uppercase text-foreground">
          {score !== null ? `Health: ${score}` : 'Status: Unknown'}
        </span>
      </div>
      
      {showDetails && (
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          <Info className="size-3" />
          {scoreSource}
        </div>
      )}
    </div>
  );
}

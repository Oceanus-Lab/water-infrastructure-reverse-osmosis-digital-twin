import { cn } from "@/lib/utils";

interface AssumedValueProps {
  value: number | string | null;
  label?: string;
  unit?: string;
  /** The assumption itself, stated — not merely the fact that one exists (FR-028). */
  assumption: string;
  className?: string;
}

/**
 * A figure that rests on an assumed constant rather than a sourced measurement.
 *
 * Distinct from `EvidenceFigure`, which labels measured-vs-modeled. A modeled figure is
 * computed from real inputs; an assumed one is computed from a number somebody chose. Both
 * labels can apply to the same figure, and collapsing them would let an assumed input pass as
 * a measured result — see research R5, where the electricity price is a parametric default
 * with no sourced feed behind it.
 */
export function AssumedValue({ value, label, unit, assumption, className }: AssumedValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-sm italic text-muted-foreground">Unavailable</span>;
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm font-medium text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        <span
          title={assumption}
          className="rounded-sm bg-amber-500/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
        >
          Assumed
        </span>
      </span>
      <span className="text-[10px] text-muted-foreground">{assumption}</span>
    </div>
  );
}

import { AlertTriangle, DatabaseZap, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Why a surface may be unable to show a figure.
 *
 * `not_produced` is deliberately distinct from `unavailable`: a capability that is running but
 * whose results were never generated needs a different answer than one that is down, because
 * the remedy differs and only one of them is a fault.
 */
export type CapabilityStatus = "available" | "unavailable" | "not_produced" | "placeholder";

interface CapabilityStateProps {
  state: CapabilityStatus;
  /** Why the capability could not answer — shown verbatim (FR-029). */
  reason?: string;
  /** What would generate the missing results, e.g. a script or pipeline tag (FR-026). */
  producedBy?: string;
  className?: string;
  children?: React.ReactNode;
}

const COPY: Record<Exclude<CapabilityStatus, "available">, { icon: typeof Info; title: string }> = {
  unavailable: { icon: AlertTriangle, title: "Unavailable" },
  not_produced: { icon: DatabaseZap, title: "Not yet produced" },
  placeholder: { icon: Info, title: "Placeholder data" },
};

/**
 * Gate between a figure and the screen.
 *
 * When the capability can answer, children render untouched. When it cannot, children are
 * NOT rendered — an explicit non-answer takes their place. That substitution is the whole
 * point: a zero or a blank where a real figure belongs is indistinguishable from a real
 * result, which is the failure Principle II forbids.
 */
export function CapabilityState({
  state,
  reason,
  producedBy,
  className,
  children,
}: CapabilityStateProps) {
  if (state === "available") return <>{children}</>;

  const { icon: Icon, title } = COPY[state];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 rounded-md bg-muted/20 px-3 py-2 text-muted-foreground ring-1 ring-foreground/5",
        className
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wider">{title}</p>
        {reason && <p className="text-xs">{reason}</p>}
        {producedBy && (
          <p className="text-xs">
            Produced by <span className="font-mono text-[11px]">{producedBy}</span>
          </p>
        )}
        {state === "placeholder" && (
          <p className="text-xs">These values are generated, not from the plant.</p>
        )}
      </div>
    </div>
  );
}

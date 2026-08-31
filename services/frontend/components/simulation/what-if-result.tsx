"use client";

import { Lightbulb } from "lucide-react";
import type { SolveResult, WhatIfComparison } from "@/lib/api";
import { CapabilityState } from "@/components/capability-state";
import { CONDITIONS } from "@/lib/physics/envelope";

/**
 * The result of one what-if, in whichever of its three shapes came back (research R2).
 *
 * The middle case is the one worth care: every value can be inside its range while the
 * combination has no solution. The capability returns a plain-language hint for it. Rendering
 * that hint instead of a generic failure is the difference between "the engine explained a
 * physical constraint" and "the engine is broken".
 */
export function WhatIfResult({ result }: { result: WhatIfComparison | null }) {
  if (!result) return null;

  const { baseline, scenario, delta, change } = result;

  if (!baseline.available || !scenario.available) {
    const reason = baseline.reason ?? scenario.reason ?? "Physics capability did not respond";
    return <CapabilityState state="unavailable" reason={reason} />;
  }

  const hint = baseline.hint ?? scenario.hint;
  if (delta === null) {
    return (
      <div
        role="note"
        className="flex items-start gap-2 rounded-md bg-muted/20 px-3 py-2 ring-1 ring-foreground/5"
      >
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            No solution at this combination
          </p>
          {hint ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The solver could not converge for these conditions together.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Figure label="Water flux" unit="kg/m²·h"
          baseline={baseline.clean_water_flux_kg_m2_h}
          scenario={scenario.clean_water_flux_kg_m2_h}
          delta={delta.flux_kg_m2_h} />
        <Figure label="Salt rejection" unit="%"
          baseline={baseline.clean_salt_rejection_pct}
          scenario={scenario.clean_salt_rejection_pct}
          delta={delta.rejection_pct} />
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Changed
          </p>
          {Object.entries(change).map(([k, v]) => {
            const spec = CONDITIONS.find((c) => c.key === k);
            return (
              <p key={k} className="font-mono text-xs text-foreground">
                {spec?.label ?? k}: {v} {spec?.unit}
              </p>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="rounded-sm bg-muted/40 px-1.5 py-px font-bold uppercase tracking-wider">
          modeled
        </span>
        <span>Clean-membrane solve — fouling is not represented in this comparison.</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-5">
        {CONDITIONS.map((c) => (
          <div key={c.key}>
            <dt className="text-muted-foreground">{c.label}</dt>
            <dd className="font-mono text-foreground">
              {baseline.operating_point?.[c.key] ?? "—"} {c.unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Figure({
  label, unit, baseline, scenario, delta,
}: {
  label: string; unit: string;
  baseline?: number; scenario?: number; delta: number;
}) {
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label} <span className="normal-case">({unit})</span>
      </p>
      <p className="flex items-baseline gap-2 font-mono text-sm">
        <span className="text-muted-foreground">{baseline}</span>
        <span aria-hidden className="text-muted-foreground/50">→</span>
        <span className="font-semibold text-foreground">{scenario}</span>
      </p>
      <p className="font-mono text-lg font-semibold text-foreground">
        {sign}{delta}
      </p>
    </div>
  );
}

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { UnitEconomicsRow, CostAssumption } from "@/lib/api";
import { AssumedValue } from "@/components/assumed-value";

interface CleaningWorkloadPanelProps {
  units: UnitEconomicsRow[];
  assumptions: CostAssumption[];
}

/**
 * How many cleans the fleet is currently advised to do, and what they would cost (FR-006).
 *
 * The count comes from the economics recommendation rather than a separate rule, so this panel
 * and the ranking table can never disagree about which units need attention.
 */
export function CleaningWorkloadPanel({ units, assumptions }: CleaningWorkloadPanelProps) {
  const due = units.filter((u) => u.recommendation === "CLEAN NOW");
  const totalCost = due.reduce((s, u) => s + u.cipCostUsd, 0);
  const cipCost = assumptions.find((a) => a.key === "cip_cost_usd");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleaning workload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Units advised to clean
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              {due.length}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                of {units.length}
              </span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Estimated cost if all performed
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              ${totalCost.toFixed(0)}
            </p>
          </div>
        </div>

        {due.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{due.map((u) => u.unitId).join(", ")}</span>
          </p>
        )}

        {cipCost && (
          <AssumedValue
            value={cipCost.value}
            unit={cipCost.unit}
            label={cipCost.label}
            assumption={cipCost.assumption}
          />
        )}
      </CardContent>
    </Card>
  );
}

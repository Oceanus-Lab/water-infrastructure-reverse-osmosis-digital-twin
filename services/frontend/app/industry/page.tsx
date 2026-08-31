"use client";

import { useEffect, useState } from "react";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchFleetEconomics, type FleetEconomicsSnapshot } from "@/lib/api";
import { CapabilityState, type CapabilityStatus } from "@/components/capability-state";
import { CostTrendChart } from "@/components/industry/cost-trend-chart";
import { AvoidableCostTable } from "@/components/industry/avoidable-cost-table";
import { CleaningWorkloadPanel } from "@/components/industry/cleaning-workload-panel";
import { AssumptionControls } from "@/components/economics/assumption-controls";
import { DecisionRecordPanel } from "@/components/decisions/decision-record-panel";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Operations-manager surface (feature 012, US1).
 *
 * Only economics parameters are shown as prices here. /api/env also reports an electricity
 * price, but it disagrees with the one the economics are actually computed from (0.12 vs
 * 0.08) — showing both would put a 50% discrepancy in a single view. The economics parameter
 * is the single source of truth; see specs/012 research R5.
 */
export default function IndustryPage() {
  const currentDate = useReplayStore((s) => s.currentDate);
  const [snapshot, setSnapshot] = useState<FleetEconomicsSnapshot | null>(null);
  const [state, setState] = useState<CapabilityStatus>("available");
  const [reason, setReason] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetchFleetEconomics(currentDate, controller.signal)
      .then((data) => {
        setSnapshot(data);
        setState("available");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setSnapshot(null);
        setState("unavailable");
        setReason(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [currentDate]);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Industry Engine</h1>
          <p className="mt-2 text-muted-foreground">
            Fleet operating cost, where it is accruing, and the maintenance it implies — as of{" "}
            <span className="font-mono">{currentDate.slice(0, 10)}</span>.
          </p>
        </header>

        {loading && !snapshot ? (
          <div className="space-y-4">
            <Skeleton className="h-[280px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : state !== "available" || !snapshot ? (
          <CapabilityState state={state} reason={reason} />
        ) : (
          <div className="space-y-8">
            <CostTrendChart units={snapshot.units} assumptions={snapshot.assumptions} />
            <div className="grid gap-8 lg:grid-cols-2">
              <CleaningWorkloadPanel units={snapshot.units} assumptions={snapshot.assumptions} />
              <AvoidableCostTable
                units={snapshot.units}
                unavailableUnits={snapshot.unavailableUnits}
              />
            </div>
            {snapshot.units.length > 0 && (
              // Scoped to the worst-ranked unit: the override endpoint is per-unit, and the
              // unit carrying the most avoidable cost is the one worth arguing about.
              <AssumptionControls
                assumptions={snapshot.assumptions}
                unitId={snapshot.units[0].unitId}
                date={currentDate.slice(0, 10)}
              />
            )}
            {/* Governance review sits with the operations manager. */}
            <DecisionRecordPanel />
          </div>
        )}
      </div>
    </main>
  );
}

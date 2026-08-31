"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { UnitEconomicsRow } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AvoidableCostTableProps {
  units: UnitEconomicsRow[];
  unavailableUnits: string[];
}

/**
 * Units ranked by the cost currently attributable to their condition (FR-005).
 *
 * Ordered by daily penalty rather than cumulative: cumulative rewards a unit for having run a
 * long time, whereas the daily rate is what is being spent now and therefore what prioritises
 * attention.
 */
export function AvoidableCostTable({ units, unavailableUnits }: AvoidableCostTableProps) {
  const ranked = [...units].sort((a, b) => b.dailyEnergyPenaltyUsd - a.dailyEnergyPenaltyUsd);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avoidable cost by unit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Per day</TableHead>
              <TableHead>Accrued</TableHead>
              <TableHead>ΔP rise</TableHead>
              <TableHead>Advice</TableHead>
              <TableHead>Basis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((u) => (
              <TableRow key={u.unitId} data-testid="avoidable-cost-row">
                <TableCell className="font-mono font-medium">{u.unitId}</TableCell>
                <TableCell className="font-mono">${u.dailyEnergyPenaltyUsd.toFixed(2)}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  ${u.cumEnergyPenaltyUsd.toFixed(0)}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {u.dpRisePsi.toFixed(2)} psi
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-px text-[10px] font-bold uppercase tracking-wider",
                      u.recommendation === "CLEAN NOW"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {u.recommendation}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {u.provenance}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {unavailableUnits.length > 0 && (
          // Named, not zero-filled — a unit with no groundable economics is not a $0 unit.
          <p role="note" className="text-[11px] text-muted-foreground">
            No groundable economics at this date:{" "}
            <span className="font-mono">{unavailableUnits.join(", ")}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

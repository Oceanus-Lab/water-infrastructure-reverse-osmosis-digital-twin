"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { UnitEconomicsRow, CostAssumption } from "@/lib/api";
import { AssumedValue } from "@/components/assumed-value";

interface CostTrendChartProps {
  units: UnitEconomicsRow[];
  assumptions: CostAssumption[];
}

/**
 * Fleet operating cost, led by the difference rather than an absolute headline (FR-007).
 *
 * Plots cumulative energy penalty per unit against its current daily rate, which is the shape
 * that answers "where is cost accumulating". An absolute cost-of-water figure is deliberately
 * NOT the headline here: it carries the full stack of assumed parameters, whereas the ranking
 * and the trend survive them.
 */
export function CostTrendChart({ units, assumptions }: CostTrendChartProps) {
  const data = [...units]
    .sort((a, b) => b.cumEnergyPenaltyUsd - a.cumEnergyPenaltyUsd)
    .map((u) => ({
      unit: u.unitId,
      cumulative: u.cumEnergyPenaltyUsd,
      daily: u.dailyEnergyPenaltyUsd,
    }));

  const totalDaily = units.reduce((s, u) => s + u.dailyEnergyPenaltyUsd, 0);
  const price = assumptions.find((a) => a.key === "electricity_price_usd_kwh");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operating cost — fouling energy penalty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Fleet daily penalty
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              ${totalDaily.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">/day</span>
            </p>
          </div>
          {price && (
            <AssumedValue
              value={price.value}
              unit={price.unit}
              label={price.label}
              assumption={price.assumption}
            />
          )}
        </div>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="unit" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === "number" ? `$${value.toFixed(2)}` : String(value ?? "—"),
                  name === "cumulative" ? "Accrued this cycle" : "Per day",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="cumulative" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="daily" dot={false} strokeWidth={1} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Differences and rankings are robust; absolute cost carries roughly ±20% uncertainty
          because every parameter above is assumed rather than sourced.
        </p>
      </CardContent>
    </Card>
  );
}

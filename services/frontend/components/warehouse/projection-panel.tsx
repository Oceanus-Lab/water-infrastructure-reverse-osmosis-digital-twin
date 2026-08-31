"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { WarehouseForecast } from "@/lib/api";

/**
 * The forward projection AI.FORECAST (TimesFM) produces, in-warehouse (US5).
 *
 * The band is not optional decoration — it is the evidence the figure is not permitted to
 * appear without (FR-024). There is no code path here that renders `ndp_forecast` alone.
 */
export function ProjectionPanel({ result }: { result: WarehouseForecast }) {
  const data = result.horizon.map((p) => ({
    date: p.forecast_date.slice(5),
    forecast: p.ndp_forecast,
    band: [p.ndp_lower_90, p.ndp_upper_90],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forward projection — {result.unitId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="rounded-sm bg-muted/40 px-1.5 py-px">{result.computedIn}</span>
          {result.method}
        </p>

        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area dataKey="band" stroke="none" fillOpacity={0.15} />
              <Line type="monotone" dataKey="forecast" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Shaded band is the 90% prediction interval — the projection is never shown without it.
        </p>

        {/* Textual, not just visual: a chart alone is neither queryable as text nor reachable
            by assistive technology, and the band is required evidence (FR-024), not styling. */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-4">
          {data.map((p) => (
            <div key={p.date}>
              <dt className="text-muted-foreground">{p.date}</dt>
              <dd className="font-mono text-foreground">
                {p.forecast} <span className="text-muted-foreground">({p.band[0]}–{p.band[1]})</span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

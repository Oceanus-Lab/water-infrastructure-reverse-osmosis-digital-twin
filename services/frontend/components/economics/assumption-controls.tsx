"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, request, type CostAssumption } from "@/lib/api";
import { RecommendationFlipNotice } from "./recommendation-flip-notice";
import { cn } from "@/lib/utils";

interface OverrideResult {
  current: {
    recommendation: string;
    recommendation_flipped: boolean;
    params: Record<string, number>;
  };
  history: unknown[];
}

interface AssumptionControlsProps {
  assumptions: CostAssumption[];
  unitId: string;
  date: string;
}

/**
 * Make the six economics parameters editable, and show the answer move (US3).
 *
 * The reversal callout is driven by the server's `recommendation_flipped` rather than by
 * comparing recommendations here — the server recomputes the default case alongside the
 * overridden one, so it is the only place that can tell the difference reliably.
 */
export function AssumptionControls({ assumptions, unitId, date }: AssumptionControlsProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(assumptions.map((a) => [a.key, String(a.value)])),
  );
  const [result, setResult] = useState<OverrideResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function recompute() {
    // Validate before sending: an unusable value should not cost a round trip, and the
    // previous result must survive the rejection (FR-019).
    const params: Record<string, number> = {};
    for (const a of assumptions) {
      const n = Number(values[a.key]);
      if (values[a.key].trim() === "" || Number.isNaN(n) || !Number.isFinite(n) || n < a.min) {
        setError(`${a.label} must be a number of at least ${a.min}.`);
        return;
      }
      params[a.key] = n;
    }

    setError(null);
    setPending(true);
    try {
      setResult(
        await request<OverrideResult>(`/api/economics/${unitId}/override?date=${date}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? (err.detail ?? err.message) : String(err));
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setValues(Object.fromEntries(assumptions.map((a) => [a.key, String(a.defaultValue)])));
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost assumptions — {unitId}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Every figure below is assumed rather than sourced. Change one and the economics
          recompute from your value.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assumptions.map((a) => (
            <div key={a.key} className="space-y-1">
              <label
                htmlFor={`assumption-${a.key}`}
                className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {a.label} <span className="normal-case">({a.unit})</span>
              </label>
              <Input
                id={`assumption-${a.key}`}
                type="number"
                min={a.min}
                step="any"
                value={values[a.key]}
                disabled={pending}
                onChange={(e) => setValues((v) => ({ ...v, [a.key]: e.target.value }))}
              />
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="rounded-sm bg-amber-500/10 px-1 py-px font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  assumed
                </span>
                {a.assumption}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={recompute} disabled={pending}>
            Recompute
          </Button>
          <Button variant="ghost" onClick={reset} disabled={pending}>
            Reset to defaults
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-2 rounded-md bg-muted/20 px-3 py-2 ring-1 ring-foreground/5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Recommendation under your assumptions
            </p>
            <p
              className={cn(
                "font-mono text-lg font-semibold",
                result.current.recommendation === "CLEAN NOW"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground",
              )}
            >
              {result.current.recommendation}
            </p>
            <RecommendationFlipNotice flipped={result.current.recommendation_flipped} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

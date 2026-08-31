"use client";

import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { requestWhatIf, ApiError, type WhatIfComparison } from "@/lib/api";
import { CONDITIONS, DEFAULT_POINT, type OperatingPoint } from "@/lib/physics/envelope";
import { WhatIfResult } from "./what-if-result";

/**
 * Compose an arbitrary operating point and solve it on demand (FR-008, FR-013).
 *
 * Every condition is independently settable within its range — deliberately not a menu of
 * prepared scenarios, so the result always corresponds to what was actually asked. That makes
 * each request a real solve taking seconds, which is why the in-flight request is cancellable
 * (FR-014).
 */
export function WhatIfForm() {
  const [base] = useState<OperatingPoint>(DEFAULT_POINT);
  const [changed, setChanged] = useState<Partial<OperatingPoint>>({});
  const [result, setResult] = useState<WhatIfComparison | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const change = Object.fromEntries(
    Object.entries(changed).filter(([k, v]) => v !== undefined && v !== base[k as keyof OperatingPoint]),
  ) as Record<string, number>;

  async function compare() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Clear first: a stale result sitting under a spinner reads as the answer to the new
    // question (FR-014).
    setResult(null);
    setError(null);
    setPending(true);

    try {
      // An empty change would be rejected by the server; compare against itself instead so the
      // baseline is still solved and shown.
      const payload = Object.keys(change).length ? change : { pressure_bar: base.pressure_bar };
      setResult(await requestWhatIf(base, payload, controller.signal));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof ApiError ? (err.detail ?? err.message) : String(err));
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(false);
    setResult(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-if — clean-membrane physics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {CONDITIONS.map((c) => (
            <div key={c.key} className="space-y-1">
              <label
                htmlFor={`whatif-${c.key}`}
                className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {c.label} <span className="normal-case">({c.unit})</span>
              </label>
              <Input
                id={`whatif-${c.key}`}
                type="number"
                min={c.min}
                max={c.max}
                step={c.step}
                defaultValue={c.default}
                disabled={pending}
                onChange={(e) =>
                  setChanged((prev) => ({ ...prev, [c.key]: Number(e.target.value) }))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                {c.min}–{c.max}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={compare} disabled={pending}>
            Compare
          </Button>
          {pending && (
            <>
              <Button variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Computing — a solve takes a few seconds
              </span>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
            {error}
          </p>
        )}

        {!pending && <WhatIfResult result={result} />}
      </CardContent>
    </Card>
  );
}

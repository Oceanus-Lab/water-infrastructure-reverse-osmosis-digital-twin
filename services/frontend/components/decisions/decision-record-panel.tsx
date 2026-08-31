"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CapabilityState, type CapabilityStatus } from "@/components/capability-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { DecisionRecordEntry } from "@/lib/agent/decisions";

/**
 * The approved-decision audit trail, made readable (US4).
 *
 * Distinguishes three states deliberately: loading, an empty record, and an unreachable
 * store. Rendering the last as the second would say "nothing was ever approved" when the
 * truth is "we could not check" — the opposite of what an audit trail is for.
 */
export function DecisionRecordPanel() {
  const [entries, setEntries] = useState<DecisionRecordEntry[] | null>(null);
  const [state, setState] = useState<CapabilityStatus>("available");
  const [reason, setReason] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/agent/decisions", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setEntries(data.entries ?? []);
        setState("available");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setEntries(null);
        setState("unavailable");
        setReason(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : state !== "available" ? (
          <CapabilityState state={state} reason={reason} />
        ) : entries && entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No decisions have been recorded. Entries appear here only after an operator
            approves a proposal.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries?.map((e) => (
              <li
                key={e.proposalId}
                className="space-y-1 rounded-md bg-muted/20 px-3 py-2 ring-1 ring-foreground/5"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {e.unitId ?? "Fleet"}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.recordType}
                  </span>
                  <time
                    dateTime={e.writtenAt}
                    className="font-mono text-[10px] text-muted-foreground"
                  >
                    {e.writtenAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}
                  </time>
                </div>
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {typeof e.content === "string" ? e.content : JSON.stringify(e.content)}
                </p>
                {/* written_by records HOW the write was authorised, not who the operator
                    was — the product has no user identity, and implying one in an audit
                    column would be worse than naming the mechanism. */}
                <p className="text-[10px] text-muted-foreground">
                  Approved by an operator via the in-chat approval control
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

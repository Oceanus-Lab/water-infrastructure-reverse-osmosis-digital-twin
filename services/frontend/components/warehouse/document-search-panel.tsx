"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { DocumentSearchResult } from "@/lib/api";

/**
 * Document retrieval over the plant-knowledge corpus, in-warehouse (US5).
 *
 * A passage without `source_document` is dropped rather than shown with a placeholder label —
 * unattributed text is exactly the failure FR-025 exists to prevent, so there is no rendering
 * path for it, not even a degraded one.
 */
export function DocumentSearchPanel({ result }: { result: DocumentSearchResult }) {
  const attributed = result.results.filter((r) => r.source_document);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document search — &ldquo;{result.query}&rdquo;</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="rounded-sm bg-muted/40 px-1.5 py-px">{result.computedIn}</span>
          {result.method}
        </p>

        <ul className="space-y-2">
          {attributed.map((r, i) => (
            <li
              key={`${r.source_document}-${i}`}
              className="space-y-1 rounded-md bg-muted/20 px-3 py-2 ring-1 ring-foreground/5"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-medium text-foreground">
                  {r.source_document}
                </span>
                {r.section && (
                  <span className="text-[10px] text-muted-foreground">— {r.section}</span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{r.chunk_text}</p>
            </li>
          ))}
        </ul>

        <p className="text-[10px] text-muted-foreground">
          This corpus is this project&apos;s own procedures and design notes — not manufacturer
          datasheets.
        </p>
      </CardContent>
    </Card>
  );
}

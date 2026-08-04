'use client';

import { AlertTriangle } from "lucide-react";
import { useDataSourceStore } from "@/lib/store/data-source-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Visible marker for when the UI is showing mock data instead of the serving API.
 *
 * Renders nothing on the happy path. It only appears once lib/api/index.ts has had to fall
 * back, so an unreachable backend can no longer be mistaken for a working plant.
 */
export function DataSourceBanner() {
  const mode = useDataSourceStore((s) => s.mode);
  const failedPaths = useDataSourceStore((s) => s.failedPaths);
  const lastError = useDataSourceStore((s) => s.lastError);

  if (mode !== 'mock') return null;

  return (
    <Tooltip>
      {/* Base UI takes a `render` element, not Radix's asChild — matches hover-summary-card. */}
      <TooltipTrigger
        render={
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-1.5 rounded-sm border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wider">Mock data</span>
          </div>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-semibold">These numbers are not from the plant.</p>
        <p className="mt-1 text-xs">
          The serving API could not be reached{lastError ? ` (${lastError})` : ''}, so the values
          shown are generated placeholders.
        </p>
        {failedPaths.length > 0 && (
          <p className="mt-1 font-mono text-[10px] opacity-80">{failedPaths.join(', ')}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

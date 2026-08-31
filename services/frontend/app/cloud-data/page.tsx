"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReplayStore } from "@/lib/store/replay-store";
import {
  fetchWarehouseForecast, searchDocuments, ApiError,
  type WarehouseForecast, type DocumentSearchResult,
} from "@/lib/api";
import { CapabilityState, type CapabilityStatus } from "@/components/capability-state";
import { ProjectionPanel } from "@/components/warehouse/projection-panel";
import { DocumentSearchPanel } from "@/components/warehouse/document-search-panel";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_UNIT = "B03";

/**
 * In-warehouse intelligence surface (feature 012, US5).
 *
 * Makes the project's central architecture bet demonstrable: both panels read results
 * computed inside BigQuery (AI.FORECAST, VECTOR_SEARCH), not a separate ML pipeline.
 */
export default function CloudDataPage() {
  const selectedUnitId = useReplayStore((s) => s.selectedUnitId);
  const unitId = selectedUnitId ?? DEFAULT_UNIT;

  const [forecast, setForecast] = useState<WarehouseForecast | null>(null);
  const [forecastState, setForecastState] = useState<CapabilityStatus>("available");
  const [forecastReason, setForecastReason] = useState<string>();
  const [loadingForecast, setLoadingForecast] = useState(true);

  const [query, setQuery] = useState("when should a unit be cleaned");
  const [search, setSearch] = useState<DocumentSearchResult | null>(null);
  const [searchState, setSearchState] = useState<CapabilityStatus>("available");
  const [searchReason, setSearchReason] = useState<string>();
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingForecast(true);

    fetchWarehouseForecast(unitId, controller.signal)
      .then((data) => {
        setForecast(data);
        setForecastState("available");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setForecast(null);
        // 503 means the tables were never produced, not that the service is down — the
        // capability's own message says so (FR-026).
        setForecastState(err instanceof ApiError && err.status === 503 ? "not_produced" : "unavailable");
        setForecastReason(err instanceof ApiError ? err.detail : String(err));
      })
      .finally(() => setLoadingForecast(false));

    return () => controller.abort();
  }, [unitId]);

  async function runSearch() {
    setSearching(true);
    try {
      setSearch(await searchDocuments(query));
      setSearchState("available");
    } catch (err) {
      setSearch(null);
      setSearchState(err instanceof ApiError && err.status === 503 ? "not_produced" : "unavailable");
      setSearchReason(err instanceof ApiError ? err.detail : String(err));
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex-1 overflow-y-auto bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Cloud Data</h1>
          <p className="mt-2 text-muted-foreground">
            Forecasting and document retrieval computed in place, inside BigQuery — not a
            separate ML pipeline.
          </p>
        </header>

        <section className="space-y-3">
          {loadingForecast && !forecast ? (
            <Skeleton className="h-[220px] w-full" />
          ) : forecastState !== "available" || !forecast ? (
            <CapabilityState state={forecastState} reason={forecastReason} />
          ) : (
            <ProjectionPanel result={forecast} />
          )}
        </section>

        <section className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask the plant-knowledge corpus…"
              disabled={searching}
            />
            <Button onClick={runSearch} disabled={searching}>
              Search
            </Button>
          </div>

          {searching && !search ? (
            <Skeleton className="h-[160px] w-full" />
          ) : searchState !== "available" || !search ? (
            <CapabilityState state={searchState} reason={searchReason} />
          ) : (
            <DocumentSearchPanel result={search} />
          )}
        </section>
      </div>
    </main>
  );
}

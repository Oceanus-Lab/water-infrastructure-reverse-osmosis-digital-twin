# Tasks: Feature 008 — Visual Operations Twin (UI)

**Input**: Design documents from `specs/008-visual-twin-ui/`

**Feature branch**: `008-visual-twin-ui`

**Prerequisites**: `plan.md` ✅, `spec.md` ✅, constitution ✅

**Tech stack**: Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn/ui v2, Recharts, Manrope font, `services/frontend/`

**Approach**: Stub-first — all backend dependencies (Features 002–007) are replaced with typed mock data. Real data is a one-file swap per domain when the backend integration spec lands.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: Maps to user story from spec.md (US1–US6)
- Exact file paths included in every task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Next.js app, design system, routing shell, and shared utilities. Nothing from any user story can land until this is done.

- [X] T001 Initialize Next.js 15 app with TypeScript strict mode in `services/frontend/` using `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
- [X] T002 Install and configure shadcn/ui v2: run `npx shadcn@latest init` with New York style, zinc base color, and CSS variables enabled; creates `services/frontend/components.json`
- [X] T003 [P] Install Manrope from Google Fonts via `next/font/google` in `services/frontend/app/layout.tsx`, apply as CSS variable `--font-manrope`
- [X] T004 [P] Configure Tailwind v4 design tokens in `services/frontend/app/globals.css`: canvas `#F7F6F3`, accent `#1465C4`, status colors (healthy/watch/alert/unknown), Manrope font variable, border radius, and shadow values
- [X] T005 [P] Install shadcn components needed for all user stories: `npx shadcn@latest add badge card sheet tooltip slider tabs skeleton alert separator button`
- [X] T006 [P] Install Recharts for all chart components: `npm install recharts`
- [X] T007 [P] Install Zustand for global replay state: `npm install zustand`
- [X] T008 Create root app layout `services/frontend/app/layout.tsx` with Manrope font, `#F7F6F3` canvas background, and `NavHeader` slot
- [X] T009 Set up route structure: create `services/frontend/app/twin/page.tsx`, `app/simulation/page.tsx`, `app/industry/page.tsx`, `app/cloud-data/page.tsx` as empty exports
- [X] T010 [P] Create `services/frontend/.env.local.example` with `NEXT_PUBLIC_AGENT_ENDPOINT=` (empty = stub mode)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript contracts, mock data stubs, shared utilities, and the `scoreToStatus()` single source of truth — everything all user stories share.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T011 Create all TypeScript interfaces in `services/frontend/lib/types/index.ts`: `UnitHealth`, `UnitHoverSummary`, `UnitInspection`, `FluxTrendPoint`, `EconomicsBlock`, `AlertItem`, `ReplayState`, `FleetSnapshot`
- [X] T012 [P] Implement `scoreToStatus()` utility in `services/frontend/lib/utils/health.ts` with deterministic boundary rule (< 33 → healthy, 33–65 → watch, ≥ 66 → alert, null → unknown) and JSDoc
- [X] T013 [P] Create mock fleet stub `services/frontend/lib/data/mock-fleet.ts` with all 21 OCWD units (7 banks × 3 stages) at 3 replay waypoints: 2020-01-15 (healthy), 2020-06-15 (Bank F alert), 2020-11-01 (multi-alert edge case)
- [X] T014 [P] Create mock timeline stub `services/frontend/lib/data/mock-timeline.ts` with OCWD date range 2019-01-01 → 2021-01-13 and 3 snapshot waypoints
- [X] T015 [P] Create mock inspection stub `services/frontend/lib/data/mock-inspection.ts` with per-unit `UnitInspection` data including `FluxTrendPoint[]` (30 days), `AlertItem[]`, and `EconomicsBlock | null`
- [X] T016 [P] Create mock alerts stub `services/frontend/lib/data/mock-alerts.ts` with `AlertItem[]` covering watch and alert severity cases
- [X] T017 [P] Create API shim stubs: `services/frontend/lib/api/fleet.ts`, `lib/api/timeline.ts`, `lib/api/inspection.ts`, `lib/api/alerts.ts` — each exports async functions that return mock data today (TODO comment marks swap point)
- [X] T018 Create Zustand replay store `services/frontend/lib/store/replay-store.ts` with `ReplayState`, `setDate()`, `setPlaying()` — label hardcoded as `"REPLAY"`, never `"LIVE"`
- [X] T019 [P] Build `NavHeader` component `services/frontend/components/layout/NavHeader.tsx` with 4 shadcn `Tabs` tabs (Digital Twin, Physical Simulation, Industry Engine, Cloud Data) and `#1465C4` active indicator
- [X] T020 [P] Build `StatusBadge` component `services/frontend/components/plant/StatusBadge.tsx` consuming `scoreToStatus()`, using `Badge` from shadcn, status color tokens, and `scoreSource` label — never bare color

**Checkpoint**: Contracts, stubs, utilities, store, NavHeader, and StatusBadge all complete — user story phases can now begin.

---

## Phase 3: User Story 1 — Spatial Plant Health View (Priority: P1) 🎯 MVP

**Goal**: Render the full 21-unit fleet as a spatial operating picture with color-coded health at a glance.

**Independent Test**: Open `/twin`, confirm all 21 units appear as an equipment strip, each carries a `StatusBadge` matching `scoreToStatus()` output for mock data, and no table is visible.

- [X] T021 [US1] Build `PlantScene` container `services/frontend/components/plant/PlantScene.tsx` — fixed-aspect-ratio `div` rendering `ro-plant.png` as decorative backdrop above the equipment strip
- [X] T022 [P] [US1] Build `EquipmentSprite` component `services/frontend/components/plant/EquipmentSprite.tsx` — receives `src`, `label`, `unitHealth`, renders image + `StatusBadge` + click/hover event handlers; Tier-2 variant renders a dashed-border placeholder div with icon
- [X] T023 [P] [US1] Create Tier-2 placeholder sprite `services/frontend/components/plant/SpritePlaceholder.tsx` — dashed `#EAEAEA` border, icon slot, label, same `StatusBadge` overlay
- [X] T024 [US1] Compose equipment strip in `PlantScene`: place 4 Tier-1 sprites (ro-membrane-rack, hp-feed-pump, cip-skid, erd) and 4 Tier-2 placeholders in a horizontal flex row beneath `ro-plant.png`
- [X] T025 [US1] Wire `PlantScene` to mock fleet data via `lib/api/fleet.ts` — 21 units rendered, each with correct status from `scoreToStatus()`
- [X] T026 [US1] Apply scroll-entry animation to `PlantScene` and equipment strip — `translateY(10px) + opacity:0` → `600ms cubic-bezier(0.16,1,0.3,1)` via `IntersectionObserver`
- [X] T027 [US1] Add hover lift micro-animation to `EquipmentSprite` — `scale(1.015)` + shadow `0 4px 16px rgba(0,0,0,0.06)` on `:hover`, `200ms ease`
- [X] T028 [US1] Compose `services/frontend/app/twin/page.tsx` — includes `ReplayClock`, `TimelineScrubber` (stubs), `PlantScene`, fleet panel, and chart card section
- [X] T029 [US1] Add ARIA labels to all `EquipmentSprite` instances: `aria-label="Bank F Stage 1 — Alert: fouling score 72"` pattern
- [X] T030 [P] [US1] Build stub `/simulation`, `/industry`, `/cloud-data` pages with correct `NavHeader` chrome and a "Not yet available" `Alert` component (shadcn) — no blank pages

**Checkpoint**: US1 complete — visible fleet scene, 21 units, color-coded, no table.

---

## Phase 4: User Story 2 — Transparent Data-to-Visual Contract (Priority: P1)

**Goal**: The `scoreToStatus()` rule drives color everywhere it appears. Operators can see the score and threshold band behind any color.

**Independent Test**: Take a unit with score 33 — confirm it shows "watch" in the sprite badge, fleet grid, and any alert marker. Hover it and confirm the score and band are visible.

- [X] T031 [US2] Create `FleetGrid` component `services/frontend/components/charts/FleetGrid.tsx` — 7×3 Recharts heatmap (banks A–G × stages 1–3), each cell colored by `scoreToStatus()`, same color tokens as `StatusBadge`
- [X] T032 [P] [US2] Add per-cell tooltip to `FleetGrid` showing unit ID, score, status label, and `scoreSource` (measured / modeled) — no bare color
- [X] T033 [US2] Create `AlertsFeed` component `services/frontend/components/alerts/AlertsFeed.tsx` — `AlertItem[]` list with severity-colored left border (using same status color tokens as everywhere else), unit label, message, and evidence string
- [X] T034 [US2] Build `FleetSummaryPanel` component `services/frontend/components/inspection/FleetSummaryPanel.tsx` — default right-panel view showing: total units in each band (green/amber/red/unknown), bank-by-bank mini grid, and active alert count — no unit selected state (Q2-A)
- [X] T035 [US2] Export `scoreToStatus()` as the single named export from `lib/utils/health.ts` and import it in `StatusBadge`, `FleetGrid`, `AlertsFeed`, and `FleetSummaryPanel` — no inline color logic anywhere else
- [X] T036 [US2] Write unit tests for `scoreToStatus()` in `services/frontend/lib/utils/__tests__/health.test.ts`: boundary values 0, 32, 33, 65, 66, 100, null — all 7 cases

**Checkpoint**: US2 complete — one color rule visible everywhere, score + band traceable from any display.

---

## Phase 5: User Story 3 — Hover Summary + Click Inspection (Priority: P1)

**Goal**: Hovering a unit shows a quick KPI summary. Clicking opens the inspection panel scoped to that unit.

**Independent Test**: Hover 3 different sprites — confirm each shows a summary with that unit's data. Click each — confirm the inspection panel updates without stale content from the previous unit.

- [X] T037 [US3] Build `HoverSummaryCard` component `services/frontend/components/plant/HoverSummaryCard.tsx` — uses shadcn `Tooltip` as trigger wrapper; renders status, `stage3FluxPct` (with `scoreSource` label), `recoveryPct`, `dss`, `lastCipDate`; never shows a bare number without its label
- [X] T038 [US3] Wrap `EquipmentSprite` with `HoverSummaryCard` — tooltip appears on hover, does not navigate away
- [X] T039 [US3] Build `InspectionPanel` component `services/frontend/components/inspection/InspectionPanel.tsx` — right-column layout (≥ 1280px) and shadcn `Sheet` slide-in (< 1280px); receives selected `unitId | null`; shows `FleetSummaryPanel` when `unitId` is null
- [X] T040 [P] [US3] Build `EvidenceFigure` component `services/frontend/components/inspection/EvidenceFigure.tsx` — renders `{ value, unit, label, source, caveat? }` with `source` badge (`"measured" | "modeled" | "not yet validated"`); throws TypeScript error if used without `source` prop
- [X] T041 [US3] Build `UnitDetailSection` `services/frontend/components/inspection/UnitDetailSection.tsx` — uses `EvidenceFigure` for every metric: health score, flux %, recovery %, DSS, last CIP; economics block shows "Not yet validated" if `EconomicsBlock` is null
- [X] T042 [US3] Build `FluxTrendChart` in `services/frontend/components/inspection/FluxTrendChart.tsx` — Recharts `LineChart` with actual vs. baseline lines + CIP event reference lines; inline "modeled baseline" label on the baseline line
- [X] T043 [US3] Wire click handler in `EquipmentSprite` → update selected unit in Zustand store; `InspectionPanel` subscribes — clears and re-renders when `unitId` changes (FR-009)
- [X] T044 [US3] Apply staggered reveal animation to `InspectionPanel` content blocks — `animation-delay: calc(var(--index) * 80ms)` on each section

**Checkpoint**: US3 complete — hover shows summary, click opens scoped panel, switching units clears stale content.

---

## Phase 6: User Story 4 — AI Assistant Panel (Priority: P1)

**Goal**: Clicking a unit reveals the AI Assistant panel pre-scoped to that unit, with full UI shell and backend-compatible message contract.

**Independent Test**: Click Bank F, open assistant — confirm the pre-scope message names "Bank F Stage 1", the input field is functional, and the panel shows the "Connecting to diagnostics backend" state (not blank, not live data).

- [X] T045 [US4] Build `AIAssistantPanel` component `services/frontend/components/assistant/AIAssistantPanel.tsx` — message list (`MessageScroller` pattern from shadcn chat rules), `Input` + `Button` for send, `BackendStatus` banner reading from `NEXT_PUBLIC_AGENT_ENDPOINT`
- [X] T046 [P] [US4] Build `BackendStatus` banner `services/frontend/components/assistant/BackendStatus.tsx` — shows "Connecting to diagnostics backend…" when env var is empty; green "Connected" when endpoint is set; uses `Alert` from shadcn
- [X] T047 [US4] Define message contract type `AgentMessage` in `lib/types/index.ts`: `{ id, role: "user"|"assistant", content, evidence?: string, sourceTrace?: string, timestamp }` — compatible with both Gemini Agent Enterprise Runtime SSE and A2UI streaming shape
- [X] T048 [US4] Implement `useAgentSession` hook `services/frontend/lib/hooks/useAgentSession.ts` — when `NEXT_PUBLIC_AGENT_ENDPOINT` is empty, returns stub responses; when set, opens SSE/fetch stream to the endpoint; pre-populates unit context in the first message
- [X] T049 [US4] Wire unit context into `AIAssistantPanel`: on mount, inject pre-scope system message `"Context: Bank F Stage 1, replay date 2020-06-15, score 72 (alert)"` — user does not have to re-identify the unit (FR-010)
- [X] T050 [US4] Display evidence fields in assistant messages — `evidence` and `sourceTrace` fields render as collapsible `<details>` block below each assistant message; honest non-answers ("I don't know") rendered verbatim, not replaced (FR-011)
- [X] T051 [US4] Add "Ask AI" CTA button to `InspectionPanel` — opens `AIAssistantPanel` in a split view below the unit detail (or second tab on mobile)

**Checkpoint**: US4 complete — AI panel shell works, pre-scoped, backend-compatible, shows evidence or honest non-answers.

---

## Phase 7: User Story 5 — Replay Clock & Timeline Navigation (Priority: P1)

**Goal**: The simulation clock is always visible, always labeled "REPLAY", and scrubbing the timeline updates all scene colors.

**Independent Test**: Load page — clock is visible with "REPLAY" label. Scrub to 2020-06-15 — Bank F turns red. Scrub to 2020-01-15 — Bank F turns green. No element implies "LIVE" at any state.

- [X] T052 [US5] Build `ReplayClock` component `services/frontend/components/timeline/ReplayClock.tsx` — renders current `ReplayState.currentDate` with a prominent "REPLAY" badge (never "LIVE"); uses number morph animation (`200ms fade`) on date change
- [X] T053 [US5] Build `TimelineScrubber` component `services/frontend/components/timeline/TimelineScrubber.tsx` — shadcn `Slider` over OCWD date range 2019-01-01 → 2021-01-13 with step = 1 day; shows formatted date tooltip while dragging
- [X] T054 [US5] Wire `TimelineScrubber` → Zustand `replay-store` `setDate()` → `lib/api/fleet.ts` re-query → `PlantScene` re-render; all 21 units update colors on scrub
- [X] T055 [US5] Add play/pause button to replay bar `services/frontend/components/timeline/ReplayBar.tsx` — composing `ReplayClock` + `TimelineScrubber`; auto-advances date by 1 day/second when playing; always shows "REPLAY" in play state
- [X] T056 [US5] Verify FR-014: audit all text in the UI for "now", "current", "live", "real-time" — replace any instance with "as of [date]" or "replay" phrasing; add comment in each component: `// FR-014: "now" = replay clock, not live feed`
- [X] T057 [P] [US5] Handle edge case FR-019: if `score` is `null` for a unit at a given date, `EquipmentSprite` must show `StatusBadge` with `status: "unknown"` in zinc-400 — never defaults to green

**Checkpoint**: US5 complete — replay clock always "REPLAY", scrubbing updates scene, no live implication anywhere.

---

## Phase 8: User Story 6 — Evidence-First Figures (Priority: P1)

**Goal**: Every quantitative figure on screen carries its evidence. No bare numbers anywhere.

**Independent Test**: Inspect every number visible in the panel — each must have a `source` badge ("measured", "modeled", or "not yet validated"). A bare number with no label is a bug.

- [X] T058 [US6] Audit all number displays in `UnitDetailSection`, `HoverSummaryCard`, and `FleetGrid` — confirm every value uses `EvidenceFigure`; replace any raw `<span>` number with `EvidenceFigure`
- [X] T059 [US6] Build `BreakevenChart` `services/frontend/components/charts/BreakevenChart.tsx` — Recharts `ComposedChart`; shows cumulative energy penalty line vs. CIP cost horizontal line; crossover point labeled; chart footer carries "Modeled — assumptions: [X]" caption using stub `EconomicsBlock.assumptions`
- [X] T060 [P] [US6] Build `ForecastPlaceholder` `services/frontend/components/charts/ForecastPlaceholder.tsx` — renders a greyed-out chart shape with "Production forecast — not yet validated" overlay; satisfies FR-017 without showing a provisional number
- [X] T061 [US6] Implement `EvidenceFigure` "not yet validated" state — when `source === "not-yet-validated"`, renders the label in mid-gray with no numeric value shown (FR-017, FR-018)
- [X] T062 [P] [US6] Add economics caveat banner to `InspectionPanel` — when `EconomicsBlock` is not null, renders "Economic figures are modeled (±20%). Lead with deltas." caption per Principle IV
- [X] T063 [US6] Compose the 3 chart cards in `twin/page.tsx` — `FleetGrid`, `FluxTrendChart` (from US3), `BreakevenChart` — in an expandable card row using shadcn `Card`; each card has a title with its data source noted

**Checkpoint**: US6 complete — every figure has evidence, forecasts are placeholders, economics are labeled.

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Accessibility, responsive layout, many-alerts edge case, final FR compliance sweep, and documentation.

- [X] T064 [P] FR-020 compliance: test `mock-alerts.ts` with 7 simultaneous alert units — confirm `FleetGrid` and `AlertsFeed` keep all units individually legible and inspectable (not collapsed into undifferentiated block)
- [X] T065 [P] Responsive layout: at < 1280px, `InspectionPanel` becomes a shadcn `Sheet`; at ≥ 1280px, it is a fixed right column; test at 768px, 1024px, 1280px, 1440px
- [X] T066 [P] Accessibility audit: all `EquipmentSprite` items have `role="button"`, `aria-label` with unit name and status; `FleetGrid` cells have `aria-label`; focus ring visible on all interactive elements
- [X] T067 Final FR compliance sweep: run through FR-001 → FR-020 with mock data at 3 waypoints — document pass/fail in `specs/008-visual-twin-ui/checklists/fr-compliance.md`
- [X] T068 [P] Update `docs/10-frontend-visual-twin.md` — add note that Tier-1 sprites are now in equipment strip layout (Q1-B), note `NEXT_PUBLIC_AGENT_ENDPOINT` env var for agent connection
- [X] T069 Write `specs/008-visual-twin-ui/quickstart.md` — prerequisites (`node 20+`, `npm install`), `npm run dev`, 3 manual test scenarios (waypoint scrub, hover, click-inspect), expected outcomes for each
- [X] T070 [P] Verify `services/frontend` builds cleanly (`npm run build`) with TypeScript strict — zero type errors before marking feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phases 3–8 (User Stories)**: All depend on Phase 2 completion; can proceed in priority order (P1 stories first) or in parallel if staffed
- **Phase 9 (Polish)**: Depends on all Phase 3–8 tasks complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|---|---|---|
| US1 — Scene | Phase 2 | US2 (after T035) |
| US2 — Contract | Phase 2 + T020 (StatusBadge) | US1, US3 |
| US3 — Hover/Click | Phase 2 + US1 (T024, T025) | US4, US5 |
| US4 — AI Assistant | Phase 2 + US3 (T039, T043) | US5, US6 |
| US5 — Replay | Phase 2 + US1 (T025) | US3, US4 |
| US6 — Evidence | Phase 2 + US3 (T040 EvidenceFigure) | US4, US5 |

### Parallel Opportunities (within phases)

- T003, T004, T005, T006, T007, T010 — all Phase 1, all different files
- T012, T013, T014, T015, T016, T017, T019, T020 — all Phase 2, all different files
- T022, T023 — within US1
- T031, T032 — within US2 (after T035)
- T040, T044 — within US3
- T046, T047 — within US4
- T057 — within US5
- T059, T060, T062 — within US6
- T064, T065, T066, T068, T070 — all Phase 9

---

## Implementation Strategy

### MVP Scope (User Story 1 only — Phase 1 + 2 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (scene, sprites, status badges)
4. **STOP and validate**: `npm run dev`, open `/twin`, confirm all 21 units visible with correct colors
5. Demo-ready: a non-expert can identify alert units without reading numbers

### Full Delivery Order

`Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → US5 → US6 → Phase 9`

Each phase is independently demoable and testable before proceeding.

---

## Task Summary

| Phase | Tasks | Parallelizable | User Story |
|---|---|---|---|
| Phase 1 — Setup | T001–T010 | T003–T007, T010 | — |
| Phase 2 — Foundational | T011–T020 | T012–T017, T019, T020 | — |
| Phase 3 — US1 Scene | T021–T030 | T022, T023, T030 | US1 |
| Phase 4 — US2 Contract | T031–T036 | T031, T032 | US2 |
| Phase 5 — US3 Hover/Click | T037–T044 | T040, T044 | US3 |
| Phase 6 — US4 AI Assistant | T045–T051 | T046, T047 | US4 |
| Phase 7 — US5 Replay | T052–T057 | T057 | US5 |
| Phase 8 — US6 Evidence | T058–T063 | T059, T060, T062 | US6 |
| Phase 9 — Polish | T064–T070 | T064, T065, T066, T068, T070 | — |
| **Total** | **70 tasks** | **27 parallelizable** | 6 stories |

**MVP (US1 only):** Tasks T001–T030 (30 tasks)

---

## Phase 10: Convergence

- [X] T071 Build `AlertsFeed` component per US2 (missing)
- [X] T072 Implement `useAgentSession` hook and `AIAssistantPanel` chat logic per US4 (missing)
- [X] T073 Build `ForecastPlaceholder` component per US6 (missing)
- [X] T074 Extract `FleetSummaryPanel` and `UnitDetailSection` from inline Drawer per US2/US3 (partial)

---

## Phase 11: Convergence

- [X] T075 Fix `scoreToStatus()` inverted logic and status names in `health.ts`
- [X] T076 Restore Tier-2 `SpritePlaceholder` (dashed border) for units like A01, C02, E03 in `plant-scene.tsx`
- [X] T077 Add ARIA labels to `EquipmentSprite`
- [X] T078 Implement unit tests for `scoreToStatus` in `__tests__/health.test.ts` per US2/T036 (missing)

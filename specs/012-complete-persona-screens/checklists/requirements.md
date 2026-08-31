# Specification Quality Checklist: Complete the Operator-Facing Product Surface

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-28
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`

### Validation run 1 (2026-08-28)

**Content Quality — pass.** Requirements name capabilities and outcomes ("the physics capability",
"the data service", "the replay timeline") rather than products or frameworks. No route paths,
component names, endpoint names, or library names appear in the requirements or success criteria.

**Requirement Completeness — 2 open clarifications.** FR-013 (what-if scope) and FR-022 (fourth
destination: build or remove) are both genuine scope forks with materially different effort and
user-facing outcomes, and no defensible default. Both are held for `/speckit.clarify`. All other
requirements were reviewed and are individually testable.

**Scope boundaries — explicitly stated.** Three exclusions are recorded in Assumptions so they
cannot be silently absorbed: deployment, sourcing the assumed energy-price/carbon constants, and
role-differentiated views.

**Constitution alignment — checked against v1.0.0:**

| Principle | Covered by |
|---|---|
| II — Evidence over assertion (HARD GATE) | FR-025, FR-026, FR-027, SC-004, SC-005, SC-006 |
| III — Advise-only, never actuate (HARD GATE) | FR-030, SC-012 |
| IV — Measured vs. modeled, lead with deltas | FR-007, FR-012, FR-025, FR-026 |
| VI — Honest twin maturity | FR-029, SC-009, and the "now = replay clock" assumption |

**Deliberate carry-over:** FR-026 requires labelling figures that rest on assumed constants rather
than fixing the upstream data gap that makes them assumed. That gap is separate work; labelling it
honestly here is the Principle IV-compliant behaviour in the meantime, and the assumption records
it so it is not mistaken for an oversight. *(Renumbered to FR-028 in validation run 2.)*

### Validation run 2 (2026-08-28) — all items pass

Both clarifications resolved; requirements renumbered to absorb two new simulation requirements.

**Q1 → Option A (arbitrary what-if).** FR-013 now requires any combination of supported conditions,
computed on demand and never served from a pre-computed set. Two consequences were made explicit
rather than left implied:

- FR-014 + SC-008 — on-demand solving means a request can take appreciable time, so in-progress
  indication and user cancellation became requirements, not UI polish.
- A new assumption records that User Story 2 depends on the physics capability being reachable. When
  it is not, FR-011 already governs: report unavailable, never approximate.

**Q2 → Option A (build the fourth destination).** FR-023–FR-026 replace the conditional "if
retained" wording with unconditional requirements. User Story 5 is retained at P3.

**Renumbering.** Two inserted simulation requirements shifted everything after FR-013 by one
(final range FR-001–FR-034), and one inserted success criterion shifted the criteria after SC-003
(final range SC-001–SC-014). Safe to do now: no plan.md or tasks.md yet references these numbers.

**Constitution re-check — v1.0.0, unchanged verdict:**

| Principle | Covered by (renumbered) |
|---|---|
| II — Evidence over assertion (HARD GATE) | FR-027, FR-028, FR-029, SC-005, SC-006, SC-007 |
| III — Advise-only, never actuate (HARD GATE) | FR-032, SC-014 |
| IV — Measured vs. modeled, lead with deltas | FR-007, FR-012, FR-027, FR-028 |
| VI — Honest twin maturity | FR-031, SC-011, "now = replay clock" assumption |

Option A on Q1 additionally strengthens Principle V (physics-grounded, fit-for-purpose fidelity):
results are genuinely solved for the requested conditions, so the surface cannot imply a fidelity
the engine did not deliver.

**Status: ready for `/speckit.plan`.** `/speckit.clarify` is not required — both questions were
answered during specification.

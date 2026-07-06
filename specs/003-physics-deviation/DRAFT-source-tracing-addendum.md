# DRAFT — Source-Tracing / Fouling-Mechanism Attribution (addendum proposal)

**Status:** DRAFT for review (Somi) — not yet merged into any spec
**Author:** Somi
**Created:** 2026-07-06
**Depends on:** running literature-evidence collection (citations marked `[EVIDENCE: research]`)

> This is a **proposal** for where and how to add the source-tracing angle. It is intentionally
> placement-agnostic: the same content can land in **005 (extend FR-022)** or **003 (new downstream
> hook)**. See "Placement" at the bottom. Nothing here is committed to a spec yet.

---

## 1. The gap this fills

003 produces a **confound-free deviation** ("*that* performance deviates from a clean-membrane
baseline") and explicitly defers the "*why*" downstream (003 spec, Assumptions: "Deviation is the
health signal, not a diagnosis of cause"). 005 already opens the "why" door for **scaling only**
(005 FR-022). **Source-tracing widens that door to the full fouling taxonomy** and attributes a
deviation to the feed-side mechanism most consistent with the evidence — earlier and more
defensibly than a single-symptom view.

## 2. Fouling mechanism taxonomy (attribution targets)

Standard RO fouling classes we attempt to separate `[EVIDENCE: research — taxonomy source]`:

| Mechanism | Primary feed-side driver (available signal) | Classic performance fingerprint |
|---|---|---|
| **Mineral scaling** (CaCO₃, CaSO₄, silica) | high EC (TDS↑) + high pH + high recovery | normalized ΔP↑, salt passage↑, worse in **last stage** |
| **Particulate / colloidal** | turbidity↑ (SDI proxy) | normalized ΔP↑ **fast**, worse in **first stage** |
| **Biofouling** | low/no chlorine + TOC↑ + warm temp | normalized ΔP↑ gradual, flux↓, often first stage |
| **Organic fouling** | feed TOC↑ (`rof_toc_avg`) | flux↓, normalized ΔP↑ moderate |
| **Oxidative damage** | high chlorine (`cl2_tot`) exposure | salt rejection **drops** (ΔP may *not* rise) — distinguishable |

## 3. Data-honest boundary (reuse 005's contract — non-negotiable)

The OCWD dataset has **temp, EC, pH, turbidity, chlorine, TOC** but **no individual scaling ions**
(Ca, Mg, SO₄, HCO₃, SiO₂, Ba, Sr), **no direct SDI**, **no microbial counts** (005 FR-022, Assumptions).
Therefore:

- **CAN** attribute at **mechanism level** (which of the 5 classes) with labeled confidence.
- **CANNOT** speciate exact scaling compound or give an exact saturation index without an
  **assumed literature feed-chemistry profile** — any such value is labeled **modeled**, never measured.
- Attribution is **corroboration that explains a cause**; it **MUST NOT** reweight or override the
  measured deviation/ranking from 003/005 (evidence-first, Constitution Principle II & IV).

## 4. Proposed requirements (draft FRs)

- **FR-A**: Given a unit's deviation (from 003) plus its concurrent feed-side signals, the feature
  MUST produce a **ranked mechanism attribution** across the taxonomy, each with a confidence label.
- **FR-B**: Every attribution MUST carry evidence: which feed signals + which performance-pattern
  (stage, ΔP vs flux vs salt-passage) supported it. No bare mechanism label.
- **FR-C**: Every attribution MUST be labeled **measured-derived** vs **modeled-assumption-derived**
  (e.g. anything relying on an assumed ion profile is modeled).
- **FR-D**: The feature MUST NOT alter the 003 deviation or the 005 measured ranking; attribution is
  additive explanation only.
- **FR-E**: When signals are insufficient to separate two mechanisms, the feature MUST return them as
  **co-candidates** rather than forcing a single false-confident pick.
- **FR-F**: Attribution method (rule-based fingerprint, saturation-index model, and/or statistical
  source-apportionment such as PMF/PCA `[EVIDENCE: research — method source]`) is an implementation
  concern for `/speckit.plan`, not this spec.

## 5. Success criteria (draft)

- **SC-A**: On the recorded fouling→CIP cycles, attributions are consistent with the known
  operational context where ground truth exists (e.g. CIP chemistry used) `[EVIDENCE: validate against 71 CIP events]`.
- **SC-B**: 100% of attributions carry evidence + measured/modeled labels; zero bare labels.
- **SC-C**: Where data cannot separate mechanisms, output shows co-candidates — zero false-single-cause claims.

## 6. Placement recommendation

**Recommend: extend 005 (fouling-validation) FR-022** from scaling-only to the full taxonomy above,
because 005 already owns mechanism corroboration + the modeled/measured honesty contract + the
ion-absence limitation. 003 stays as the pure deviation engine. Alternative: a new spec
`010-fouling-source-attribution`. **Decision pending Somi + Abdullah confirm.**

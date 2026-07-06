---
name: RO Digital Twin
description: Cloud-native visual digital twin for BWRO facilities
colors:
  primary: "#1465c4"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.145 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  sidebar: "oklch(0.985 0 0)"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 600
  title:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 400
rounded:
  default: "20px"
spacing:
  default: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.default}"
---

# Design System: RO Digital Twin

## 1. Overview

**Creative North Star: "The Industrial Command Center"**

The RO Digital Twin interface is an industrial command center: dense, precise, and utilitarian. It respects the user's intelligence by prioritizing actionable information and data provenance over decorative elements. It explicitly rejects generic SaaS dashboards, overly colorful interfaces, soft drop-shadows, and "AI slop" aesthetics.

**Key Characteristics:**
- High-contrast and utilitarian data visualization
- Consistent 20px corner radii for structured containers
- Strict, evidence-based visual mapping (modeled vs. measured data)
- Minimalist and unopinionated background surfaces

## 2. Colors

A strictly utilitarian palette where color carries operational meaning.

### Primary
- **High-visibility 'Safety Blue'** (#1465C4 / oklch(0.45 0.15 260)): Used exclusively for active states, key data highlights, and primary actions.

### Neutral
- **Background** (oklch(1 0 0)): Pure white surface to ensure maximum contrast for industrial screens.
- **Foreground** (oklch(0.145 0 0)): Deep, high-contrast ink for all primary text.
- **Border** (oklch(0.922 0 0)): Structural containment lines.

### Named Rules
**The Function Over Decoration Rule.** Color is reserved for state changes (nominal, degraded, critical) and data highlights. Never use color merely for decoration.

## 3. Typography

**Display Font:** Manrope (with sans-serif)
**Body Font:** Manrope (with sans-serif)

**Character:** Industrial, legible, and mechanically precise. Avoids soft or overly friendly humanist shapes.

### Hierarchy
- **Display** (700, 2rem+, -0.04em): Top-level dashboard titles.
- **Headline** (600, 1.5rem, normal): Section headers and primary KPIs.
- **Title** (600, 1.25rem, normal): Card titles and widget names.
- **Body** (400, 1rem, 1.5): Data labels, descriptions, and standard text (max 75ch).
- **Label** (500, 0.875rem, 0.05em, uppercase): Utility headers and metadata tags.

## 4. Elevation

Subtle layered depth for modals and active elements only. Most of the interface is flat-by-default to maintain structural rigidity.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus) or z-index hierarchy (modals).

## 5. Components

Tactile and confident with sharp edges and defined borders, bounded by a strict 20px radius.

### Buttons
- **Shape:** Softened rectangle (20px)
- **Primary:** Safety Blue background, white text.
- **Hover / Focus:** Slight opacity shift, no bouncy transitions.

### Cards / Containers
- **Corner Style:** 20px radius
- **Background:** Pure white or distinct functional layer
- **Border:** 1px solid Neutral Border
- **Internal Padding:** 12px-16px to maintain high data density.

## 6. Do's and Don'ts

### Do:
- **Do** use Manrope exclusively for a precise, mechanical feel.
- **Do** maintain a strict 20px `border-radius` on all cards and major structural elements.
- **Do** map colors directly to operational states (e.g., degraded, critical).
- **Do** explicitly mark data provenance (modeled vs. measured).

### Don't:
- **Don't** use generic SaaS dashboards or "AI slop" templates.
- **Don't** use soft drop-shadows or floating elements without structural reason.
- **Don't** use arbitrary corner radii; stick to the 20px system.
- **Don't** use gradient text or decorative CSS grid backgrounds.

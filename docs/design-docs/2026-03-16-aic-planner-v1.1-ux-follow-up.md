# AIC Planner v1.1 UX Follow-Up

## 1. Purpose

This follow-up defines the v1.1 data-contract updates needed to improve planner usability while preserving broad catalog visibility from crawler data.

The primary UX objective is to separate:

- a small set of validated, interactive placeables that can drive reliable planning flows
- a larger set of reference-only records that remain visible for browsing and future curation

## 2. UX Goals

### 2.1 Better Planner Browsing

Users should be able to browse placeables through planner-oriented groupings instead of raw crawl structure alone.

New top-level planner groups:

- `machines`
- `logistics`
- `storage`
- `utilities`

### 2.2 Preserve Source Context

Crawler/source labels remain important for trust and discovery, so placeables can carry:

- `sourceCategoryLabel`
- `sourceSubCategoryLabel`

This allows showing source taxonomy under planner-first groups.

### 2.3 Chinese-First Display Safety

No UI changes are required in this task, but v1.1 continues to require `nameZhHans` as a first-class, required field in schema contracts. This keeps Chinese-first rendering paths stable.

## 3. Data Model Changes

## 3.1 Placeable-Level Fields

`PlaceableItem` now supports:

- `plannerCategory`: `machines | logistics | storage | utilities`
- `sourceCategoryLabel?: string`
- `sourceSubCategoryLabel?: string`
- `availabilityStatus`: `validated | reference-only`
- `placementKind`: `area | linear`
- expanded `subtype`:
  - `machine`
  - `terminal`
  - `storage`
  - `belt`
  - `pipe`
  - `logistics-building`

Legacy `placeableClass` remains supported for backward compatibility.

### 3.2 Port-Level Fields

`PortDefinition` now includes:

- `side`: `north | east | south | west | center`
- `offset: number`
- `mediumKind`: `item | fluid | logistics`
- `maxLinks: number`

Existing fields remain:

- `flow`
- `resourceIds`

## 4. Validated vs Reference-Only Policy

### 4.1 Intent

Use `availabilityStatus` to make interaction readiness explicit:

- `validated`: curated and safe for interactive planner behaviors
- `reference-only`: visible for discovery, but not guaranteed complete for interaction logic

### 4.2 Bundled v1.1 Minimum Validated Set

The bundled dataset must include, at minimum:

- `machine.basic-smelter`
- `terminal.ore-intake`
- `terminal.ingot-output`
- at least one validated belt piece
- at least one validated pipe piece
- one logistics helper piece

All other incomplete crawler-derived placeables stay visible and default to `reference-only`.

## 5. Crawler Normalization Expectations

Skland normalization should preserve source labels and produce stable defaults for incomplete records:

- `availabilityStatus: "reference-only"`
- `placementKind: "area"`
- `footprint: { width: 1, height: 1 }`
- `ports: []`
- `sourceCategoryLabel` and `sourceSubCategoryLabel` copied from discovery data when present

Planner category defaults are derived from subtype with machine-safe fallback.

## 6. Expected UX Outcome

v1.1 presents a cleaner planning experience:

- users can immediately interact with a clearly marked validated starter set
- users can still inspect broader crawler results without losing visibility
- source taxonomy and Chinese-first naming remain intact for trust and localization

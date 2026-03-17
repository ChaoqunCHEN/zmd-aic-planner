# Workspace Shared Layout And Reference Browser State

Date: 2026-03-16

## What we changed

- A single workspace layout helper now drives grid, node shell, ghost, and connection anchor pixel math.
- Placement browser rows now default to Chinese labels (`nameZhHans`) and keep reference-only entries visible but explicitly disabled.
- Node visuals switched from internal IDs to icon-first rendering, with rotation-aware port marker placement and orientation.

## Practical implication

- Ghost/node/edge misalignment regressions are less likely because all canvas coordinates now come from one helper.
- Workspace tests should assert disabled/non-placeable behavior for `reference-only` catalog items rather than filtering those items out.

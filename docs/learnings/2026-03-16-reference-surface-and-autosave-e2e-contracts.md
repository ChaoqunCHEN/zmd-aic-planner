# 2026-03-16 reference surface and autosave E2E contracts

## Context
- V1.1 moved inspector and reference browsing to Chinese-first labels, icon-first cards, and explicit `reference-only` messaging.
- The Playwright persistence test originally reloaded as soon as any autosave blob existed in `localStorage`.

## Learning
- Reference and inspector surfaces now rely on explicit presentation metadata instead of assuming `name` is the primary searchable label. Search should be driven by a combined `searchText` field so English queries still work after switching the visible UI to Chinese-first labels.
- Autosave E2E checks should wait for the saved payload content, not just for the presence of `aic-planner.autosave`. The base autosave key can exist before the latest placement, mode, or cap edits are flushed, which makes reload tests flaky or falsely fail against stale state.

## Practical guidance
- When adding new reference-pane entity types, provide a Chinese-first primary label, English secondary label when useful, and a search string that includes IDs plus both languages.
- When testing autosave or reload behavior, poll parsed storage payload fields such as node count, edge count, selected mode IDs, or external caps before reloading.

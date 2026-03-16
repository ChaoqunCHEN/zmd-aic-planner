# AIC Planner MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` if subagents are available; otherwise use `superpowers:executing-plans`. Track progress with `- [ ]` checkboxes and do not skip TDD, review, or verification gates.

## Execution Status
- Date: 2026-03-15
- Active branch: `codex/aic-planner-mvp`
- Active worktree: `/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp`
- Overall progress:
  - [x] Task 0: Repository bootstrap, tooling, and E2E harness
  - [x] Task 1: Core types and dataset contracts
  - [x] Task 2: Plan document, geometry, and editing operations
  - [x] Task 3: Connections, validation passes, and diagnostics
  - [x] Task 4: Steady-state analysis and codecs
  - [x] Task 5: Planner store, commands, undo/redo, and autosave
  - [x] Task 6: Workbench shell and supporting panels
  - [x] Task 7: Grid workspace, selection, and placement editing
  - [x] Task 8: Connection editing, node configuration, and project flows
  - [x] Task 9: Curated MVP data and encyclopedia quality
  - [ ] Task 10: End-to-end acceptance, performance sanity, and finish
- Current focus: Task 10 end-to-end acceptance, performance sanity, and finish

**Goal:** Build the browser-first Arknights: Endfield AIC Planner MVP in this repo, using curated seed data, local-first persistence, diagnostics, and a desktop-focused grid editor.

**Architecture:** Implement a single Vite/React/TypeScript SPA with a pure TypeScript domain core. Use a custom grid workspace with SVG connection overlays, a thin Zustand application layer, and versioned JSON codecs shared between autosave and file import/export.

**Tech Stack:** `pnpm`, React, TypeScript, Vite, Zustand, Zod, Vitest, Testing Library, Playwright, CSS variables plus CSS modules.

---

## Summary
- Source docs:
  - [PRD](/Users/cc/Dev/github.com/zmd-aic-planner/docs/design-docs/2026-03-15-arknights-endfield-aic-planner-prd.md)
  - [Architecture](/Users/cc/Dev/github.com/zmd-aic-planner/docs/design-docs/2026-03-15-aic-planner-architecture-design.md)
  - [E2E Testing Design](/Users/cc/Dev/github.com/zmd-aic-planner/docs/design-docs/2026-03-15-aic-planner-e2e-testing-design.md)
  - [Data Structures](/Users/cc/Dev/github.com/zmd-aic-planner/docs/design-docs/2026-03-15-placeable-and-related-data-structures.md)
  - [Crawler Guide](/Users/cc/Dev/github.com/zmd-aic-planner/docs/design-docs/2026-03-15-skland-crawler-normalization-guide.md) for future-only reference, not MVP scope
- Planned layout:
  - `src/domain/` for dataset schemas, plan model, geometry, validation, analysis, codecs
  - `src/application/` for store, commands, selectors, autosave, and project IO
  - `src/presentation/` for app shell, workspace, inspector, diagnostics, and reference pane
  - `game-data/` for curated JSON seed data and the dataset manifest
- Public interfaces to lock early:
  - `DatasetBundle`, `PlanDocument`, `PlanNode`, `PlanEdge`, `Diagnostic`, `AnalysisResult`, `ProjectFile`, `ImportResult`
  - catalog types for `PlaceableItem`, `ResourceItem`, `RecipeItem`, `MachineMode`, `SitePreset`, `RuleFragment`, `SiteFixtureType`
  - application commands `createProject`, `placeNode`, `moveNode`, `removeNode`, `connectPorts`, `disconnectEdge`, `setNodeMode`, `setExternalInputCap`, `undo`, `redo`, `importProject`, `exportProject`

## Execution Protocol
1. If `.git` is missing, initialize the repo, make an initial docs-only commit, then create a worktree/branch `codex/aic-planner-mvp` before any feature work.
2. Read this plan once, extract every task into a todo list, and execute serially; do not run multiple implementation subagents that edit the repo at the same time.
3. For each task:
   - dispatch one implementer subagent with only the task text, relevant file paths, and cited design docs
   - require TDD: failing test, verify red, minimal implementation, verify green, refactor
   - after implementer reports `DONE` or `DONE_WITH_CONCERNS`, run spec-compliance review, then code-quality review; loop fixes until both approve
   - make one commit per task with the task number in the message
4. Stop and escalate if a task requires inventing new product behavior not covered by the docs or this plan.
5. After the last task, run full verification, request one final whole-repo review, then use `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch`.
6. run e2e test according to the test runbook (if not create one when setup testing framework). iterate untill al test passed.

## Chunk 1: Foundation
### Task 0: Repository bootstrap, tooling, and E2E harness
**Files:** Create `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `index.html`, `.gitignore`, `README.md`, `src/main.tsx`, `src/app/App.tsx`, `src/styles/tokens.css`, `src/styles/base.css`, `e2e/smoke.spec.ts`, `e2e/fixtures/testApp.ts`, `e2e/fixtures/storage.ts`
- [ ] Write failing smoke tests for app boot, app shell render, production build command wiring, and basic Playwright app-shell readiness.
- [ ] Add the Vite/React/TypeScript scaffold manually at the repo root; do not nest the app under a second directory.
- [ ] Configure scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:watch`, `pnpm test:e2e`, `pnpm test:e2e:smoke`, `pnpm test:e2e:headed`, `pnpm lint`, `pnpm typecheck`.
- [ ] Set up the baseline Playwright framework now, including browser config, local server startup contract, storage reset helper, canonical artifact directories, and one smoke spec that proves the app boots to the shell and shows the unofficial label.
- [ ] Implement a minimal app shell with a title, unofficial label, and empty workbench frame.
- [ ] Document the worker-facing E2E commands and artifact locations in `README.md` so later tasks extend the same harness instead of redefining it.
- [ ] Verify `pnpm test`, `pnpm test:e2e:smoke`, `pnpm build`, and `pnpm typecheck`, then commit `chore(task-0): bootstrap planner app and e2e harness`.

### Task 1: Core types and dataset contracts
**Files:** Create `src/domain/types.ts`, `src/domain/dataset/schemas.ts`, `src/domain/dataset/loadDataset.ts`, `src/domain/dataset/validateDataset.ts`, `src/domain/dataset/__tests__/*`, `game-data/dataset-manifest.json`, `game-data/placeable-items.json`, `game-data/resources.json`, `game-data/recipes.json`, `game-data/machine-modes.json`, `game-data/site-presets.json`, `game-data/site-fixtures.json`, `game-data/rule-fragments.json`
- [ ] Write failing domain tests for schema parsing, id/reference integrity, and preservation of `sourceConfidence`.
- [ ] Implement Zod schemas and exported TypeScript types for the dataset bundle and all top-level catalog records.
- [ ] Add a minimal curated dataset that includes one site preset, one production chain, one alternative machine mode, and one external input cap rule.
- [ ] Implement a dataset loader that returns immutable normalized data and human-readable validation errors.
- [ ] Verify dataset tests pass, then commit `feat(task-1): add dataset contracts and loader`.

## Chunk 2: Domain Core
### Task 2: Plan document, geometry, and editing operations
**Files:** Create `src/domain/plan/document.ts`, `src/domain/plan/geometry.ts`, `src/domain/plan/operations.ts`, `src/domain/plan/__tests__/*`
- [ ] Write failing tests for `createPlan`, `placeNode`, `moveNode`, `removeNode`, rotation handling, blocked zones, and footprint collisions.
- [ ] Implement immutable plan helpers around `PlanDocument`, `PlanNode`, and `PlanEdge`.
- [ ] Keep source of truth layout-first: store only plan state, never derived diagnostics or throughput.
- [ ] Verify plan-operation tests pass, then commit `feat(task-2): add plan document operations`.

### Task 3: Connections, validation passes, and diagnostics
**Files:** Create `src/domain/validation/datasetValidation.ts`, `src/domain/validation/siteValidation.ts`, `src/domain/validation/placementValidation.ts`, `src/domain/validation/connectionValidation.ts`, `src/domain/validation/modeValidation.ts`, `src/domain/validation/capValidation.ts`, `src/domain/diagnostics/types.ts`, `src/domain/diagnostics/buildDiagnostics.ts`, `src/domain/validation/__tests__/*`
- [ ] Write failing tests for valid vs invalid port links, disconnected inputs and outputs, blocked outputs, missing mode requirements, and exceeded input caps.
- [ ] Implement the validation pipeline as discrete passes that emit stable diagnostic codes and plain-language messages.
- [ ] Ensure diagnostics can target project, site, node, edge, or port scope.
- [ ] Verify validation tests pass, then commit `feat(task-3): add validation and diagnostics`.

### Task 4: Steady-state analysis and codecs
**Files:** Create `src/domain/analysis/buildGraph.ts`, `src/domain/analysis/runAnalysis.ts`, `src/domain/analysis/__tests__/*`, `src/domain/codecs/projectFileCodec.ts`, `src/domain/codecs/browserStorageCodec.ts`, `src/domain/codecs/__tests__/*`
- [ ] Write failing tests for throughput propagation on known graphs, bottleneck detection, export/import round trips, dataset mismatch warnings, and tolerance of unknown optional fields.
- [ ] Implement deterministic steady-state analysis with no tick simulation and no saved derived state.
- [ ] Implement versioned JSON project file export/import plus browser-storage serialization using the same canonical payload.
- [ ] Verify analysis and codec tests pass, then commit `feat(task-4): add analysis and project codecs`.

## Chunk 3: Application Layer
### Task 5: Planner store, commands, undo/redo, and autosave
**Files:** Create `src/application/store/plannerStore.ts`, `src/application/store/selectors.ts`, `src/application/commands/plannerCommands.ts`, `src/application/autosave/autosaveController.ts`, `src/application/project/projectIO.ts`, `src/application/__tests__/*`
- [ ] Write failing tests for command orchestration, undo/redo, debounced autosave, import warnings, and selector synchronization between selection, diagnostics, and encyclopedia context.
- [ ] Implement a thin Zustand store that owns current dataset, current plan, selection state, analysis result, recent projects, and command/status metadata.
- [ ] Expose only command APIs from the application layer; React components must not call domain internals directly.
- [ ] Verify application tests pass, then commit `feat(task-5): add planner store and autosave`.

## Chunk 4: Presentation Layer
### Task 6: Workbench shell and supporting panels
**Files:** Create `src/presentation/layout/AppShell.tsx`, `src/presentation/layout/WorkbenchLayout.tsx`, `src/presentation/project/ProjectToolbar.tsx`, `src/presentation/reference/ReferencePane.tsx`, `src/presentation/inspector/SelectionInspector.tsx`, `src/presentation/diagnostics/DiagnosticsPanel.tsx`, matching CSS modules, and component tests
- [ ] Write failing component tests for split-pane layout, project toolbar actions, diagnostics rendering, encyclopedia search, and context-aware inspector updates.
- [ ] Implement the desktop-first shell with three persistent regions: planner workspace, inspector and diagnostics, and reference pane.
- [ ] Add unofficial-product labeling and seed-data onboarding copy in the shell, not as a future placeholder.
- [ ] Verify component tests pass, then commit `feat(task-6): add workbench shell`.

### Task 7: Grid workspace, selection, and placement editing
**Files:** Create `src/presentation/workspace/PlannerWorkspace.tsx`, `src/presentation/workspace/GridLayer.tsx`, `src/presentation/workspace/NodeLayer.tsx`, `src/presentation/workspace/PlacementGhost.tsx`, `src/presentation/workspace/ConnectionLayer.tsx`, `src/presentation/workspace/usePlannerHotkeys.ts`, workspace tests, and CSS modules
- [ ] Write failing component and e2e tests for placing from the catalog, selecting, moving, deleting, rotating, and snapping objects on the site grid.
- [ ] Implement a custom grid workspace using DOM and CSS for the grid and node footprints, with an SVG overlay for directed connections and diagnostic highlights.
- [ ] Surface footprint conflicts, blocked cells, and connection states visually without duplicating domain logic in React.
- [ ] Verify workspace tests pass, then commit `feat(task-7): add planner workspace editing`.

### Task 8: Connection editing, node configuration, and project flows
**Files:** Modify workspace components and create `src/presentation/project/NewProjectDialog.tsx`, `src/presentation/project/ImportExportControls.tsx`, `src/presentation/project/RecentProjectsPanel.tsx`, `src/presentation/inspector/InputCapEditor.tsx`, related tests
- [ ] Write failing tests for drawing and removing connections, changing machine modes, editing external input caps, creating new projects from site presets, importing files, exporting files, and reopening recent projects.
- [ ] Implement connection authoring UX, mode selection UX, project creation and import/export dialogs, and recent-project restoration flows.
- [ ] Ensure warnings for unsupported dataset references or partial imports are visible and non-blocking when recovery is possible.
- [ ] Verify tests pass, then commit `feat(task-8): add project flows and configuration UX`.

## Chunk 5: Seed Data, QA, and Delivery
### Task 9: Curated MVP data and encyclopedia quality
**Files:** Expand `game-data/*.json`, adjust `src/presentation/reference/*`, add `src/domain/dataset/__tests__/seedData.test.ts`
- [ ] Write failing dataset and encyclopedia tests that require one complete production line, one alternative mode path, one invalid-connection example, and one site-cap warning scenario to be representable by the shipped data.
- [ ] Expand the curated dataset until every acceptance scenario below can run against real bundled data.
- [ ] Tighten encyclopedia presentation so selected nodes surface recipe, mode, and provenance details directly from the shipped dataset.
- [ ] Verify dataset and UI tests pass, then commit `feat(task-9): expand curated seed data`.

### Task 10: End-to-end acceptance, performance sanity, and finish
**Files:** Expand `e2e/` with `planner-workflow`, `diagnostics-analysis`, `persistence-codec`, and `reference-inspector` specs, update `README.md`, add `docs/superpowers/plans/2026-03-15-aic-planner-mvp.md` if the execution session wants the plan persisted
- [ ] Write failing end-to-end tests for: new project from preset, place and edit machines, create connections, view diagnostics, set input caps, autosave and reopen, export, and import round trip.
- [ ] Extend the Task 0 Playwright harness instead of replacing it: preserve the startup contract, selector conventions, storage reset path, and artifact locations defined in the E2E design doc.
- [ ] Implement only the missing behavior needed to make the e2e suites pass; do not introduce crawler, backend, auth, mobile, or blueprint-sharing work.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
- [ ] Dispatch a final full-repo review subagent, fix all important findings, then use `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch`.

## Test Plan
- Unit: dataset parsing, geometry, plan ops, validation passes, analysis helpers, and codecs.
- Integration: planner store commands, autosave, import/export warning handling, and selector-driven UI sync.
- Component: workbench layout, reference browsing, diagnostics panel, inspector forms, and workspace interactions.
- End-to-end:
  - create project from bundled site preset
  - place a valid chain and see no blocking errors
  - add an invalid placement and see an error overlay
  - connect incompatible ports and receive a diagnostic
  - switch a machine mode and see analysis and encyclopedia update
  - exceed an external input cap and receive a project-level warning
  - export then import without losing node positions, modes, or edges
  - close and reopen and recover the autosaved project

## Assumptions and Defaults
- Use `pnpm` as the package manager and a single-app repo rooted at `/Users/cc/Dev/github.com/zmd-aic-planner`.
- Treat the current docs as approved product and design input; do not redesign core behavior during execution unless a blocker is found.
- Use a curated seed dataset for MVP completion; crawler and data-refresh work stay out of this plan.
- Use a custom grid workspace with SVG overlays, not React Flow or a heavier canvas engine.
- Keep execution serial at the implementation-task level, with subagents used for isolated task execution and mandatory review loops rather than parallel repo mutations.

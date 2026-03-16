# AIC Planner E2E Testing Design

## 1. Purpose

This document defines the end-to-end testing design for the Arknights: Endfield AIC Planner MVP.

Its purpose is not only to describe which browser tests the product should have, but also to define how worker agents should verify implementation work autonomously without relying on a human to click through the UI.

The design establishes:

- `Playwright` as the authoritative end-to-end verification mechanism
- the app-facing contracts needed to make autonomous verification reliable
- the test-suite structure required to cover MVP behavior
- the evidence and reporting rules a worker agent must follow before claiming work is complete
- the limited role of browser-capable agents in debugging failed cases

This design is intentionally aligned with the browser-first local MVP defined in the PRD and architecture docs. It should help the project avoid a common failure mode where tests exist, but worker agents still need a human to visually confirm whether the app "looks right."

## 2. Design Goals

The end-to-end testing design should make the following easy and reliable:

- verifying real user flows without manual UI inspection
- proving that changes are correct using machine-readable evidence
- rerunning the same flows deterministically across repeated worker sessions
- debugging failures with strong artifacts such as traces, screenshots, and downloaded files
- expressing planner behavior through stable selectors and explicit readiness signals
- verifying persistence and import/export behavior through data assertions rather than visual guesses

The design should avoid:

- depending on a human to approve normal UI behavior
- treating ad hoc browser walkthroughs as authoritative verification
- relying on unstable DOM structure or styling details for primary assertions
- tests that guess at timing with arbitrary waits
- worker-specific boot logic that changes from task to task

## 3. Verification Policy

### 3.1 Source of Truth

`Playwright` should be the only authoritative end-to-end verification mechanism for normal worker execution.

A task that changes user-facing behavior is not considered verified unless the relevant Playwright tests pass in a fresh run with expected exit codes and artifacts.

This rule exists because worker agents need one unambiguous answer to the question "Is the app verified?" If both scripted tests and freeform browser exploration are treated as equal proof, workers can rationalize away failures or inconsistent behavior.

### 3.2 Role of Browser-Capable Agents

Browser-capable agents may still be useful, but only as secondary tools for diagnosis.

They should be used for:

- inspecting why a failing Playwright step is happening
- checking layout or interaction details that are hard to infer from logs alone
- reproducing an unexpected visual state before returning to scripted verification

They should not be used for:

- replacing Playwright as final proof
- declaring that a task is complete because "the app looks correct"
- bypassing failing automated assertions

Important rule: if a browser-capable agent session is used during debugging, the worker must return to Playwright and obtain a passing scripted run before closing the task.

### 3.3 Manual Verification Policy

Normal implementation work should not require human manual verification.

Human review can still be useful for product judgment, but it is not part of the default verification gate for worker agents. The testing design should therefore prefer assertions that are explicit, repeatable, and machine-verifiable.

## 4. High-Level Testing Model

The MVP should use a layered testing model:

1. unit and integration tests validate domain, application, and codec behavior
2. component tests validate major view composition and local UI behavior
3. Playwright validates complete user workflows and cross-layer integration

End-to-end tests should focus on the smallest number of workflows that prove the planner behaves correctly as a product:

- app boot and workbench readiness
- project creation
- planner editing
- diagnostics and analysis feedback
- encyclopedia and inspector synchronization
- autosave recovery
- export and import round trips

The goal is not to duplicate every lower-level assertion at the browser layer. The goal is to verify that the assembled app behaves correctly from a real user perspective and that workers have reliable proof when it does.

## 5. Required App Contracts

Autonomous verification will only be reliable if the app exposes a small set of explicit test contracts.

### 5.1 Stable Test Selectors

The app should expose stable `data-testid` attributes for major product surfaces and critical actions.

These selectors should be treated as part of the app's internal testing contract, not as disposable implementation details.

Recommended naming style:

- top-level areas:
  - `app-shell`
  - `project-toolbar`
  - `planner-workspace`
  - `selection-inspector`
  - `diagnostics-panel`
  - `reference-pane`
- workspace items:
  - `site-grid`
  - `catalog-item:<id>`
  - `plan-node:<id>`
  - `plan-edge:<id>`
  - `port:<nodeId>:<portId>`
  - `placement-ghost`
- project actions:
  - `new-project-button`
  - `site-preset-select`
  - `export-project-button`
  - `import-project-input`
  - `recent-projects-list`
- diagnostics and inspector:
  - `diagnostic-item:<code>`
  - `node-mode-select`
  - `input-cap-editor`
  - `reference-search-input`

The exact selector catalog may expand, but the naming scheme should remain predictable and domain-oriented.

### 5.2 Explicit Readiness Signals

Tests should wait on explicit readiness conditions, never on arbitrary delays.

The app should expose readiness through observable UI state such as:

- the app shell mounted and visible
- the dataset loaded
- the initial site or project state ready
- autosave restore finished
- import processing finished
- diagnostics recomputation finished

These conditions can be expressed through:

- specific visible test IDs
- status text with stable semantics
- disabled/enabled button transitions
- deterministic DOM markers such as `data-state="ready"`

No test should depend on `waitForTimeout` as its primary synchronization strategy.

### 5.3 Deterministic Seed Data

The app should ship with deterministic bundled data used by all end-to-end tests.

The canonical E2E seed should include:

- one site preset with a clear buildable zone and at least one blocked zone
- one minimal valid production chain
- one machine with at least one alternative operating mode
- one rule that can trigger an input-cap warning
- at least one connection incompatibility that can be exercised deterministically

The E2E suite should not depend on a live crawler, remote API, or mutable external content.

### 5.4 Test Project Bootstrap

The app should support a test-only bootstrap path for creating a known project state quickly and repeatably.

This can be implemented through a small set of permitted mechanisms such as:

- deterministic UI flows that are fast enough for routine runs
- a test harness route or query flag that seeds known browser storage
- a fixture import path that loads a canonical project file

The implementation choice may vary, but the behavior must be deterministic and documented. Workers should not invent custom setup flows for each task.

### 5.5 Persistence and File Assertions

Autosave, export, and import should be verified through machine-readable assertions, not through a human looking at the screen and deciding it feels correct.

Examples of acceptable proof:

- browser storage contains the expected saved project key
- a downloaded export file exists and parses correctly
- an imported project restores expected nodes, edges, mode selections, and site configuration

## 6. Worker Execution Contract

### 6.1 Standard App Startup

Worker agents should use one documented app startup contract for E2E verification.

That contract should define:

- the command to start the app locally
- the base URL Playwright will target
- the readiness condition that proves the app is reachable
- how browser storage is reset before clean runs
- whether the server is reused across tests or started per run

Workers should not improvise with custom startup commands unless the standard contract is broken and they are explicitly debugging the failure.

### 6.2 Standard Test Commands

The project should standardize a small set of worker-facing commands:

- `pnpm test:e2e` for the full end-to-end suite
- a filtered smoke command for targeted boot verification
- a filtered spec command for task-scoped reruns
- a headed debug command for local investigation
- a trace-view command for failed runs

The exact script names should be defined in implementation, but the design must require that these commands be stable and documented in the repo.

### 6.3 Smallest Relevant Scope First

Workers should begin with the smallest relevant Playwright scope that exercises the changed behavior.

Examples:

- a toolbar-only change should begin with smoke or project-flow coverage
- a workspace interaction change should begin with planner workflow coverage
- an import/export change should begin with persistence and codec coverage

Before closing a task that affects user-facing behavior, the worker should then run the broader suite needed to prove no key workflow regressed.

### 6.4 Blocking Policy

Any failing Playwright assertion should be treated as a blocker until resolved or explicitly reclassified by the human.

Workers should not bypass failures by saying:

- the failure is flaky without evidence
- the UI looked correct in a separate browser walkthrough
- the underlying code change is obviously right

Evidence, not narrative confidence, should decide task readiness.

## 7. Suite Structure

The end-to-end suite should be organized around behavior, not implementation layers.

### 7.1 `smoke`

Purpose:

- confirm the app boots
- confirm the workbench renders
- confirm the unofficial label is present
- confirm dataset loading and initial readiness complete

This suite should be fast and should act as the first check after any broad UI or startup change.

### 7.2 `planner-workflow`

Purpose:

- create a project from the canonical site preset
- place a machine from the reference or catalog surface
- select and inspect a node
- move and rotate a node
- connect compatible nodes
- remove or adjust planner elements

This suite proves the planner can function as a real editing workspace.

### 7.3 `diagnostics-analysis`

Purpose:

- trigger invalid placement
- trigger incompatible connection attempts
- trigger disconnected or blocked flow cases where supported
- change machine mode and verify downstream analysis changes
- exceed an external input cap and surface the correct warning

This suite should emphasize domain correctness as exposed through the UI.

### 7.4 `persistence-codec`

Purpose:

- verify autosave occurs
- reload and restore the same project
- export a project file
- import that file back into the app
- confirm round-trip fidelity for nodes, edges, modes, and site configuration

This suite proves the app can be left, reopened, and shared without losing plan integrity.

### 7.5 `reference-inspector`

Purpose:

- verify planner selection updates inspector content
- verify reference pane can search and display canonical data
- verify mode, recipe, and provenance details are surfaced consistently
- verify selection changes keep the inspector and reference context synchronized

This suite proves the split workbench behaves as one coherent product.

## 8. Canonical Scenarios

The autonomous verification design should require the following scenarios to be represented in the suite:

1. the app boots to the desktop workbench and shows the unofficial label
2. a new project can be created from the bundled site preset
3. a valid machine chain can be placed, moved, rotated, and connected on the grid
4. invalid placement produces a deterministic diagnostic and visible blocked or error state
5. incompatible connections are rejected with machine-readable diagnostics
6. changing a machine mode updates inspector content, reference content, and analysis state
7. exceeding an external input cap surfaces a project-level warning
8. autosave restores the project after reload without layout loss
9. export then import preserves nodes, edges, modes, and site configuration
10. reference and inspector surfaces stay synchronized with current selection

The design should also require failure-mode coverage for:

- corrupted or unsupported import payloads that should warn rather than silently succeed
- missing dataset references that should surface recoverable warnings where possible
- readiness timing that must rely on explicit signals rather than fixed sleeps

## 9. Artifacts and Evidence

### 9.1 Required Failure Artifacts

When a Playwright test fails, the worker should collect enough evidence that another agent can debug the issue without rerunning the whole session immediately.

Required artifacts should include:

- failing spec name
- failing test step or assertion
- Playwright trace
- screenshot at failure
- video when configured for failure runs
- downloaded export file if the failure involves import/export
- relevant console or network logs if captured by the harness

### 9.2 Standard Artifact Locations

The implementation should standardize artifact output locations so workers can cite them directly in reports.

At minimum, the project should have predictable locations for:

- Playwright traces
- screenshots
- videos
- downloaded fixture or export files

Workers should reference these paths directly rather than saying artifacts exist "somewhere in the output."

### 9.3 Completion Evidence

A worker should only claim a task is end-to-end verified after providing evidence such as:

- commands run
- exit status
- which suite or spec passed
- which acceptance scenarios those runs covered

The goal is to make the worker's completion statement auditable.

## 10. Failure Triage Workflow

When a Playwright run fails, the worker should use a consistent triage flow:

1. identify the failing spec and exact assertion
2. inspect the trace and screenshot first
3. determine whether the failure is:
   - product behavior regression
   - selector/readiness contract break
   - test fixture problem
   - startup/environment problem
4. rerun the narrowest relevant spec to confirm reproducibility
5. if the cause is still unclear, use a browser-capable agent session to inspect the failing state
6. return to Playwright and obtain a passing run before claiming resolution

This workflow keeps debugging exploratory but keeps verification authoritative.

## 11. Worker Reporting Format

Workers should use a standard reporting shape so results are easy to review.

### 11.1 Failure Report

A failure report should include:

- failing suite and spec
- failing assertion or step
- artifact paths
- likely cause
- next debugging action

Example shape:

```text
E2E failure
- Spec: diagnostics-analysis > rejects incompatible pipe-to-belt connection
- Step: expected diagnostic-item:invalid-connection to be visible
- Artifacts:
  - trace: <path>
  - screenshot: <path>
  - video: <path>
- Likely cause: diagnostic panel did not refresh after rejected edge creation
- Next action: inspect selector readiness and analysis recompute trigger
```

### 11.2 Completion Report

A completion report should include:

- commands run
- suites or specs passed
- acceptance scenarios covered
- any remaining unverified areas, if applicable

Example shape:

```text
E2E verification complete
- Commands:
  - pnpm test:e2e --grep smoke
  - pnpm test:e2e --grep planner-workflow
- Passed:
  - smoke
  - planner-workflow
- Covered scenarios:
  - app boot
  - project creation
  - node placement, movement, rotation, and connection
```

## 12. Implementation Guidance

The product implementation should be shaped so that the E2E design is practical rather than aspirational.

Recommended implementation choices:

- add stable test IDs alongside major UI work, not as a cleanup task at the end
- keep seed data deterministic and versioned with the app
- expose project-ready and analysis-ready states explicitly
- avoid hidden state transitions that only a human can infer
- keep import and export formats machine-readable and assertable
- ensure browser storage keys are documented and resettable for test runs

The app should not require test code to reverse-engineer the UI.

## 13. Non-Goals

This design does not require:

- replacing unit, integration, or component tests with E2E coverage
- visual snapshot testing as the primary source of truth
- live crawler verification
- backend contract testing for a server-backed workflow
- human signoff for ordinary implementation changes
- unrestricted browser-agent exploration as part of the normal success path

## 14. Final Recommendation

The AIC Planner MVP should adopt a Playwright-first autonomous verification model with explicit test selectors, deterministic bundled data, documented startup commands, and strict evidence requirements for worker agents.

Browser-capable agents should remain available, but only as debugging tools that help explain failures before the worker returns to Playwright for final proof.

This approach gives the project:

- a single authoritative end-to-end verification mechanism
- lower ambiguity for worker agents
- faster debugging through better artifacts
- less dependence on human manual verification
- stronger confidence that shipped behavior matches user-visible product requirements

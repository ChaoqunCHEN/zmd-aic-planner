# Arknights: Endfield AIC Planner PRD

## 1. Product Summary

The Arknights: Endfield AIC Planner is a desktop-first web app that helps players design and validate AIC factory layouts outside the game. Its purpose is to make factory planning faster, clearer, and easier to iterate than the in-game 3D building interface.

The app will let players choose a real factory site preset, place machines on a constrained grid, configure machine modes, connect production lines, inspect throughput and bottlenecks, and save or share plans through app-native import/export.

The MVP is designed for regular players first. It should feel powerful, but not spreadsheet-heavy or intimidating.

## 2. Problem Statement

Players currently face three major problems when planning AIC factories:

1. The in-game construction interface is not ideal for fast experimentation.
2. Factory space and site constraints make layout decisions hard to reason about.
3. It is difficult to test alternatives and understand inefficiencies without repeated manual trial and error.

The planner should solve these problems by giving players a clear, fast, high-fidelity planning environment.

## 3. Goals

The MVP should enable players to:

- Plan realistic AIC factory layouts using real site constraints
- Build multiple independent production lines within the same site
- Configure machine modes exactly where verified by game data
- Understand layout health through clear diagnostics
- Save, reopen, export, and import plans reliably
- Iterate much faster than they can in the game client

## 4. Target Audience

### Primary Audience

Regular Arknights: Endfield players who want an easier way to prototype and refine factory layouts.

### Secondary Audience

More advanced players who want trustworthy diagnostics, detailed layout control, and accurate production behavior.

The MVP should prioritize usability and clarity over deep optimization depth.

## 5. Platform and Scope

### MVP Platform

- Desktop-first web app
- Designed for Mac and Windows browser use

### Out of Scope for MVP

- Mobile or tablet editing
- Cloud sync
- User accounts
- Multiplayer collaboration
- Automatic layout optimization
- Official blueprint or game-native format compatibility
- Non-AIC gameplay systems
- Dependence on a live crawler to use the product

## 6. Product Principles

- High fidelity where data is verified
- Faster iteration than the in-game builder
- Clear diagnostics over hidden rules
- Local-first usage with low onboarding friction
- Purpose-built for Endfield, but clearly unofficial
- Freeform planning first, not goal-forcing

## 7. Core User Experience

A typical user flow should look like this:

1. Open the planner
2. Create a new project
3. Choose a predefined AIC site preset
4. Review site limits and constraints
5. Browse machines, recipes, materials, and machine modes
6. Place machines and logistics components onto the grid
7. Connect flows between components
8. Configure machine modes and project-level input limits
9. Review throughput, bottlenecks, and warnings
10. Leave the project in browser storage or export it to a file

## 8. Functional Requirements

### 8.1 Project Creation and Persistence

The app must allow users to:

- Create a new project from a predefined site preset
- Reopen locally saved projects
- Autosave project state in browser storage
- Export a project as an app-native file
- Import that file back into the planner

The import/export format must be versioned from the start.

### 8.2 Site Presets

The app must support multiple predefined factory site presets that map to real in-game AIC sites.

Each preset should contain verified metadata such as:

- Grid dimensions
- Buildable zones
- Blocked zones
- Site-specific placement constraints
- Other verified site-level rules relevant to planning

The MVP should aim to cover all publicly verified AIC site presets available at launch.

### 8.3 Planner Workspace

The app should use a split workbench layout with:

- A planner canvas
- A built-in encyclopedia/reference pane

The planner canvas must support:

- Grid-based placement
- Fast move, remove, and edit actions
- Clear object footprint visibility
- Collision handling
- Multiple independent production lines in one site
- Easy object inspection
- Visual connection editing between compatible nodes

The editing model should feel like a richer node-editor-style planner, while still respecting the game's constrained site layout.

### 8.4 Machines and Machine Modes

The planner must support machine operating modes as first-class behavior.

Requirements:

- All verified machine modes should be supported in MVP
- A placed machine must store its active mode
- Mode selection may change inputs, outputs, throughput, or validation behavior
- Canvas diagnostics and plan summaries must reflect the active mode
- The reference pane must clearly expose mode-specific data

### 8.5 Connections and Flow Modeling

Users must be able to create visible directional connections between compatible components.

The planner should support:

- Creating connections
- Inspecting connections
- Rerouting or deleting connections
- Detecting invalid links
- Detecting disconnected ports
- Identifying blocked outputs
- Identifying missing upstream inputs

Flow direction and broken states should be visually obvious.

### 8.6 Diagnostics and Validation

The app should provide continuous feedback while the user edits a layout.

MVP diagnostics should include:

- Invalid placement
- Footprint conflicts
- Invalid connections
- Disconnected inputs or outputs
- Missing required inputs
- Blocked outputs
- Bottlenecks
- Exceeded site-level input caps
- Other verified rule violations

Diagnostics should be understandable to regular players and should explain issues plainly.

### 8.7 Site-Level External Input Caps

The app must allow users to define available external inputs or throughput caps for a project.

The planner should:

- Let users set input caps manually
- Use those caps in plan validation
- Warn when the plan exceeds configured limits

### 8.8 In-App Encyclopedia

The reference pane should provide searchable access to:

- Materials
- Recipes
- Machine types
- Machine modes
- Site rules
- Site metadata

It should be context-aware when possible. Selecting an object in the planner should surface the relevant reference details.

## 9. Data Strategy

The MVP should ship with a curated local dataset rather than depending on live scraping.

The launch dataset should include all verified AIC content needed for planning:

- Site presets
- Materials
- Recipes
- Machine types
- Machine modes
- Relevant planning constraints

The architecture should be ready for a later data-refresh pipeline, but the core product must not depend on it.

If public data is incomplete or disputed, the product should surface uncertainty rather than present false precision.

## 10. UX and Visual Direction

The planner should feel closely aligned with Arknights: Endfield, while remaining clearly unofficial.

Visual direction:

- Use an industrial sci-fi UI language inspired by the official Endfield presentation
- Use the same general accent family as the official game website
- Introduce enough distinction in panel styling, layout rhythm, icon treatment, and secondary color usage to clearly separate the planner from official product surfaces
- Include explicit unofficial labeling in the app shell, About page, or equivalent product surfaces

Interaction direction:

- The canvas should feel more like a rich node-editor-style workspace than a basic tile painter
- It should still remain constrained by real site geometry and placement rules
- Common tasks should feel fast, direct, and low-friction

## 11. Non-Goals

The MVP does not include:

- Official blueprint compatibility
- Automatic optimization or "best layout" generation
- AI planning assistance
- Collaboration features
- Cloud-backed accounts or sync
- Mobile editing
- Support for non-AIC systems outside the planner's domain

## 12. Success Criteria

The MVP is successful if:

- A player can prototype a realistic AIC site faster than comfortably doing so in-game
- A player can build and compare multiple production lines inside one site
- A player can understand invalid or inefficient layouts directly from planner diagnostics
- A player can reliably reopen local projects after leaving the app
- A player can export and re-import a project without losing layout fidelity
- A player can trust machine mode behavior where the underlying data is verified

## 13. Risks and Guardrails

### Data Volatility

Public game data may change after patches or new discoveries.

Mitigation:

- Keep internal data versioned
- Track source confidence
- Make uncertain or partially verified rules visible in the UI

### Complexity Risk

A powerful planner can become overwhelming.

Mitigation:

- Keep the default workflow simple
- Use progressive disclosure for advanced details
- Prefer plain-language diagnostics over dense technical output

### Brand Confusion

A strong visual tie to Endfield could make the app appear official.

Mitigation:

- Label the app clearly as unofficial
- Avoid copying the official design system too literally
- Use adjacent styling, not visual cloning

## 14. V2 Direction

V2 should focus on smarter planning and AI-assisted guidance once the MVP planner is stable and trusted.

Potential V2 themes:

- Goal-based planning for target outputs
- Smarter diagnostics that explain tradeoffs, not just failures
- Suggested improvements for bottlenecks or layout inefficiencies
- AI-assisted planning help, such as:
  - Explaining why a design underperforms
  - Suggesting next edits
  - Comparing two layouts
  - Helping translate player goals into draft layouts
- Richer sharing workflows
- Research into blueprint-compatible formats
- Automated data refresh pipelines from vetted public sources

To prepare for V2, the MVP should:

- Keep the data model extensible
- Keep import/export versioned
- Preserve room for recommendation metadata and source-confidence metadata

## 15. Source Anchors

This PRD is grounded in current public sources and community evidence:

- Official Endfield site: https://endfield.gryphline.com/en-us
- Official AIC-related preview dated January 17, 2026: https://www.endfield.gryphline.com/en-US/news/4
- Public guide describing six AIC factory locations as of January 30, 2026: https://game8.co/games/Arknights-Endfield/archives/506758
- Community ecosystem examples:
  - https://endfieldplanner.com/
  - https://www.endfieldcalculator.com/
  - https://www.reddit.com/r/Endfield/comments/1qh84v6/create_plan_and_share_your_factory_factory_aic/

## 16. Recommended Follow-On Docs

After this PRD, the next documents should be:

- Information architecture and screen map
- Data schema for sites, machines, modes, recipes, and project files
- Simulation and validation rules
- Import/export file format definition
- Implementation plan for MVP delivery

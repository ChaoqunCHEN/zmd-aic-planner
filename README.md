# zmd-aic-planner

Browser-first planning workspace for the Arknights: Endfield AIC planner MVP.

## Local development

- `pnpm dev` starts the Vite app at `http://127.0.0.1:4173`.
- `pnpm test` runs the Vitest smoke suite.
- `pnpm build` creates the production bundle in `dist/`.
- `pnpm typecheck` runs the TypeScript compiler in no-emit mode.

## Skland crawler

- See [`scripts/skland/README.md`](/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp/scripts/skland/README.md) for crawler setup, commands, outputs, and troubleshooting.

## E2E worker contract

- `pnpm test:e2e:smoke` runs the baseline Playwright smoke spec in [`e2e/smoke.spec.ts`](/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp/e2e/smoke.spec.ts).
- `pnpm test:e2e` runs the full Playwright suite: workspace editing, diagnostics and analysis, persistence and codec round-trips, and reference/inspector synchronization.
- `pnpm test:e2e:headed` runs the Playwright suite with a visible browser for debugging.
- Playwright starts the app with `pnpm dev --host 127.0.0.1 --port 4173 --strictPort` and waits for `http://127.0.0.1:4173`.
- Storage reset helpers live in [`e2e/fixtures/storage.ts`](/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp/e2e/fixtures/storage.ts) and [`e2e/fixtures/testApp.ts`](/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp/e2e/fixtures/testApp.ts).
- Canonical import fixtures for persistence or analysis coverage live under [`e2e/fixtures/`](/Users/cc/Dev/github.com/zmd-aic-planner/.worktrees/aic-planner-mvp/e2e/fixtures).
- HTML reports are written to `playwright-report/`.
- Raw Playwright artifacts are written to `test-results/e2e/`.

## Repo contents

- `docs/` design documents, architecture notes, and project plans
- `game-data/` bundled data workspace
- `scripts/` crawler and tooling entrypoints
- `src/` planner app shell, styles, and tests
- `e2e/` Playwright fixtures and smoke coverage

## License

This project is licensed under the MIT License. See `LICENSE` for details.

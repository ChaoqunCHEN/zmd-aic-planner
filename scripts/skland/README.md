# Skland crawler

This crawler bootstraps a Playwright browser session, discovers Endfield equipment records from Skland's JSON API surfaces, mirrors confirmed item images, and writes normalized planner-owned outputs into `game-data/`.

## Commands

- `pnpm crawl:skland:equipment`
  - full crawl for the equipment catalog
  - writes normalized planner JSON into `game-data/`
  - mirrors confirmed images into `game-data/assets/skland/items/`
- `pnpm crawl:skland:equipment:resume`
  - same output target as the full crawl
  - reuses `game-data/.cache/skland/` and existing mirrored files when possible
  - preferred for repeated runs because it is gentler on the source
- `pnpm crawl:skland:equipment:smoke`
  - best first check for a new machine or environment
  - writes only into `.tmp/skland-smoke/`
  - does not overwrite the repo's canonical `game-data/`

## Recommended flow

1. Run `pnpm install`.
2. Run `pnpm crawl:skland:equipment:smoke`.
3. If the smoke run returns a record, run `pnpm crawl:skland:equipment`.
4. Use `pnpm crawl:skland:equipment:resume` for follow-up refreshes.

## What gets written

- `game-data/placeable-items.json`
  - normalized placeable records discovered from the equipment catalog
- `game-data/resources.json`, `game-data/recipes.json`, `game-data/machine-modes.json`, `game-data/site-fixtures.json`, `game-data/site-presets.json`, `game-data/rule-fragments.json`
  - preserved in place unless the crawler learns how to populate them for this source slice
- `game-data/assets/skland/items/<planner-id>/`
  - mirrored icons and illustrations
- `game-data/.cache/skland/details/`
  - cached item detail payloads for resume mode
- `game-data/.cache/skland/skland-run-summary.json`
  - last crawl summary

## Behavior

- The crawler is API-first and does not depend on scraping the rendered catalog DOM.
- It bootstraps a browser session first, then uses that request context for Skland API calls.
- Requests are serialized with delay and jitter to reduce rate-limit pressure.
- Repeated guarded errors, especially `请求异常`, cause the crawler to stop instead of retrying aggressively.
- Mirrored asset metadata is stored back into normalized records through planner-owned asset refs.

## Troubleshooting

- If `pnpm crawl:skland:equipment:smoke` fails with `请求异常`, the upstream guard is still blocking this environment.
- If that happens, do not loop the full crawl command. The crawler already treats this as a stop condition.
- Check `game-data/.cache/skland/` or `.tmp/skland-smoke/` for partial debug output.
- Re-run with `pnpm crawl:skland:equipment:resume` only after you have a reason to believe the source is accessible again.

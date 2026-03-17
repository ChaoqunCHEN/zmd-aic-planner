# Skland Tag Metadata And Public Asset Publish

## Context

While implementing the AIC Planner v1.2 data-informed UX refresh, the crawler needed richer machine grouping metadata and the UI needed a production-safe way to serve mirrored game assets.

## Learnings

1. Skland equipment-type metadata is available directly in item detail payloads.
   - `item.subType.filterTagTree` contains the label map for tag groups such as rarity, quality, and equipment type.
   - `item.brief.subTypeList` contains the selected value ids for those groups.
   - Joining those two structures is enough to derive:
     - `inGameTypeId`
     - `inGameTypeLabel`
     - `inGameRarityLabel`
     - `inGameQualityLabel`

2. Skland usage guidance can be mined from the detail `document` structure without needing a separate endpoint.
   - `item.document.widgetCommonMap.*.tabDataMap.*.content` points at entries in `documentMap`.
   - Walking the referenced block trees and collecting text fragments yields usable `usageHints` for reference browsing and picker labeling.

3. Vite production builds do not automatically ship files referenced only by JSON path strings.
   - Returning `/game-data/assets/...` works only if those files exist under `public/` before build.
   - A small publish step that mirrors `game-data/assets` into `public/game-data/assets` fixes icon delivery in both dev and production while keeping canonical assets under `game-data/assets`.

4. Once crawler-derived in-game type labels are present, some previously generic `machine.skland-*` records should move out of the `machines` planner bucket.
   - Example: logistics intake pieces can land under `logistics`, and storage pieces can land under `storage`, even if the subtype remains `machine`.

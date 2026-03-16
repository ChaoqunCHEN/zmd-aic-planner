# Skland Live Image And Merge Learning

Date: 2026-03-16

## What we confirmed

- The live Skland equipment detail payload consistently exposes the item image under `item.brief.cover`.
- Across the current equipment slice, `item.brief.cover` is present for all `65` discovered items and was enough to mirror one confirmed icon per item.
- The current live detail payload shape did not expose a second larger image field for this slice, so `illustration` should remain unset rather than copied from the icon.

## Integration behavior to preserve

- The crawler cannot treat `game-data/placeable-items.json` as crawler-owned from scratch because the app still depends on curated placeables that are referenced by recipes and machine modes.
- Canonical promotion must merge Skland-derived placeables into the existing `placeable-items.json` by `id`, replacing matching Skland records while preserving unrelated curated records.
- A safe canonical rerun can use `--resume` after seeding `game-data/.cache/skland/` and `game-data/assets/skland/items/`, which minimizes live requests while still refreshing discovery.

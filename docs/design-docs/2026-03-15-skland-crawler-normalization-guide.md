# Skland Crawler Normalization Guide

## 1. Purpose

This guide defines what a crawler or data-ingestion worker should collect from Skland for the AIC planner and how that data should be normalized into planner-owned schemas.

The crawler should not store Skland payloads as the primary product artifact. Its primary job is to produce normalized planner data that matches [2026-03-15-placeable-and-related-data-structures.md](/Users/cc/Dev/github.com/zmd-aic-planner/docs/2026-03-15-placeable-and-related-data-structures.md).

## 2. Confirmed Source Surfaces

The following source routing is confirmed from shipped Skland client code:

| Surface | Endpoint | Notes |
| --- | --- | --- |
| Catalog listing | `/web/v1/wiki/item/catalog` | Used by the Endfield catalog page |
| Public item detail | `/web/v1/wiki/item/info` | Used for normal item detail |
| Edit/detail variant | `/web/v1/wiki/item/update/info` | Used in edit/update flows |
| Item list helper | `/web/v1/wiki/item/list` | Exists in client bundle; may support richer crawling |

Confirmed page reference:

- [Skland catalog page](https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=5)

Important implementation note:

- Direct API calls from this environment returned `{"code":10000,"message":"请求异常"}`.
- Endpoint names and query routing are confirmed.
- Exact live response-body fields still require crawler-side inspection in a real request context.

## 3. Source Levels

The crawler should treat source data in three layers.

### 3.1 Catalog-List Fields

These come from catalog listing endpoints and category pages.

Expected use:

- discovery
- category/subtype classification
- collecting ids for detail fetches
- collecting basic display metadata

Typical field families to look for:

- item id
- type main id
- type sub id
- subtype/category names
- item name
- icon or list image
- short summary or display text

### 3.2 Detail-Page Fields

These come from item info/detail endpoints or detail page payloads.

Expected use:

- enriching the base normalized record
- mapping item behavior
- pulling recipe or mode references
- extracting richer descriptive and media fields

Typical field families to look for:

- full description
- illustration
- stats
- recipe references
- machine behavior or mode references
- throughput, capacity, footprint, placement, ports
- category-specific properties for transport, storage, or extraction

### 3.3 Planner-Normalized Fields

These are the final fields stored in `game-data/`.

The crawler should output planner-normalized records, not raw Skland-shaped payloads, while preserving source traceability through metadata.

## 4. Output Files

The crawler should produce these normalized files:

- `placeable-items.json`
- `resources.json`
- `recipes.json`
- `machine-modes.json`
- `site-fixtures.json`
- `site-presets.json`
- `rule-fragments.json`

Optional debug artifacts are allowed, but they are secondary:

- raw payload snapshots
- endpoint audit logs
- field-mapping reports

## 5. Normalization Rules

### 5.1 General Rules

- Normalize into planner schema directly.
- Preserve stable ids across repeated crawls.
- Preserve source traceability.
- Mark uncertain fields with confidence metadata.
- Do not collapse unrelated concepts into one record.
- Always output both `name` and `nameZhHans` for normalized entities.

### 5.2 Identity Rules

- Use planner-owned ids, not UI labels, as canonical ids.
- Keep source ids in `sourceRefs` or a dedicated source key.
- Use deterministic id generation so repeated crawls produce the same ids.
- Normalize `name` as the English canonical name.
- Normalize `nameZhHans` as the Simplified Chinese canonical name.
- If either canonical name is missing from source, leave the record flagged for manual enrichment rather than silently dropping the field.

### 5.3 Confidence Rules

Each normalized record must include:

```json
{
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "verified"
  }
}
```

Allowed values:

- `verified`
- `probable`
- `partial`
- `unknown`

Use them like this:

- `verified`: field is explicitly present and clearly mapped
- `probable`: field is strongly implied by source layout or repeated pattern
- `partial`: field is incomplete, ambiguous, or only partially observable
- `unknown`: source does not confirm enough to trust the field

### 5.4 Optionality Rules

Unless live payload inspection confirms otherwise:

- treat behavior/stat fields as optional
- treat planner-added derived fields as inferred
- never fabricate exact numeric values from presentation alone

## 6. What To Collect

Collect the following when present.

### 6.1 Shared Item Metadata

- source item id
- type main id
- type sub id
- English item name
- Simplified Chinese item name
- English short name
- Simplified Chinese short name
- description
- icon
- illustration
- tags or keywords
- category and subtype labels

### 6.2 Placeable-Relevant Data

- footprint or size
- placement constraints
- orientation or rotation hints
- visible ports or IO directions
- throughput or rate values
- storage capacity
- power generation or consumption
- transport role
- extraction role
- valid source or target item families

### 6.3 Machine Data

- machine role or family
- supported recipes
- mode names or mode ids
- default mode if visible
- input and output expectations
- any machine-specific limits or slot counts

### 6.4 Belt And Pipe Data

- transport medium hints
- segment or routing hints
- directionality
- lane, flow, speed, or capacity hints
- compatibility with item vs fluid systems

### 6.5 Resource And Recipe Data

- material/resource names
- recipe ingredients and outputs
- duration/cycle time if exposed
- compatible machine families
- stack or unit hints

### 6.6 Site And Fixture Data

- site preset names
- site geometry metadata
- blocked/buildable regions
- fixed terminals and anchors
- natural deposits
- site-level caps or constraints

## 7. Mapping Rules By Entity Family

### 7.1 Placeable Items

Normalize into:

- `MachineItem`
- `StorageItem`
- `PowerItem`
- `TerminalItem`
- `LogisticsBuildingItem`
- `BeltItem`
- `PipeItem`
- `SplitterItem`
- `MergerItem`
- `ValveItem`
- `PumpItem`
- `PoleAttachmentItem`

Rules:

- If the item is user-editable and lives in the build/planning domain, map it into `PlaceableItem`.
- Use `placeableClass` to split area vs linear vs attachment behavior.
- Add capability blocks instead of flattening every property into subtype fields.

### 7.2 Fixed World Items

Normalize into:

- `ResourceDepositItem`
- `PermanentTerminalItem`
- `SiteObstacleItem`
- `SiteAnchorItem`

Rules:

- If the object is site-defined and not user-placeable in realistic planning mode, map it to `FixedWorldItem`.
- Keep any associated resource id or terminal role as references.

### 7.3 Resources

Normalize into `ResourceItem`.

Rules:

- A material and its deposit must be separate records.
- Keep transport-medium hints on the resource.
- Keep extraction behavior on the extractor or deposit, not on the resource itself.

### 7.4 Recipes

Normalize into `RecipeItem`.

Rules:

- Store inputs and outputs by normalized resource ids.
- Store machine compatibility by normalized machine ids or families.
- Keep duration optional unless clearly exposed.

### 7.5 Modes

Normalize into `MachineMode`.

Rules:

- Modes are separate catalog records.
- Do not store modes as giant inline blocks inside machine records.
- Link modes to machines through capabilities or supported-mode ids.

## 8. Confirmed Vs Inferred Fields

The crawler must classify each mapped field into one of three buckets.

### 8.1 Confirmed Endpoint Or Query Shape

Confirmed from client code:

- `/web/v1/wiki/item/catalog`
- `/web/v1/wiki/item/info`
- `/web/v1/wiki/item/update/info`
- page routing via `typeMainId` and `typeSubId`

### 8.2 Confirmed UI-Referenced Fields

Confirmed from inspected client bundle usage:

- item name
- illustration reference
- subtype/category relationships
- item id flow

These are safer than guesswork but still require live payload capture for exact field names.

### 8.3 Inferred Planner Fields

The crawler may create normalized planner fields that do not exist 1:1 in source, such as:

- `placeableClass`
- capability blocks
- planner-owned ids
- normalized `aicCategory`
- normalized `transportMediumId`

These must be marked via `sourceNotes` or mapping documentation as inferred normalization output.

## 9. Recommended Crawl Flow

1. Fetch catalog data by `typeMainId` and `typeSubId`.
2. Build a discovery list of candidate item ids and category mappings.
3. Fetch item detail for each candidate item id.
4. Normalize each item into one planner entity family.
5. Emit referenced resources, recipes, modes, and fixtures as separate normalized records.
6. Deduplicate by planner id.
7. Validate cross-record references.
8. Write domain-sliced JSON outputs.

## 10. Validation Checklist

The crawler output is acceptable only if:

- every normalized record has `id`, `kind`, `name`, and `source`
- all references point to existing normalized ids
- deposits and resources are separate records
- belts and pipes become `LinearPlaceableItem`
- machine modes are separate records
- disputed or missing fields are optional and confidence-marked

## 11. Example Mapping

### 11.1 Source-Shaped Discovery Record

This is illustrative only.

```json
{
  "sourceItemId": "12345",
  "typeMainId": "1",
  "typeSubId": "5",
  "name": "Conveyor Belt Mk.1",
  "icon": "https://example.com/source/belt.png"
}
```

### 11.2 Normalized Planner Record

```json
{
  "id": "belt.mk1",
  "kind": "placeable-item",
  "name": "Conveyor Belt Mk.1",
  "nameZhHans": "传送带 Mk.1",
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "probable",
    "sourceNotes": "Normalized from catalog and detail mapping."
  },
  "sourceRefs": [
    {
      "endpoint": "/web/v1/wiki/item/catalog",
      "label": "sourceItemId",
      "rawValue": "12345"
    }
  ],
  "worldCategory": "placeable",
  "aicCategory": "logistics",
  "placeableClass": "linear",
  "placement": {
    "gridSnap": true,
    "canRotate": true,
    "allowedSurfaces": ["buildable-floor"]
  },
  "segmentShape": ["straight", "turn", "junction"],
  "segmentLengthUnit": "grid-cell",
  "capabilities": [
    {
      "type": "transport",
      "data": {
        "mediumKind": "item",
        "transportMediumId": "transport.items"
      }
    }
  ],
  "subtype": "belt",
  "transportMediumId": "transport.items",
  "supportsDirectionality": true
}
```

## 12. Non-Goals

This crawler guide does not require:

- preserving raw Skland payloads as the main product artifact
- guessing exact numeric stats when source access is blocked
- forcing every Skland content type into the planner if it is outside AIC scope

The planner’s schema is the source of truth. The crawler exists to populate it, not define it.

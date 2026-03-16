# Placeable And Related Data Structures

## 1. Purpose

This document defines the normalized catalog data structure for the AIC planner, with special focus on:

- placeable items such as machines, belts, pipes, storage, and terminals
- related non-placeable data such as resources, recipes, machine modes, and rule fragments
- fixed world items such as resource deposits and permanent site fixtures

The goal is to give the planner one stable, implementation-ready schema that is:

- inheritance-friendly
- normalized for planner use
- compatible with later crawler ingestion
- flexible enough to handle partial or disputed game data

This document extends the architecture direction in [2026-03-15-aic-planner-architecture-design.md](/Users/cc/Dev/github.com/zmd-aic-planner/docs/2026-03-15-aic-planner-architecture-design.md).

## 2. Design Principles

The schema should follow these rules:

- Use a narrow inheritance spine, not a deep hierarchy full of nullable fields.
- Put shared identity and source metadata at the top of the tree.
- Keep placeability separate from resource/recipe/reference concepts.
- Use capability blocks for reusable behavior.
- Treat site fixtures and natural deposits as world items, not user-placeable items in MVP.
- Model operating modes as separate catalog records referenced by capable items.

## 3. Inheritance Spine

```text
CatalogEntity
  -> WorldItem
    -> PlaceableItem
      -> AreaPlaceableItem
        -> MachineItem
        -> StorageItem
        -> PowerItem
        -> TerminalItem
        -> LogisticsBuildingItem
      -> LinearPlaceableItem
        -> BeltItem
        -> PipeItem
      -> AttachmentPlaceableItem
        -> SplitterItem
        -> MergerItem
        -> ValveItem
        -> PumpItem
        -> PoleAttachmentItem
    -> FixedWorldItem
      -> ResourceDepositItem
      -> PermanentTerminalItem
      -> SiteObstacleItem
      -> SiteAnchorItem
  -> NonPlaceableItem
    -> ResourceItem
    -> RecipeItem
    -> MachineMode
    -> TransportMedium
    -> RuleFragment
    -> SitePreset
    -> SiteFixtureType
```

## 4. Base Entities

### 4.1 `CatalogEntity`

All normalized records inherit from `CatalogEntity`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable planner-owned id |
| `kind` | `CatalogKind` | yes | Top-level discriminator |
| `slug` | `string` | no | Optional friendly id |
| `name` | `string` | yes | Canonical English name |
| `nameZhHans` | `string` | yes | Canonical Simplified Chinese name |
| `shortName` | `string` | no | Optional compact English label |
| `shortNameZhHans` | `string` | no | Optional compact Chinese label |
| `description` | `LocalizedText` | no | Localized human-facing description |
| `icon` | `AssetRef` | no | Small display asset |
| `illustration` | `AssetRef` | no | Large art or card art |
| `tags` | `string[]` | no | Search/filter tags |
| `source` | `SourceMeta` | yes | Confidence and provenance |
| `sourceRefs` | `SourceRef[]` | no | Traceability back to source fields |

### 4.2 `WorldItem`

`WorldItem` covers entities that can appear in the site context.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `worldCategory` | `"placeable" \| "fixed" \| "reference"` | yes | Broad planner role |
| `aicCategory` | `AicCategory` | yes | Planner grouping for UI |
| `unlock` | `UnlockRequirement[]` | no | If source exposes unlocks |
| `notes` | `LocalizedText` | no | Localized planner/editor notes |

### 4.3 `NonPlaceableItem`

`NonPlaceableItem` is for resources, recipes, modes, and related data that users do not place directly.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `worldCategory` | `"reference"` | yes | Fixed discriminator |
| `referenceKind` | `ReferenceKind` | yes | Resource, recipe, mode, etc. |

## 5. Placeable Item Family

### 5.1 `PlaceableItem`

Every user-editable machine/building/transport piece inherits from `PlaceableItem`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `worldCategory` | `"placeable"` | yes | Fixed discriminator |
| `placeableClass` | `"area" \| "linear" \| "attachment"` | yes | Placement behavior |
| `placement` | `PlacementRules` | yes | Grid and rule constraints |
| `ports` | `PortDefinition[]` | no | Defined if item has connections |
| `capabilities` | `CapabilityBlock[]` | no | Reusable behavior blocks |
| `durability` | `DurabilityData` | no | Only if supported/needed |

### 5.2 `AreaPlaceableItem`

Used for machines and other footprint-based objects.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `footprint` | `FootprintSpec` | yes | Width, height, occupied cells |
| `rotationMode` | `RotationMode` | no | Allowed orientations |
| `clearance` | `ClearanceRule[]` | no | Neighbor or spacing rules |

### 5.3 `LinearPlaceableItem`

Used for routed or segment-based transport.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `segmentShape` | `SegmentShapeKind[]` | yes | Straight, turn, junction, etc. |
| `segmentLengthUnit` | `string` | yes | Usually grid-cell based |
| `routingRules` | `RoutingRuleSet` | no | Adjacency or turn restrictions |

### 5.4 `AttachmentPlaceableItem`

Used for things attached to another placeable or valid anchor.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `attachmentTargets` | `AttachmentTargetKind[]` | yes | Which hosts are valid |
| `attachmentRules` | `AttachmentRuleSet` | no | Constraints for placement |

## 6. Capability Blocks

Capabilities are reusable typed sub-objects referenced from `PlaceableItem.capabilities`.

### 6.1 Shared Capability Envelope

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | `CapabilityType` | yes | Discriminator |
| `version` | `string` | no | Optional schema version |
| `data` | `object` | yes | Type-specific payload |

### 6.2 Capability Types

| Capability | Used By | Key Data |
| --- | --- | --- |
| `RecipeCapability` | machines, processors | supported recipe ids, slot limits, defaults |
| `TransportCapability` | belts, pipes, transfer buildings | medium, rate, lane count, direction rules |
| `StorageCapability` | storage, terminals, buffers | capacity, accepted media, stack or fluid rules |
| `PowerCapability` | generators, consumers, poles | generation, consumption, transmission, range |
| `ExtractionCapability` | extractors, miners, pumps | source kinds, yield behavior, valid deposits |
| `FluidCapability` | pipes, pumps, tanks | fluid medium, pressure/flow hints |
| `LogicCapability` | sorters, valves, switches | filtering, gating, routing logic |

## 7. Concrete Placeable Subtypes

### 7.1 `MachineItem`

Use for production machines.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"machine"` | yes | Fixed discriminator |
| `machineRole` | `MachineRole` | yes | Smelter, assembler, refiner, etc. |
| `supportedModeIds` | `string[]` | no | Through capability-level mode use |
| `defaultModeId` | `string` | no | Optional default |

Expected capabilities:

- `RecipeCapability`
- `PowerCapability` when relevant
- `FluidCapability` when relevant

### 7.2 `StorageItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"storage"` | yes | Fixed discriminator |
| `storageRole` | `StorageRole` | yes | Buffer, warehouse, tank, bin |

Expected capabilities:

- `StorageCapability`
- optional `PowerCapability`

### 7.3 `PowerItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"power"` | yes | Fixed discriminator |
| `powerRole` | `PowerRole` | yes | Generator, transmitter, consumer-only |

Expected capabilities:

- `PowerCapability`

### 7.4 `TerminalItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"terminal"` | yes | Fixed discriminator |
| `terminalRole` | `TerminalRole` | yes | External input, output, transfer, site IO |

Expected capabilities:

- `StorageCapability`
- `TransportCapability`
- optional `PowerCapability`

### 7.5 `LogisticsBuildingItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"logistics-building"` | yes | Fixed discriminator |
| `logisticsRole` | `LogisticsRole` | yes | Sorter, loader, transfer node |

Expected capabilities:

- `TransportCapability`
- `LogicCapability`

### 7.6 `BeltItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"belt"` | yes | Fixed discriminator |
| `transportMediumId` | `string` | yes | Usually solid items |
| `supportsDirectionality` | `boolean` | yes | Planner routing direction |

Expected capabilities:

- `TransportCapability`

### 7.7 `PipeItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `subtype` | `"pipe"` | yes | Fixed discriminator |
| `transportMediumId` | `string` | yes | Fluid or gas medium family |
| `pressureModel` | `string` | no | Only if verified |

Expected capabilities:

- `TransportCapability`
- `FluidCapability`

### 7.8 Attachment Subtypes

Use the same pattern for:

- `SplitterItem`
- `MergerItem`
- `ValveItem`
- `PumpItem`
- `PoleAttachmentItem`

Each must declare:

- `subtype`
- valid `attachmentTargets`
- required capabilities

## 8. Fixed World Items

Fixed world items exist in a site but are not user-placeable in MVP.

### 8.1 `FixedWorldItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `worldCategory` | `"fixed"` | yes | Fixed discriminator |
| `fixedKind` | `FixedWorldKind` | yes | Deposit, obstacle, anchor, terminal |
| `siteBinding` | `SiteBindingRule` | yes | How it binds to a site or preset |

### 8.2 Concrete Fixed Types

| Type | Purpose |
| --- | --- |
| `ResourceDepositItem` | Mineable or extractable fixed resource node |
| `PermanentTerminalItem` | Fixed import/export or map IO |
| `SiteObstacleItem` | Non-placeable blockers or reserved devices |
| `SiteAnchorItem` | Site-defined reference anchors for routing or placement |

## 9. Related Non-Placeable Entities

### 9.1 `ResourceItem`

Represents the material itself, not the deposit.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"resource"` | yes | Fixed discriminator |
| `resourceClass` | `ResourceClass` | yes | Ore, component, fluid, gas, etc. |
| `unit` | `string` | yes | Item, stack, liter, etc. |
| `stackSize` | `number` | no | If source exposes it |
| `transportMediumIds` | `string[]` | no | Valid transport media |

### 9.2 `RecipeItem`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"recipe"` | yes | Fixed discriminator |
| `input` | `RecipeIngredient[]` | yes | Required inputs |
| `output` | `RecipeIngredient[]` | yes | Produced outputs |
| `durationSeconds` | `number` | no | If verified |
| `machineTypeIds` | `string[]` | no | Compatible machine families |

### 9.3 `MachineMode`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"machine-mode"` | yes | Fixed discriminator |
| `appliesToMachineTypeIds` | `string[]` | yes | Compatible machine families |
| `recipeIds` | `string[]` | no | If mode selects recipe families |
| `portOverrides` | `PortOverride[]` | no | If mode changes ports |
| `throughputOverrides` | `ThroughputOverride[]` | no | If mode changes rates |

### 9.4 `TransportMedium`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"transport-medium"` | yes | Fixed discriminator |
| `mediumKind` | `"item" \| "fluid" \| "gas" \| "power"` | yes | Transport family |
| `displayUnit` | `string` | no | UI summary unit |

### 9.5 `RuleFragment`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"rule-fragment"` | yes | Fixed discriminator |
| `ruleType` | `RuleType` | yes | Placement, adjacency, cap, etc. |
| `payload` | `object` | yes | Rule-specific normalized data |

### 9.6 `SitePreset`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"site-preset"` | yes | Fixed discriminator |
| `grid` | `SiteGridSpec` | yes | Dimensions and zones |
| `fixtureIds` | `string[]` | no | Fixed world items present |
| `ruleFragmentIds` | `string[]` | no | Site-specific rules |

### 9.7 `SiteFixtureType`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `referenceKind` | `"site-fixture-type"` | yes | Fixed discriminator |
| `fixtureKind` | `FixedWorldKind` | yes | Deposit, anchor, obstacle |
| `defaultPorts` | `PortDefinition[]` | no | If fixture connects to the graph |

## 10. Shared Support Types

### 10.1 `SourceMeta`

```ts
type SourceMeta = {
  sourceSystem: "skland" | "manual" | "hybrid";
  sourceConfidence: "verified" | "probable" | "partial" | "unknown";
  sourceNotes?: string;
  lastSeenAt?: string;
};
```

### 10.1.1 Naming Contract

Every normalized item must include:

- `name`: the English canonical name
- `nameZhHans`: the Simplified Chinese canonical name

Do not hide these two fields inside a generic translation map. Other optional translated content, such as `description` or `notes`, can remain localized maps.

### 10.2 `SourceRef`

```ts
type SourceRef = {
  endpoint?: string;
  path?: string;
  label?: string;
  rawValue?: unknown;
};
```

### 10.3 `AssetRef`

```ts
type AssetRef = {
  kind: "icon" | "illustration" | "sprite" | "other";
  path?: string;
  url?: string;
  sourceUrl?: string;
  mimeType?: string;
  sha256?: string;
  alt?: string;
};
```

`AssetRef` supports both planner-owned mirrored files and remote source assets:

- use `path` for repo-relative mirrored assets stored in `game-data/`
- use `sourceUrl` for the original upstream asset URL when mirrored
- keep `url` only for records that intentionally reference a remote asset directly
- use `mimeType` and `sha256` for asset validation, dedupe, and refresh checks

### 10.4 `PortDefinition`

```ts
type PortDefinition = {
  id: string;
  direction: "input" | "output" | "bidirectional";
  mediumKind: "item" | "fluid" | "gas" | "power";
  mediumId?: string;
  maxLinks?: number;
  optional?: boolean;
};
```

## 11. JSON Examples

### 11.1 `MachineItem`

```json
{
  "id": "machine.assembler.alpha",
  "kind": "placeable-item",
  "slug": "assembler-alpha",
  "name": "Assembler Alpha",
  "nameZhHans": "组装机 Alpha",
  "description": {
    "en": "General-purpose production machine.",
    "zh-Hans": "通用生产设备。"
  },
  "icon": {
    "path": "game-data/assets/skland/items/machine.assembler.alpha/icon.png",
    "sourceUrl": "https://example.com/icons/assembler-alpha.png",
    "mimeType": "image/png",
    "sha256": "7d3b6c7f-example",
    "kind": "icon"
  },
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "partial",
    "sourceNotes": "Endpoint confirmed, detail fields partially inferred from UI usage."
  },
  "worldCategory": "placeable",
  "aicCategory": "production",
  "placeableClass": "area",
  "placement": {
    "gridSnap": true,
    "canRotate": true,
    "allowedSurfaces": ["buildable-floor"]
  },
  "footprint": {
    "width": 3,
    "height": 2,
    "occupiedCells": "full-rectangle"
  },
  "ports": [
    { "id": "in-1", "direction": "input", "mediumKind": "item", "maxLinks": 1 },
    { "id": "out-1", "direction": "output", "mediumKind": "item", "maxLinks": 1 },
    { "id": "power", "direction": "input", "mediumKind": "power", "maxLinks": 1, "optional": false }
  ],
  "capabilities": [
    {
      "type": "recipe",
      "data": {
        "supportedRecipeIds": ["recipe.refined-alloy-a", "recipe.component-frame-b"],
        "supportedModeIds": ["mode.machine.standard", "mode.machine.efficiency"]
      }
    },
    {
      "type": "power",
      "data": {
        "consumptionKw": 120
      }
    }
  ],
  "subtype": "machine",
  "machineRole": "assembler"
}
```

### 11.2 `BeltItem`

```json
{
  "id": "belt.mk1",
  "kind": "placeable-item",
  "name": "Conveyor Belt Mk.1",
  "nameZhHans": "传送带 Mk.1",
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "probable"
  },
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
  "routingRules": {
    "allowsBranching": true,
    "allowsCrossing": false
  },
  "capabilities": [
    {
      "type": "transport",
      "data": {
        "mediumKind": "item",
        "transportMediumId": "transport.items",
        "unitsPerSecond": 20
      }
    }
  ],
  "subtype": "belt",
  "transportMediumId": "transport.items",
  "supportsDirectionality": true
}
```

### 11.3 `PipeItem`

```json
{
  "id": "pipe.standard",
  "kind": "placeable-item",
  "name": "Standard Pipe",
  "nameZhHans": "标准管道",
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "probable"
  },
  "worldCategory": "placeable",
  "aicCategory": "fluid-logistics",
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
        "mediumKind": "fluid",
        "transportMediumId": "transport.fluids",
        "unitsPerSecond": 30
      }
    },
    {
      "type": "fluid",
      "data": {
        "pressureModel": "not-yet-verified"
      }
    }
  ],
  "subtype": "pipe",
  "transportMediumId": "transport.fluids"
}
```

### 11.4 `ResourceDepositItem`

```json
{
  "id": "fixture.deposit.iron-ore-a",
  "kind": "fixed-world-item",
  "name": "Iron Ore Deposit",
  "nameZhHans": "铁矿床",
  "source": {
    "sourceSystem": "manual",
    "sourceConfidence": "verified"
  },
  "worldCategory": "fixed",
  "aicCategory": "resource-node",
  "fixedKind": "resource-deposit",
  "siteBinding": {
    "sitePresetIds": ["site.aic-01"],
    "positions": [{ "x": 14, "y": 8 }]
  },
  "resourceItemId": "resource.iron-ore"
}
```

### 11.5 `ResourceItem`

```json
{
  "id": "resource.iron-ore",
  "kind": "reference-item",
  "name": "Iron Ore",
  "nameZhHans": "铁矿石",
  "source": {
    "sourceSystem": "skland",
    "sourceConfidence": "partial"
  },
  "worldCategory": "reference",
  "referenceKind": "resource",
  "resourceClass": "ore",
  "unit": "item",
  "stackSize": 100,
  "transportMediumIds": ["transport.items"]
}
```

## 12. Normalized Output Files

The curated dataset should ultimately be stored in domain-sliced files:

- `game-data/placeable-items.json`
- `game-data/resources.json`
- `game-data/recipes.json`
- `game-data/machine-modes.json`
- `game-data/site-fixtures.json`
- `game-data/site-presets.json`
- `game-data/rule-fragments.json`

## 13. Review Checklist

Before implementation, validate that:

- every placeable subtype inherits only relevant parent fields
- belts and pipes remain inside the shared placeable family
- deposits remain fixed world items, not user placeables
- modes stay as separate catalog records
- resources and deposits are not conflated
- capabilities capture behavior instead of base-class sprawl

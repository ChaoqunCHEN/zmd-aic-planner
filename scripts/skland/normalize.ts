import type { AssetRef, PlaceableItem, SourceRef } from "../../src/domain/types";
import { buildEnglishFallbackName, buildPlannerId } from "./id";
import { resolveSubtype } from "./manualMappings";
import type {
  DownloadedAsset,
  NormalizedEquipmentRecord,
  SklandDetailRecord,
  SklandDiscoveryRecord
} from "./types";

function toAssetRef(asset: DownloadedAsset | undefined): AssetRef | undefined {
  if (!asset) {
    return undefined;
  }

  return {
    kind: asset.kind,
    path: asset.path,
    sourceUrl: asset.sourceUrl,
    mimeType: asset.mimeType,
    sha256: asset.sha256,
    alt: asset.alt
  };
}

function buildSourceRefs(discovery: SklandDiscoveryRecord, detail: SklandDetailRecord): SourceRef[] {
  return [
    {
      endpoint: "/web/v1/wiki/item/catalog",
      label: "sourceItemId",
      rawValue: discovery.sourceItemId
    },
    {
      endpoint: "/web/v1/wiki/item/info",
      label: "sourceItemId",
      rawValue: detail.sourceItemId
    }
  ];
}

function normalizeSourceLabel(label: string | undefined): string | undefined {
  if (!label) {
    return undefined;
  }

  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function inferPlannerCategory(subtype: PlaceableItem["subtype"]): PlaceableItem["plannerCategory"] {
  if (subtype === "storage") {
    return "storage";
  }

  if (subtype === "belt" || subtype === "pipe" || subtype === "logistics-building") {
    return "logistics";
  }

  if (subtype === "terminal") {
    return "utilities";
  }

  return "machines";
}

function inferPlannerCategoryFromInGameType(
  typeLabel: string | undefined,
  subtype: PlaceableItem["subtype"]
): PlaceableItem["plannerCategory"] {
  const normalized = typeLabel?.trim();

  if (normalized === "物流设备") {
    return "logistics";
  }

  if (normalized === "仓储存区") {
    return "storage";
  }

  if (normalized === "功能设备" || normalized === "电力供应") {
    return "utilities";
  }

  return inferPlannerCategory(subtype);
}

export function normalizeEquipmentRecord(input: {
  discovery: SklandDiscoveryRecord;
  detail: SklandDetailRecord;
  downloadedAssets: DownloadedAsset[];
}): NormalizedEquipmentRecord {
  const subtype = resolveSubtype(input.detail.sourceItemId);
  const plannerId = buildPlannerId({
    subtype,
    sourceItemId: input.detail.sourceItemId
  });
  const icon = toAssetRef(input.downloadedAssets.find((asset) => asset.kind === "icon"));
  const illustration = toAssetRef(
    input.downloadedAssets.find((asset) => asset.kind === "illustration")
  );

  const placeable: PlaceableItem = {
    id: plannerId,
    kind: "placeable",
    name: buildEnglishFallbackName({
      sourceItemId: input.detail.sourceItemId,
      zhName: input.detail.nameZhHans
    }),
    nameZhHans: input.detail.nameZhHans,
    description: input.detail.descriptionZhHans,
    icon,
    illustration,
    tags: [input.discovery.categoryName, input.discovery.subCategoryName, "skland"].filter(
      (tag): tag is string => Boolean(tag)
    ),
    source: {
      sourceSystem: "skland",
      sourceConfidence: "partial",
      sourceNotes: ["Normalized from guarded public Skland endpoints with local mirrored assets."]
    },
    sourceRefs: buildSourceRefs(input.discovery, input.detail),
    plannerCategory: inferPlannerCategoryFromInGameType(input.detail.inGameTypeLabel, subtype),
    sourceCategoryLabel: normalizeSourceLabel(input.discovery.categoryName),
    sourceSubCategoryLabel: normalizeSourceLabel(input.discovery.subCategoryName),
    inGameTypeId: input.detail.inGameTypeId,
    inGameTypeLabel: normalizeSourceLabel(input.detail.inGameTypeLabel),
    inGameRarityLabel: normalizeSourceLabel(input.detail.inGameRarityLabel),
    inGameQualityLabel: normalizeSourceLabel(input.detail.inGameQualityLabel),
    usageHints: input.detail.usageHints,
    availabilityStatus: "reference-only",
    worldCategory: "placeable",
    placementKind: "area",
    placeableClass: "area",
    subtype,
    footprint: {
      width: 1,
      height: 1
    },
    ports: []
  };

  return { placeable };
}

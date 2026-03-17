// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  sampleDetailRecord,
  sampleDiscoveryRecord,
  sampleDownloadedAssets
} from "./test-fixtures";
import { normalizeEquipmentRecord } from "../normalize";

describe("normalizeEquipmentRecord", () => {
  it("produces a reference-only placeable with source categories and mirrored metadata", () => {
    const normalized = normalizeEquipmentRecord({
      discovery: sampleDiscoveryRecord,
      detail: sampleDetailRecord,
      downloadedAssets: sampleDownloadedAssets
    });

    expect(normalized.placeable.id).toBe("machine.skland-12345");
    expect(normalized.placeable.name).toBe("Extractor Pump");
    expect(normalized.placeable.nameZhHans).toBe("抽水机");
    expect(normalized.placeable.source.sourceConfidence).toBe("partial");
    expect(normalized.placeable.availabilityStatus).toBe("reference-only");
    expect(normalized.placeable.plannerCategory).toBe("machines");
    expect(normalized.placeable.sourceCategoryLabel).toBe("设备图鉴");
    expect(normalized.placeable.sourceSubCategoryLabel).toBe("生产设备");
    expect(normalized.placeable.placementKind).toBe("area");
    expect(normalized.placeable.footprint).toEqual({ width: 1, height: 1 });
    expect(normalized.placeable.ports).toEqual([]);
    expect(normalized.placeable.icon).toMatchObject({
      path: "game-data/assets/skland/items/machine.skland-12345/icon.png",
      sourceUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
      sha256: "icon-sha"
    });
    expect(normalized.placeable.illustration).toMatchObject({
      path: "game-data/assets/skland/items/machine.skland-12345/illustration.webp",
      sourceUrl: "https://assets.skland.com/endfield/items/12345-card.webp",
      sha256: "illustration-sha"
    });
    expect(normalized.placeable.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: "/web/v1/wiki/item/info",
          label: "sourceItemId",
          rawValue: "12345"
        })
      ])
    );
  });

  it("omits source category labels when discovery labels are blank strings", () => {
    const normalized = normalizeEquipmentRecord({
      discovery: {
        ...sampleDiscoveryRecord,
        categoryName: "   ",
        subCategoryName: ""
      },
      detail: sampleDetailRecord,
      downloadedAssets: sampleDownloadedAssets
    });

    expect(normalized.placeable.sourceCategoryLabel).toBeUndefined();
    expect(normalized.placeable.sourceSubCategoryLabel).toBeUndefined();
  });
});

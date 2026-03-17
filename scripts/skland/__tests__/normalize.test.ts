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
    expect(normalized.placeable.inGameTypeId).toBe("10247");
    expect(normalized.placeable.inGameTypeLabel).toBe("资源开采");
    expect(normalized.placeable.inGameRarityLabel).toBe("2星");
    expect(normalized.placeable.inGameQualityLabel).toBe("绿色品质");
    expect(normalized.placeable.usageHints).toEqual([
      "抽水机需要放置在资源点上。",
      "资源开采类设备可用于采集原料。"
    ]);
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

  it("reclassifies known machine families from in-game equipment types", () => {
    const miner = normalizeEquipmentRecord({
      discovery: sampleDiscoveryRecord,
      detail: {
        ...sampleDetailRecord,
        sourceItemId: "166",
        nameZhHans: "电驱矿机",
        inGameTypeId: "10247",
        inGameTypeLabel: "资源开采"
      },
      downloadedAssets: sampleDownloadedAssets
    });

    const storage = normalizeEquipmentRecord({
      discovery: sampleDiscoveryRecord,
      detail: {
        ...sampleDetailRecord,
        sourceItemId: "168",
        nameZhHans: "协议储存箱",
        inGameTypeId: "10250",
        inGameTypeLabel: "仓储存区"
      },
      downloadedAssets: sampleDownloadedAssets
    });

    const logistics = normalizeEquipmentRecord({
      discovery: sampleDiscoveryRecord,
      detail: {
        ...sampleDetailRecord,
        sourceItemId: "164",
        nameZhHans: "物流桥",
        inGameTypeId: "10246",
        inGameTypeLabel: "物流设备"
      },
      downloadedAssets: sampleDownloadedAssets
    });

    expect(miner.placeable.plannerCategory).toBe("machines");
    expect(storage.placeable.plannerCategory).toBe("storage");
    expect(logistics.placeable.plannerCategory).toBe("logistics");
  });
});

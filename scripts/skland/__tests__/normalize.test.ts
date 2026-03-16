// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  sampleDetailRecord,
  sampleDiscoveryRecord,
  sampleDownloadedAssets
} from "./test-fixtures";
import { normalizeEquipmentRecord } from "../normalize";

describe("normalizeEquipmentRecord", () => {
  it("produces a partial placeable item with mirrored asset metadata and source refs", () => {
    const normalized = normalizeEquipmentRecord({
      discovery: sampleDiscoveryRecord,
      detail: sampleDetailRecord,
      downloadedAssets: sampleDownloadedAssets
    });

    expect(normalized.placeable.id).toBe("machine.skland-12345");
    expect(normalized.placeable.name).toBe("Extractor Pump");
    expect(normalized.placeable.nameZhHans).toBe("抽水机");
    expect(normalized.placeable.source.sourceConfidence).toBe("partial");
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
});

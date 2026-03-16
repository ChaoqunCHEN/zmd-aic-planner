// @vitest-environment node

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { sampleDetailRecord, sampleDiscoveryRecord } from "./test-fixtures";
import { runSklandEquipmentCrawler } from "../pipeline";

describe("runSklandEquipmentCrawler", () => {
  it("writes canonical outputs, caches details, mirrors assets, and resumes safely", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "skland-pipeline-"));
    const getItemInfo = vi.fn().mockResolvedValue(sampleDetailRecord);
    const downloadAsset = vi
      .fn()
      .mockResolvedValueOnce({
        body: Buffer.from("icon"),
        mimeType: "image/png"
      })
      .mockResolvedValueOnce({
        body: Buffer.from("illustration"),
        mimeType: "image/webp"
      });

    const client = {
      getItemList: vi.fn().mockResolvedValue([sampleDiscoveryRecord]),
      getCatalog: vi.fn().mockResolvedValue([]),
      getItemInfo,
      downloadAsset
    };

    const first = await runSklandEquipmentCrawler({
      client,
      rootDir,
      typeMainId: "1",
      typeSubId: "5",
      resume: false,
      startedAt: "2026-03-15T00:00:00.000Z"
    });

    const placeableItems = JSON.parse(
      await readFile(join(rootDir, "game-data/placeable-items.json"), "utf8")
    ) as Array<{ id: string }>;

    expect(first.discoveredItems).toBe(1);
    expect(first.fetchedDetails).toBe(1);
    expect(first.downloadedAssets).toBe(2);
    expect(placeableItems[0]?.id).toBe("machine.skland-12345");

    const second = await runSklandEquipmentCrawler({
      client,
      rootDir,
      typeMainId: "1",
      typeSubId: "5",
      resume: true,
      startedAt: "2026-03-15T00:05:00.000Z"
    });

    expect(second.discoveredItems).toBe(1);
    expect(second.fetchedDetails).toBe(0);
    expect(second.downloadedAssets).toBe(0);
    expect(getItemInfo).toHaveBeenCalledTimes(1);
    expect(downloadAsset).toHaveBeenCalledTimes(2);
  });
});

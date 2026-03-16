// @vitest-environment node

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { sampleDetailRecord, sampleDiscoveryRecord } from "./test-fixtures";
import { runSklandEquipmentCrawler } from "../pipeline";

describe("runSklandEquipmentCrawler", () => {
  it("writes canonical outputs, caches details, mirrors assets, and resumes safely", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "skland-pipeline-"));
    await mkdir(join(rootDir, "game-data"), { recursive: true });
    const existingResourcesContent =
      '[\n  {\n    "kind": "resource",\n    "id": "resource.iron-ore",\n    "name": "Iron Ore"\n  }\n]\n';
    await writeFile(
      join(rootDir, "game-data/placeable-items.json"),
      `${JSON.stringify(
        [
          {
            id: "machine.basic-smelter",
            kind: "placeable",
            name: "Basic Smelter",
            nameZhHans: "基础冶炼炉",
            tags: ["machine"],
            source: {
              sourceSystem: "curated",
              sourceConfidence: "verified"
            },
            worldCategory: "placeable",
            placeableClass: "area",
            subtype: "machine",
            footprint: {
              width: 2,
              height: 2
            },
            ports: []
          }
        ],
        null,
        2
      )}\n`
    );
    await writeFile(join(rootDir, "game-data/resources.json"), existingResourcesContent);
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
    const resourcesContent = await readFile(join(rootDir, "game-data/resources.json"), "utf8");

    expect(first.discoveredItems).toBe(1);
    expect(first.fetchedDetails).toBe(1);
    expect(first.downloadedAssets).toBe(2);
    expect(placeableItems.map((item) => item.id)).toEqual([
      "machine.basic-smelter",
      "machine.skland-12345"
    ]);
    expect(resourcesContent).toBe(existingResourcesContent);

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

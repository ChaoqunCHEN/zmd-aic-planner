// @vitest-environment node

import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const TEMP_ROOT = join(process.cwd(), ".tmp", "publish-planner-assets-test");

afterEach(async () => {
  await rm(TEMP_ROOT, { recursive: true, force: true });
});

describe("publishPlannerAssets", () => {
  it("does not publish assets as a side effect of importing the helper module", async () => {
    const previousCwd = process.cwd();
    const assetSourcePath = join(
      TEMP_ROOT,
      "game-data",
      "assets",
      "skland",
      "items",
      "machine.skland-166",
      "icon.png"
    );
    await mkdir(join(assetSourcePath, ".."), { recursive: true });
    await writeFile(assetSourcePath, "icon-binary", "utf8");

    process.chdir(TEMP_ROOT);

    try {
      await import("../publishPlannerAssets");
    } finally {
      process.chdir(previousCwd);
    }

    await expect(access(join(TEMP_ROOT, "public", "game-data", "assets"))).rejects.toThrow();
  });

  it("copies canonical planner assets into the public-served game-data path", async () => {
    const { publishPlannerAssets } = await import("../publishPlannerAssets");
    const assetSourcePath = join(
      TEMP_ROOT,
      "game-data",
      "assets",
      "skland",
      "items",
      "machine.skland-166",
      "icon.png"
    );
    await mkdir(join(assetSourcePath, ".."), { recursive: true });
    await writeFile(assetSourcePath, "icon-binary", "utf8");

    await publishPlannerAssets({
      rootDir: TEMP_ROOT
    });

    const publishedPath = join(
      TEMP_ROOT,
      "public",
      "game-data",
      "assets",
      "skland",
      "items",
      "machine.skland-166",
      "icon.png"
    );

    await expect(readFile(publishedPath, "utf8")).resolves.toBe("icon-binary");
  });
});

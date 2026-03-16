import { join } from "node:path";

export const sklandCrawlerConfig = {
  defaultTypeMainId: "1",
  defaultTypeSubId: "5",
  minDelayMs: 1500,
  maxJitterMs: 1000,
  retryLimit: 3,
  requestTimeoutMs: 30_000,
  imageByteLimit: 8 * 1024 * 1024,
  paths(rootDir: string) {
    const gameDataDir = join(rootDir, "game-data");
    const cacheDir = join(gameDataDir, ".cache", "skland");
    return {
      gameDataDir,
      cacheDir,
      detailCacheDir: join(cacheDir, "details"),
      assetDir: join(gameDataDir, "assets", "skland", "items"),
      summaryPath: join(cacheDir, "skland-run-summary.json")
    };
  }
} as const;

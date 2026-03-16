import { readFile } from "node:fs/promises";
import { discoverEquipmentItems } from "./discover";
import { loadDetailRecord } from "./details";
import { buildPlannerId } from "./id";
import { mirrorDetailAssets } from "./images";
import { resolveSubtype } from "./manualMappings";
import { normalizeEquipmentRecord } from "./normalize";
import { sklandCrawlerConfig } from "./config";
import type { CrawlerRunSummary, SklandDetailRecord, SklandDiscoveryRecord } from "./types";
import { writeJsonIfChanged } from "./writeOutputs";

type PipelineClient = {
  getItemList(input: { typeMainId: string; typeSubId: string }): Promise<SklandDiscoveryRecord[]>;
  getCatalog(input: { typeMainId: string; typeSubId: string }): Promise<SklandDiscoveryRecord[]>;
  getItemInfo(input: { sourceItemId: string }): Promise<SklandDetailRecord>;
  downloadAsset(url: string): Promise<{ body: Buffer; mimeType: string }>;
};

async function readExistingArray(filePath: string) {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function runSklandEquipmentCrawler(input: {
  client: PipelineClient;
  rootDir: string;
  typeMainId: string;
  typeSubId: string;
  resume: boolean;
  startedAt: string;
}) {
  const paths = sklandCrawlerConfig.paths(input.rootDir);
  const discoveries = await discoverEquipmentItems({
    client: input.client,
    typeMainId: input.typeMainId,
    typeSubId: input.typeSubId
  });

  const placeableItems = [];
  let fetchedDetails = 0;
  let downloadedAssets = 0;

  for (const discovery of discoveries) {
    const detailResult = await loadDetailRecord({
      client: input.client,
      discovery,
      detailCacheDir: paths.detailCacheDir,
      resume: input.resume
    });

    if (!detailResult.fromCache) {
      fetchedDetails += 1;
    }

    const plannerId = buildPlannerId({
      subtype: resolveSubtype(discovery.sourceItemId),
      sourceItemId: discovery.sourceItemId
    });
    const mirroredAssets = await mirrorDetailAssets({
      client: input.client,
      rootDir: input.rootDir,
      assetDir: paths.assetDir,
      plannerId,
      detail: detailResult.record,
      resume: input.resume
    });

    downloadedAssets += mirroredAssets.downloadedCount;

    placeableItems.push(
      normalizeEquipmentRecord({
        discovery,
        detail: detailResult.record,
        downloadedAssets: mirroredAssets.assets
      }).placeable
    );
  }

  const existingResources = await readExistingArray(`${paths.gameDataDir}/resources.json`);
  const existingRecipes = await readExistingArray(`${paths.gameDataDir}/recipes.json`);
  const existingMachineModes = await readExistingArray(`${paths.gameDataDir}/machine-modes.json`);
  const existingSiteFixtures = await readExistingArray(`${paths.gameDataDir}/site-fixtures.json`);
  const existingSitePresets = await readExistingArray(`${paths.gameDataDir}/site-presets.json`);
  const existingRuleFragments = await readExistingArray(`${paths.gameDataDir}/rule-fragments.json`);

  await Promise.all([
    writeJsonIfChanged(`${paths.gameDataDir}/placeable-items.json`, placeableItems),
    writeJsonIfChanged(`${paths.gameDataDir}/resources.json`, existingResources),
    writeJsonIfChanged(`${paths.gameDataDir}/recipes.json`, existingRecipes),
    writeJsonIfChanged(`${paths.gameDataDir}/machine-modes.json`, existingMachineModes),
    writeJsonIfChanged(`${paths.gameDataDir}/site-fixtures.json`, existingSiteFixtures),
    writeJsonIfChanged(`${paths.gameDataDir}/site-presets.json`, existingSitePresets),
    writeJsonIfChanged(`${paths.gameDataDir}/rule-fragments.json`, existingRuleFragments)
  ]);

  const summary: CrawlerRunSummary = {
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    discoveredItems: discoveries.length,
    fetchedDetails,
    downloadedAssets,
    warnings: []
  };

  await writeJsonIfChanged(paths.summaryPath, summary);
  return summary;
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SklandDetailRecord, SklandDiscoveryRecord } from "./types";

export type DetailClient = {
  getItemInfo(input: {
    sourceItemId: string;
    typeMainId?: string;
    typeSubId?: string;
  }): Promise<SklandDetailRecord>;
};

async function readCachedDetail(filePath: string) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as SklandDetailRecord;
  } catch {
    return undefined;
  }
}

export async function loadDetailRecord(input: {
  client: DetailClient;
  discovery: SklandDiscoveryRecord;
  detailCacheDir: string;
  resume: boolean;
}) {
  const cachePath = join(input.detailCacheDir, `${input.discovery.sourceItemId}.json`);

  if (input.resume) {
    const cached = await readCachedDetail(cachePath);
    if (cached) {
      return {
        record: cached,
        fromCache: true
      };
    }
  }

  const record = await input.client.getItemInfo({
    sourceItemId: input.discovery.sourceItemId,
    typeMainId: input.discovery.typeMainId,
    typeSubId: input.discovery.typeSubId
  });

  await mkdir(input.detailCacheDir, { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  return {
    record,
    fromCache: false
  };
}

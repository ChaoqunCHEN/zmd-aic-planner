import type { AssetRef, PlaceableItem } from "../../src/domain/types";

export type SklandSessionContext = {
  userAgent: string;
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
  headers: Record<string, string>;
};

export type SklandDiscoveryRecord = {
  sourceItemId: string;
  typeMainId: string;
  typeSubId: string;
  nameZhHans: string;
  categoryName?: string;
  subCategoryName?: string;
  iconUrl?: string;
};

export type SklandDetailRecord = {
  sourceItemId: string;
  nameZhHans: string;
  descriptionZhHans?: string;
  iconUrl?: string;
  illustrationUrl?: string;
  typeMainId: string;
  typeSubId: string;
  raw: unknown;
};

export type DownloadedAsset = Required<Pick<AssetRef, "kind" | "path" | "sourceUrl" | "mimeType" | "sha256">> & {
  alt?: string;
};

export type NormalizedAssetDownload = DownloadedAsset;

export type CrawlerRunSummary = {
  startedAt: string;
  finishedAt?: string;
  discoveredItems: number;
  fetchedDetails: number;
  downloadedAssets: number;
  warnings: string[];
};

export type NormalizedEquipmentRecord = {
  placeable: PlaceableItem;
};

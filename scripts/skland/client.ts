import { sklandCrawlerConfig } from "./config";
import { RequestScheduler } from "./scheduler";
import type {
  SklandDetailRecord,
  SklandDiscoveryRecord,
  SklandSessionContext
} from "./types";
import type { APIRequestContext, Page, Response } from "@playwright/test";

const ZONAI_BASE_URL = "https://zonai.skland.com";
const WIKI_BASE_URL = "https://wiki.skland.com";

function asRecord(input: unknown): Record<string, unknown> | undefined {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : undefined;
}

function findFirstArray(input: unknown): unknown[] | undefined {
  if (Array.isArray(input)) {
    return input;
  }

  const record = asRecord(input);
  if (!record) {
    return undefined;
  }

  for (const key of ["catalog", "list", "items", "rows"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    const nested = findFirstArray(value);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function collectCatalogEntries(input: unknown): Array<{
  item: Record<string, unknown>;
  typeMainId?: string;
  typeSubId?: string;
  categoryName?: string;
  subCategoryName?: string;
}> {
  const record = asRecord(input);
  if (!record) {
    return [];
  }

  const directItems = Array.isArray(record.items)
    ? record.items
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => Boolean(entry))
        .map((item) => ({
          item,
          typeMainId: pickString(record, ["id", "typeMainId", "mainTypeId"]),
          typeSubId: pickString(record, ["id", "typeSubId", "subTypeId"]),
          categoryName: pickString(record, ["name", "typeMainName", "mainTypeName"]),
          subCategoryName: pickString(record, ["name", "typeSubName", "subTypeName"])
        }))
    : [];

  const nestedTypeSubs = Array.isArray(record.typeSub)
    ? record.typeSub.flatMap((entry) => {
        const subType = asRecord(entry);
        if (!subType) {
          return [];
        }

        return collectCatalogEntries({
          ...subType,
          typeMainId:
            pickString(subType, ["fatherTypeId", "typeMainId", "mainTypeId"]) ??
            pickString(record, ["id", "typeMainId", "mainTypeId"]),
          categoryName:
            pickString(record, ["name", "typeMainName", "mainTypeName"]) ??
            pickString(subType, ["fatherTypeName"])
        });
      })
    : [];

  const nestedCatalog = Array.isArray(record.catalog)
    ? record.catalog.flatMap((entry) => collectCatalogEntries(entry))
    : [];

  return [...directItems, ...nestedTypeSubs, ...nestedCatalog];
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

export function unwrapSklandData(input: unknown) {
  const payload = asRecord(input);
  if (!payload) {
    return input;
  }

  const code = payload.code;
  if (typeof code === "number" && code !== 0) {
    const message = typeof payload.message === "string" ? payload.message : "Unexpected Skland error";
    throw new Error(message);
  }

  return "data" in payload ? payload.data : input;
}

export function extractDiscoveryRecords(input: unknown): SklandDiscoveryRecord[] {
  const catalogEntries = collectCatalogEntries(input);
  if (catalogEntries.length > 0) {
    const discovered: Array<SklandDiscoveryRecord | undefined> = catalogEntries.map(
      ({ item, typeMainId, typeSubId, categoryName, subCategoryName }) => {
        const brief = asRecord(item.brief);
        const sourceItemId = pickString(item, ["itemId", "id", "value"]);
        const nameZhHans =
          pickString(item, ["name", "title", "itemName"]) ?? pickString(brief ?? {}, ["name"]);

        if (!sourceItemId || !nameZhHans) {
          return undefined;
        }

        return {
          sourceItemId,
          nameZhHans,
          iconUrl:
            pickString(item, ["icon", "image", "cover", "listImage"]) ??
            pickString(brief ?? {}, ["cover", "icon", "image"]),
          typeMainId: typeMainId ?? "",
          typeSubId: typeSubId ?? "",
          categoryName,
          subCategoryName
        };
      }
    );

    return discovered.filter((record): record is SklandDiscoveryRecord => record !== undefined);
  }

  const items = findFirstArray(input) ?? [];
  const discovered: Array<SklandDiscoveryRecord | undefined> = items.map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return undefined;
      }

      const type = asRecord(record.type);
      const sourceItemId =
        pickString(record, ["id", "itemId", "value"]) ??
        pickString(type ?? {}, ["id"]);
      const nameZhHans = pickString(record, ["name", "title", "itemName"]);

      if (!sourceItemId || !nameZhHans) {
        return undefined;
      }

      return {
        sourceItemId,
        nameZhHans,
        iconUrl: pickString(record, ["icon", "image", "cover", "listImage"]),
        typeMainId:
          pickString(record, ["typeMainId", "mainTypeId"]) ??
          pickString(type ?? {}, ["mainId"]) ??
          "",
        typeSubId:
          pickString(record, ["typeSubId", "subTypeId"]) ??
          pickString(type ?? {}, ["subId"]) ??
          "",
        categoryName:
          pickString(record, ["typeMainName", "mainTypeName"]) ??
          pickString(type ?? {}, ["mainName"]),
        subCategoryName:
          pickString(record, ["typeSubName", "subTypeName"]) ??
          pickString(type ?? {}, ["subName"])
      };
    });

  return discovered.filter((record): record is SklandDiscoveryRecord => record !== undefined);
}

export function extractDetailRecord(
  input: unknown,
  fallback: { sourceItemId: string; typeMainId: string; typeSubId: string }
): SklandDetailRecord {
  const root = asRecord(input) ?? {};
  const item = asRecord(root.item) ?? root;
  const brief = asRecord(item.brief);

  return {
    sourceItemId: fallback.sourceItemId,
    nameZhHans: pickString(item, ["name", "title", "itemName"]) ?? fallback.sourceItemId,
    descriptionZhHans: pickString(item, ["desc", "description", "content"]),
    iconUrl:
      pickString(item, ["icon", "image", "avatar"]) ??
      pickString(brief ?? {}, ["cover", "icon", "image"]),
    illustrationUrl: pickString(item, ["illustration", "card", "cover", "largeImage"]),
    typeMainId: fallback.typeMainId,
    typeSubId: fallback.typeSubId,
    raw: input
  };
}

export class PlaywrightSklandClient {
  private readonly scheduler: RequestScheduler;
  private readonly request: APIRequestContext;
  private readonly headers: Record<string, string>;
  private readonly page?: Page;

  constructor(input: {
    request: APIRequestContext;
    sessionContext: SklandSessionContext;
    page?: Page;
    scheduler?: RequestScheduler;
  }) {
    this.request = input.request;
    this.headers = input.sessionContext.headers;
    this.page = input.page;
    this.scheduler =
      input.scheduler ??
      new RequestScheduler({
        minDelayMs: sklandCrawlerConfig.minDelayMs,
        maxJitterMs: sklandCrawlerConfig.maxJitterMs
      });
  }

  private async getJsonFromPage(input: {
    pageUrl: string;
    responsePath: string;
    responseQuery?: Record<string, string>;
  }) {
    if (!this.page) {
      return undefined;
    }

    return this.scheduler.run(async () => {
      const expectedUrl = new URL(input.responsePath, ZONAI_BASE_URL);
      Object.entries(input.responseQuery ?? {}).forEach(([key, value]) =>
        expectedUrl.searchParams.set(key, value)
      );

      const responsePromise = this.page!.waitForResponse(
        (response: Response) =>
          response.status() === 200 && response.url() === expectedUrl.toString(),
        {
          timeout: sklandCrawlerConfig.requestTimeoutMs
        }
      );

      await this.page!.goto(input.pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: sklandCrawlerConfig.requestTimeoutMs
      });

      const response = await responsePromise;
      return unwrapSklandData((await response.json()) as unknown);
    });
  }

  private async getJson(path: string, params: Record<string, string>) {
    return this.scheduler.run(async () => {
      const url = new URL(path, ZONAI_BASE_URL);
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await this.request.get(url.toString(), {
        headers: this.headers,
        timeout: sklandCrawlerConfig.requestTimeoutMs
      });
      const payload = (await response.json()) as unknown;

      try {
        return unwrapSklandData(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("请求异常")) {
          throw this.scheduler.createGuardedSourceError(message);
        }

        throw error;
      }
    });
  }

  async getCatalog(input: {
    typeMainId: string;
    typeSubId: string;
  }): Promise<SklandDiscoveryRecord[]> {
    const pagePayload = await this.getJsonFromPage({
      pageUrl: `${WIKI_BASE_URL}/endfield/catalog?typeMainId=${input.typeMainId}&typeSubId=${input.typeSubId}`,
      responsePath: "/web/v1/wiki/item/catalog",
      responseQuery: input
    });
    const payload = pagePayload ?? (await this.getJson("/web/v1/wiki/item/catalog", input));
    return extractDiscoveryRecords(payload);
  }

  async getItemList(input: {
    typeMainId: string;
    typeSubId: string;
  }): Promise<SklandDiscoveryRecord[]> {
    if (this.page) {
      return [];
    }

    const payload = await this.getJson("/web/v1/wiki/item/list", input);
    return extractDiscoveryRecords(payload);
  }

  async getItemInfo(input: {
    sourceItemId: string;
    typeMainId?: string;
    typeSubId?: string;
  }): Promise<SklandDetailRecord> {
    const pagePayload = await this.getJsonFromPage({
      pageUrl:
        `${WIKI_BASE_URL}/endfield/detail?mainTypeId=${input.typeMainId ?? ""}` +
        `&subTypeId=${input.typeSubId ?? ""}&gameEntryId=${input.sourceItemId}`,
      responsePath: "/web/v1/wiki/item/info",
      responseQuery: {
        id: input.sourceItemId
      }
    });
    const payload =
      pagePayload ??
      (await this.getJson("/web/v1/wiki/item/info", {
        id: input.sourceItemId
      }));

    return extractDetailRecord(payload, {
      sourceItemId: input.sourceItemId,
      typeMainId: input.typeMainId ?? "",
      typeSubId: input.typeSubId ?? ""
    });
  }

  async downloadAsset(url: string) {
    return this.scheduler.run(async () => {
      const response = await this.request.get(url, {
        headers: {
          Referer: "https://wiki.skland.com/",
          "User-Agent": this.headers["User-Agent"] ?? "Mozilla/5.0"
        },
        timeout: sklandCrawlerConfig.requestTimeoutMs
      });

      return {
        body: Buffer.from(await response.body()),
        mimeType: response.headers()["content-type"]?.split(";")[0] ?? "application/octet-stream"
      };
    });
  }
}

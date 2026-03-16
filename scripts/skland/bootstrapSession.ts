import { chromium } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { sklandCrawlerConfig } from "./config";
import type { SklandSessionContext } from "./types";

const CATALOG_URL = "https://wiki.skland.com/endfield/catalog";

export type BootstrappedSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  request: APIRequestContext;
  sessionContext: SklandSessionContext;
  dispose: () => Promise<void>;
};

export async function bootstrapSklandSession(input?: {
  typeMainId?: string;
  typeSubId?: string;
  headless?: boolean;
  timeoutMs?: number;
}): Promise<BootstrappedSession> {
  const typeMainId = input?.typeMainId ?? sklandCrawlerConfig.defaultTypeMainId;
  const typeSubId = input?.typeSubId ?? sklandCrawlerConfig.defaultTypeSubId;
  const browser = await chromium.launch({
    headless: input?.headless ?? true
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const userAgent = await page.evaluate(() => navigator.userAgent);
  const url = new URL(CATALOG_URL);
  url.searchParams.set("typeMainId", typeMainId);
  url.searchParams.set("typeSubId", typeSubId);

  await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: input?.timeoutMs ?? sklandCrawlerConfig.requestTimeoutMs
  });
  await page.waitForTimeout(2_000);

  const sessionContext: SklandSessionContext = {
    userAgent,
    cookies: await context.cookies(),
    headers: {
      Accept: "application/json, text/plain, */*",
      Origin: "https://wiki.skland.com",
      Referer: url.toString(),
      "User-Agent": userAgent
    }
  };

  return {
    browser,
    context,
    page,
    request: context.request,
    sessionContext,
    dispose: async () => {
      await context.close();
      await browser.close();
    }
  };
}

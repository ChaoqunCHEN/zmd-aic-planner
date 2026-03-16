import { chromium } from "@playwright/test";
import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import { sklandCrawlerConfig } from "./config";
import type { SklandSessionContext } from "./types";

const CATALOG_URL = "https://wiki.skland.com/endfield/catalog";
const REAL_CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

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
  const context = await browser.newContext({
    userAgent: REAL_CHROME_USER_AGENT,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: {
      width: 1440,
      height: 900
    },
    extraHTTPHeaders: {
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
  });
  const page = await context.newPage();
  const userAgent = REAL_CHROME_USER_AGENT;
  const url = new URL(CATALOG_URL);
  url.searchParams.set("typeMainId", typeMainId);
  url.searchParams.set("typeSubId", typeSubId);

  await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: input?.timeoutMs ?? sklandCrawlerConfig.requestTimeoutMs
  });
  await page.waitForTimeout(3_000);

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

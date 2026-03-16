import type { BrowserContext, Page } from "@playwright/test";

export async function resetStorage(page: Page, context: BrowserContext) {
  await context.clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

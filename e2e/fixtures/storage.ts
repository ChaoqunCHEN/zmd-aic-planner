import type { BrowserContext, Page } from "@playwright/test";

export async function resetStorage(page: Page, context: BrowserContext) {
  await context.clearCookies();
  await page.addInitScript(() => {
    const resetKey = "__aic_storage_reset__";

    if (!window.sessionStorage.getItem(resetKey)) {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.sessionStorage.setItem(resetKey, "done");
    }
  });
}

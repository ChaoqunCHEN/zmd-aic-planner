import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("keeps the reference pane and inspector synchronized with selection and search", async ({
  page,
  context
}) => {
  await gotoReadyApp(page, context);

  await page.getByTestId("reference-search-input").fill("Survey Annex");
  await expect(page.getByText("测绘附属区", { exact: true })).toBeVisible();

  await page.getByTestId("reference-search-input").fill("Survey Annex Iron Ore Intake Cap");
  await expect(page.getByText("测绘附属区铁矿输入上限")).toBeVisible();

  await page.getByTestId("reference-search-input").fill("物品准入口");
  await expect(page.getByTestId("reference-pane")).toContainText("仅参考");
  await expect(page.getByTestId("reference-pane")).toContainText(
    "缺少占地或端口校验数据，暂时仅供浏览参考。"
  );

  await page.getByTestId("reference-search-input").fill("");
  await page.getByTestId("catalog-item:machine.basic-smelter").click();
  await page.getByTestId("grid-cell:2:4").click();

  const smelterNode = page.getByTestId(/plan-node:node-/).nth(0);
  await smelterNode.click();
  await expect(page.getByTestId("selection-inspector")).toContainText("基础冶炼炉");
  await expect(page.getByTestId("selection-inspector")).toContainText("占地 2 x 2");
  await expect(page.getByTestId("reference-pane")).toContainText("配方流向：铁矿石 -> 铁锭");

  await page.getByTestId("node-mode-select").selectOption("mode.basic-smelter.efficient");
  await expect(page.getByTestId("selection-inspector")).toContainText("节能燃烧");
  await expect(page.getByTestId("reference-pane")).toContainText("来源可信度：probable");
  await expect(page.getByTestId("reference-pane")).toContainText("产能倍率：0.75x");

  await page.getByTestId("diagnostic-item:connection.disconnected-input").click();
  await expect(page.getByTestId("reference-pane")).toContainText("基础冶炼炉");
});

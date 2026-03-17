import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App task 8 flows", () => {
  it("opens project creation controls and keeps import plus recent-project affordances visible", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByTestId("planner-workspace");
    expect(screen.getByTestId("recent-projects-list")).toBeVisible();
    expect(screen.getByTestId("import-project-input")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-tab:machines")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("catalog-type-filter:all")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("site-overlay-layer")).toBeVisible();

    await user.click(screen.getByTestId("new-project-button"));
    expect(screen.getByTestId("site-preset-select")).toBeVisible();
  });

  it("surfaces mode and external-cap editors after selecting a machine", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByTestId("planner-workspace");
    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.click(screen.getByTestId("grid-cell:2:4"));

    const placedNode = await screen.findByTestId(/plan-node:node-/);
    await user.click(placedNode);

    await waitFor(() => {
      expect(screen.getByTestId("node-mode-select")).toBeVisible();
      expect(screen.getByTestId("input-cap-editor")).toBeVisible();
    });
  });

  it("keeps reference-only catalog entries visible with in-game type and disabled rationale", async () => {
    render(<App />);

    await screen.findByTestId("planner-workspace");
    expect(screen.getByTestId("catalog-item:machine.skland-166")).toBeDisabled();
    expect(screen.getByTestId("catalog-item-type:machine.skland-166")).toHaveTextContent(
      "资源开采"
    );
    expect(
      screen.getByTestId("catalog-item-state-reason:machine.skland-166")
    ).toHaveTextContent("缺少占地/端口校验");
  });

  it("surfaces canonical site, rule, mode, recipe, and provenance details in the reference pane", async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByTestId("planner-workspace");
    await user.type(screen.getByTestId("reference-search-input"), "Survey Annex");
    expect(screen.getByText("测绘附属区")).toBeVisible();

    await user.clear(screen.getByTestId("reference-search-input"));
    await user.type(
      screen.getByTestId("reference-search-input"),
      "Survey Annex Iron Ore Intake Cap"
    );
    expect(screen.getByText("测绘附属区铁矿输入上限")).toBeVisible();

    await user.clear(screen.getByTestId("reference-search-input"));
    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.click(screen.getByTestId("grid-cell:2:4"));

    const placedNode = await screen.findByTestId(/plan-node:node-/);
    await user.click(placedNode);
    await user.selectOptions(screen.getByTestId("node-mode-select"), "mode.basic-smelter.efficient");

    await waitFor(() => {
      const referencePane = screen.getByTestId("reference-pane");

      expect(within(referencePane).getByText("配方流向：铁矿石 -> 铁锭")).toBeVisible();
      expect(within(referencePane).getByText(/来源可信度：probable/i)).toBeVisible();
      expect(within(referencePane).getByText(/产能倍率：0.75x/i)).toBeVisible();
    });
  });
});

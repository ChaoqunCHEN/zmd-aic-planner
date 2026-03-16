import { render, screen, waitFor } from "@testing-library/react";
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
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App shell smoke", () => {
  it("renders the planner shell and empty workbench frame", () => {
    render(<App />);

    expect(screen.getByTestId("app-shell")).toBeVisible();
    expect(screen.getByTestId("empty-workbench")).toBeVisible();
  });

  it("shows unofficial labeling for the product", () => {
    render(<App />);

    expect(screen.getByText(/unofficial/i)).toBeVisible();
  });
});

describe("package scripts", () => {
  it("wires the required production and test commands", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      build: expect.stringContaining("vite build"),
      test: expect.any(String),
      "test:e2e:smoke": expect.any(String),
      typecheck: expect.any(String)
    });
  });
});

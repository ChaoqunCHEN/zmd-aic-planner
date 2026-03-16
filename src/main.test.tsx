import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.resetModules();
  document.body.innerHTML = "";
});

it("boots the app into the root element", async () => {
  document.body.innerHTML = '<div id="root"></div>';

  await act(async () => {
    await import("./main");
  });

  expect(screen.getByTestId("app-shell")).toBeVisible();
});

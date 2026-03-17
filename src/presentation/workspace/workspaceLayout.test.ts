import { describe, expect, it } from "vitest";
import { resolveIconSource } from "./workspaceLayout";

describe("resolveIconSource", () => {
  it("keeps planner asset refs on the public-served game-data path", () => {
    expect(
      resolveIconSource({
        kind: "icon",
        path: "game-data/assets/skland/items/machine.skland-166/icon.png"
      })
    ).toBe("/game-data/assets/skland/items/machine.skland-166/icon.png");
  });

  it("prefers direct URLs when the asset ref points to a remote source", () => {
    expect(
      resolveIconSource({
        kind: "icon",
        path: "game-data/assets/skland/items/machine.skland-166/icon.png",
        url: "https://example.com/icon.png"
      })
    ).toBe("https://example.com/icon.png");
  });
});

// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildEnglishFallbackName, buildPlannerId } from "../id";

describe("buildPlannerId", () => {
  it("creates deterministic planner ids from subtype and source item ids", () => {
    expect(
      buildPlannerId({
        subtype: "machine",
        sourceItemId: "12345"
      })
    ).toBe("machine.skland-12345");
  });
});

describe("buildEnglishFallbackName", () => {
  it("uses manual mapping when available and falls back to a stable placeholder otherwise", () => {
    expect(
      buildEnglishFallbackName({
        sourceItemId: "12345",
        zhName: "抽水机"
      })
    ).toBe("Extractor Pump");

    expect(
      buildEnglishFallbackName({
        sourceItemId: "99999",
        zhName: "未知设备"
      })
    ).toBe("Skland Equipment 99999");
  });
});

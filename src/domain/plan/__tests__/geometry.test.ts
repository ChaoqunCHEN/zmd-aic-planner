import { describe, expect, it } from "vitest";
import { type PlanNode } from "../document";
import { getNodeOccupiedCells, rotatePortSide } from "../geometry";

describe("plan geometry helpers", () => {
  it("computes occupied cells from rotated footprints", () => {
    const node: PlanNode = {
      id: "node-rect",
      catalogId: "machine.test-rect",
      kind: "machine",
      position: { x: 3, y: 2 },
      footprint: { width: 2, height: 1 },
      rotation: 90,
      settings: {}
    };

    expect(getNodeOccupiedCells(node)).toEqual([
      { x: 3, y: 2 },
      { x: 3, y: 3 }
    ]);
  });

  it("rotates sided-port metadata with node rotation", () => {
    expect(rotatePortSide("west", 0)).toBe("west");
    expect(rotatePortSide("west", 90)).toBe("north");
    expect(rotatePortSide("west", 180)).toBe("east");
    expect(rotatePortSide("west", 270)).toBe("south");
    expect(rotatePortSide("center", 90)).toBe("center");
  });
});

import type { PortDefinition, PortSide, SitePreset } from "../types";
import type { GridPoint, GridSize, PlanNode, Rotation } from "./document";

export type GridRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function normalizeRotation(rotation: number | undefined): Rotation {
  const normalized = (((rotation ?? 0) % 360) + 360) % 360;

  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }

  throw new Error(`Unsupported rotation "${rotation}"`);
}

export function getRotatedFootprintSize(
  footprint: GridSize,
  rotation: Rotation
): GridSize {
  if (rotation === 90 || rotation === 270) {
    return {
      width: footprint.height,
      height: footprint.width
    };
  }

  return { ...footprint };
}

export function getNodeFootprintSize(node: Pick<PlanNode, "footprint" | "rotation">): GridSize {
  return getRotatedFootprintSize(node.footprint, node.rotation);
}

export function getNodeRect(
  node: Pick<PlanNode, "position" | "footprint" | "rotation">
): GridRect {
  const size = getNodeFootprintSize(node);

  return {
    x: node.position.x,
    y: node.position.y,
    width: size.width,
    height: size.height
  };
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isRectWithinSite(rect: GridRect, sitePreset: SitePreset): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= sitePreset.width &&
    rect.y + rect.height <= sitePreset.height
  );
}

export function isRectInBuildableZone(rect: GridRect, sitePreset: SitePreset): boolean {
  return sitePreset.buildableZones.some((zone) => {
    return (
      rect.x >= zone.x &&
      rect.y >= zone.y &&
      rect.x + rect.width <= zone.x + zone.width &&
      rect.y + rect.height <= zone.y + zone.height
    );
  });
}

export function findBlockedZoneOverlap(rect: GridRect, sitePreset: SitePreset): GridRect | null {
  return (
    sitePreset.blockedZones.find((zone) => rectsOverlap(rect, zone)) ?? null
  );
}

export function pointKey(point: GridPoint): string {
  return `${point.x}:${point.y}`;
}

export function getNodeOccupiedCells(
  node: Pick<PlanNode, "position" | "footprint" | "rotation">
): GridPoint[] {
  const rect = getNodeRect(node);
  const occupied: GridPoint[] = [];

  for (let x = rect.x; x < rect.x + rect.width; x += 1) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      occupied.push({ x, y });
    }
  }

  return occupied;
}

const CARDINAL_SIDES: readonly PortSide[] = ["north", "east", "south", "west", "center"];

export function rotatePortSide(side: PortSide, rotation: Rotation): PortSide {
  if (side === "center") {
    return "center";
  }

  const index = CARDINAL_SIDES.indexOf(side);
  const clockwiseSteps = rotation / 90;

  if (index < 0 || index > 3) {
    return side;
  }

  return CARDINAL_SIDES[(index + clockwiseSteps) % 4]!;
}

export function getNodePortSide(
  node: Pick<PlanNode, "rotation">,
  port: Pick<PortDefinition, "side">
): PortSide {
  return rotatePortSide(port.side, node.rotation);
}

type TouchingSides = {
  sourceSide: PortSide;
  targetSide: PortSide;
};

function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > 0;
}

export function getTouchingSides(
  source: Pick<PlanNode, "position" | "footprint" | "rotation">,
  target: Pick<PlanNode, "position" | "footprint" | "rotation">
): TouchingSides | null {
  const sourceRect = getNodeRect(source);
  const targetRect = getNodeRect(target);

  const sourceBottom = sourceRect.y + sourceRect.height;
  const targetBottom = targetRect.y + targetRect.height;
  const sourceRight = sourceRect.x + sourceRect.width;
  const targetRight = targetRect.x + targetRect.width;

  if (
    sourceRight === targetRect.x &&
    spansOverlap(sourceRect.y, sourceBottom, targetRect.y, targetBottom)
  ) {
    return { sourceSide: "east", targetSide: "west" };
  }

  if (
    targetRight === sourceRect.x &&
    spansOverlap(sourceRect.y, sourceBottom, targetRect.y, targetBottom)
  ) {
    return { sourceSide: "west", targetSide: "east" };
  }

  if (
    sourceBottom === targetRect.y &&
    spansOverlap(sourceRect.x, sourceRight, targetRect.x, targetRight)
  ) {
    return { sourceSide: "south", targetSide: "north" };
  }

  if (
    targetBottom === sourceRect.y &&
    spansOverlap(sourceRect.x, sourceRight, targetRect.x, targetRight)
  ) {
    return { sourceSide: "north", targetSide: "south" };
  }

  return null;
}

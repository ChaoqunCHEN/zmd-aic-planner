import type { SitePreset } from "../types";
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

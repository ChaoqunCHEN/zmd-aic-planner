import { getNodePortSide, getRotatedFootprintSize } from "../../domain/plan/geometry";
import type { GridPoint, GridSize, PlanNode } from "../../domain/plan/document";
import type { AssetRef, PortDefinition, PortSide } from "../../domain/types";

export const GRID_CELL_SIZE = 42;
export const GRID_CELL_GAP = 2;
export const GRID_PADDING = 12;

const GRID_STRIDE = GRID_CELL_SIZE + GRID_CELL_GAP;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSpanFromCells(cells: number) {
  return cells * GRID_CELL_SIZE + Math.max(0, cells - 1) * GRID_CELL_GAP;
}

function normalizeOffset(offset: number) {
  if (!Number.isFinite(offset)) {
    return 0.5;
  }

  return clamp(offset, 0, 1);
}

function sideRotation(side: PortSide) {
  switch (side) {
    case "north":
      return -90;
    case "south":
      return 90;
    case "west":
      return 180;
    case "center":
      return 0;
    case "east":
    default:
      return 0;
  }
}

function getLocalPortOffset(side: PortSide, offset: number, width: number, height: number) {
  const normalizedOffset = normalizeOffset(offset);

  switch (side) {
    case "north":
      return { x: normalizedOffset * width, y: 0 };
    case "east":
      return { x: width, y: normalizedOffset * height };
    case "south":
      return { x: normalizedOffset * width, y: height };
    case "west":
      return { x: 0, y: normalizedOffset * height };
    case "center":
    default:
      return { x: width / 2, y: height / 2 };
  }
}

export function resolveIconSource(icon: AssetRef | undefined) {
  if (!icon) {
    return null;
  }

  if (icon.url) {
    return icon.url;
  }

  if (icon.path) {
    return `/${icon.path.replace(/^\/+/, "")}`;
  }

  return null;
}

export function getCellPixelPosition(position: GridPoint) {
  return {
    left: GRID_PADDING + position.x * GRID_STRIDE,
    top: GRID_PADDING + position.y * GRID_STRIDE
  };
}

export function getFootprintPixelSize(footprint: GridSize) {
  return {
    width: getSpanFromCells(footprint.width),
    height: getSpanFromCells(footprint.height)
  };
}

export function getCanvasPixelSize(size: GridSize) {
  const innerSize = getFootprintPixelSize(size);

  return {
    width: innerSize.width + GRID_PADDING * 2,
    height: innerSize.height + GRID_PADDING * 2
  };
}

export function getNodePixelBounds(
  node: Pick<PlanNode, "position" | "footprint" | "rotation">
) {
  const footprint = getRotatedFootprintSize(node.footprint, node.rotation);
  const position = getCellPixelPosition(node.position);
  const size = getFootprintPixelSize(footprint);

  return {
    left: position.left,
    top: position.top,
    width: size.width,
    height: size.height
  };
}

export function getNodePortAnchor(
  node: Pick<PlanNode, "position" | "footprint" | "rotation">,
  port: Pick<PortDefinition, "side" | "offset">
) {
  const nodeBounds = getNodePixelBounds(node);
  const localAnchor = getNodePortLocalAnchor(node, port);

  return {
    x: nodeBounds.left + localAnchor.x,
    y: nodeBounds.top + localAnchor.y,
    side: localAnchor.side,
    rotation: localAnchor.rotation
  };
}

export function getNodePortLocalAnchor(
  node: Pick<PlanNode, "footprint" | "rotation">,
  port: Pick<PortDefinition, "side" | "offset">
) {
  const footprint = getRotatedFootprintSize(node.footprint, node.rotation);
  const nodeSize = getFootprintPixelSize(footprint);
  const side = getNodePortSide(node, { side: port.side });
  const localOffset = getLocalPortOffset(side, port.offset, nodeSize.width, nodeSize.height);

  return {
    x: localOffset.x,
    y: localOffset.y,
    side,
    rotation: sideRotation(side)
  };
}

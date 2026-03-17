import { getNodePortSide } from "../domain/plan/geometry";
import type { PlanNode } from "../domain/plan/document";
import type {
  AvailabilityStatus,
  CatalogEntity,
  PlaceableItem,
  PlannerCategory,
  PortDefinition,
  PortMediumKind,
  PortSide
} from "../domain/types";

const PLANNER_CATEGORY_LABELS: Record<PlannerCategory, string> = {
  machines: "机器",
  logistics: "物流",
  storage: "仓储",
  utilities: "设施"
};

const PORT_SIDE_LABELS: Record<PortSide, string> = {
  north: "北侧",
  east: "东侧",
  south: "南侧",
  west: "西侧",
  center: "中心"
};

const PORT_MEDIUM_LABELS: Record<PortMediumKind, string> = {
  item: "物品",
  fluid: "流体",
  logistics: "物流"
};

export function getPrimaryName(entity: Pick<CatalogEntity, "nameZhHans" | "name">) {
  return entity.nameZhHans || entity.name;
}

export function getSecondaryName(entity: Pick<CatalogEntity, "nameZhHans" | "name">) {
  const primary = getPrimaryName(entity);
  return entity.name && entity.name !== primary ? entity.name : null;
}

export function getFallbackIconLabel(entity: Pick<CatalogEntity, "nameZhHans" | "name" | "id">) {
  return getPrimaryName(entity).trim().slice(0, 1) || entity.id.slice(0, 1).toUpperCase();
}

export function getAvailabilityLabel(status: AvailabilityStatus) {
  return status === "validated" ? "已验证" : "仅参考";
}

export function getAvailabilityDescription(status: AvailabilityStatus) {
  return status === "validated"
    ? "可以直接放置到网格中。"
    : "缺少占地或端口校验数据，暂时仅供浏览参考。";
}

export function getPlannerCategoryLabel(category: PlannerCategory) {
  return PLANNER_CATEGORY_LABELS[category];
}

export function getPortSideLabel(side: PortSide) {
  return PORT_SIDE_LABELS[side];
}

export function getPortSummary(
  node: Pick<PlanNode, "rotation">,
  port: Pick<PortDefinition, "flow" | "side" | "mediumKind" | "offset">
) {
  const rotatedSide = getNodePortSide(node, port);
  const flowLabel = port.flow === "input" ? "输入" : "输出";
  const mediumLabel = PORT_MEDIUM_LABELS[port.mediumKind];
  const offsetPercent = Math.round(port.offset * 100);

  return `${getPortSideLabel(rotatedSide)} ${flowLabel} (${mediumLabel}, 偏移 ${offsetPercent}%)`;
}

export function buildSearchText(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(" ").toLowerCase();
}

export function getPlaceableReferenceFacts(
  placeable: PlaceableItem,
  node?: Pick<PlanNode, "rotation">
) {
  const facts = [
    `分类：${getPlannerCategoryLabel(placeable.plannerCategory)}`,
    `状态：${getAvailabilityLabel(placeable.availabilityStatus)}`,
    `占地：${placeable.footprint.width} x ${placeable.footprint.height}`
  ];

  if (placeable.sourceCategoryLabel || placeable.sourceSubCategoryLabel) {
    facts.push(
      `来源分类：${[placeable.sourceCategoryLabel, placeable.sourceSubCategoryLabel]
        .filter(Boolean)
        .join(" / ")}`
    );
  }

  if (placeable.ports.length > 0) {
    const portSummaries = placeable.ports.map((port) =>
      getPortSummary(node ?? { rotation: 0 }, port)
    );
    facts.push(`端口：${portSummaries.join("；")}`);
  }

  return facts;
}

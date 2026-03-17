import { getRotatedFootprintSize } from "../../domain/plan/geometry";
import type { Diagnostic } from "../../domain/diagnostics/types";
import type { PlanNode } from "../../domain/plan/document";
import type {
  MachineMode,
  PlaceableItem,
  RecipeItem
} from "../../domain/types";
import {
  getAvailabilityDescription,
  getAvailabilityLabel,
  getFallbackIconLabel,
  getPlaceableReferenceFacts,
  getPrimaryName,
  getSecondaryName
} from "../catalogPresentation";
import { resolveIconSource } from "../workspace/workspaceLayout";
import styles from "./SelectionInspector.module.css";

type ReferenceContext = {
  placeable: PlaceableItem;
  recipe: RecipeItem | null;
  mode: MachineMode | null;
};

type SelectionInspectorProps = {
  selectedNode: PlanNode | null;
  referenceContext: ReferenceContext | null;
  diagnostics: Diagnostic[];
  nodeRate?: number | null;
  modeOptions?: MachineMode[];
  onModeChange?: (modeId: string) => void;
};

export function SelectionInspector({
  selectedNode,
  referenceContext,
  diagnostics,
  nodeRate,
  modeOptions = [],
  onModeChange
}: SelectionInspectorProps) {
  const placeable = referenceContext?.placeable ?? null;
  const iconSource = resolveIconSource(placeable?.icon);
  const primaryName = placeable ? getPrimaryName(placeable) : null;
  const secondaryName = placeable ? getSecondaryName(placeable) : null;
  const modePrimaryName = referenceContext?.mode ? getPrimaryName(referenceContext.mode) : null;
  const modeSecondaryName = referenceContext?.mode
    ? getSecondaryName(referenceContext.mode)
    : null;
  const recipePrimaryName = referenceContext?.recipe
    ? getPrimaryName(referenceContext.recipe)
    : null;
  const recipeSecondaryName = referenceContext?.recipe
    ? getSecondaryName(referenceContext.recipe)
    : null;
  const rotatedFootprint = selectedNode
    ? getRotatedFootprintSize(selectedNode.footprint, selectedNode.rotation)
    : null;
  const placeableFacts =
    placeable && selectedNode ? getPlaceableReferenceFacts(placeable, selectedNode) : [];
  const portSummary = placeableFacts.find((fact) => fact.startsWith("端口："));

  return (
    <section className={styles.panel} data-testid="selection-inspector">
      <h2 className={styles.heading}>Inspector</h2>
      {!selectedNode || !referenceContext ? (
        <p className={styles.empty}>
          选中一个已放置设备后，这里会显示它的图标、占地、朝向、端口方向和局部诊断。
        </p>
      ) : (
        <div className={styles.details}>
          <div className={styles.header}>
            <span className={styles.iconWrap} data-testid="selection-inspector-icon">
              {iconSource ? (
                <img alt="" className={styles.icon} src={iconSource} />
              ) : (
                <span aria-hidden className={styles.fallbackIcon}>
                  {getFallbackIconLabel(referenceContext.placeable)}
                </span>
              )}
            </span>
            <div className={styles.identity}>
              <h3 className={styles.name} data-testid="selection-inspector-name">
                {primaryName}
              </h3>
              {secondaryName ? <p className={styles.subtle}>{secondaryName}</p> : null}
              <div className={styles.badgeRow}>
                <span className={styles.badge}>
                  {getAvailabilityLabel(referenceContext.placeable.availabilityStatus)}
                </span>
                <span className={styles.badge}>
                  {placeableFacts[0]?.replace(/^分类：/, "")}
                </span>
              </div>
            </div>
          </div>
          <p className={styles.meta} data-testid="selection-inspector-placement">
            位置 ({selectedNode.position.x}, {selectedNode.position.y})，当前占地{" "}
            {rotatedFootprint?.width} x {rotatedFootprint?.height}，朝向 {selectedNode.rotation}
            °。
          </p>
          <p className={styles.meta}>
            {getAvailabilityDescription(referenceContext.placeable.availabilityStatus)}
          </p>
          <div className={styles.factGrid}>
            {placeableFacts.slice(1).map((fact) => (
              <p className={styles.fact} key={fact}>
                {fact}
              </p>
            ))}
            <p className={styles.fact}>当前吞吐：{(nodeRate ?? 0).toFixed(2)}/min</p>
          </div>
          {modeOptions.length > 0 ? (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>运行模式</span>
              <select
                className={styles.select}
                data-testid="node-mode-select"
                onChange={(event) => onModeChange?.(event.target.value)}
                value={selectedNode.modeId ?? ""}
              >
                {modeOptions.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {getPrimaryName(mode)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>配方与端口</h4>
            <p className={styles.meta}>
              主配方：{recipePrimaryName ?? "暂无"}
              {recipeSecondaryName ? ` · ${recipeSecondaryName}` : ""}
            </p>
            <p className={styles.meta}>
              当前模式：{modePrimaryName ?? "未选择"}
              {modeSecondaryName ? ` · ${modeSecondaryName}` : ""}
            </p>
            <ul className={styles.list} data-testid="selection-inspector-port-list">
              <li>{portSummary ? portSummary.replace(/^端口：/, "") : "暂无端口数据"}</li>
            </ul>
          </div>
          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>局部诊断</h4>
            {diagnostics.length > 0 ? (
              <ul className={styles.list}>
                {diagnostics.map((diagnostic: Diagnostic) => (
                  <li key={diagnostic.id}>{diagnostic.message}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.meta}>当前节点没有局部诊断。</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

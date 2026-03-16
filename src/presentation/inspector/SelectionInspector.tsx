import type { Diagnostic } from "../../domain/diagnostics/types";
import type { PlanNode } from "../../domain/plan/document";
import type {
  MachineMode,
  PlaceableItem,
  RecipeItem
} from "../../domain/types";
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
};

export function SelectionInspector({
  selectedNode,
  referenceContext,
  diagnostics
}: SelectionInspectorProps) {
  return (
    <section className={styles.panel} data-testid="selection-inspector">
      <h2 className={styles.heading}>Inspector</h2>
      {!selectedNode || !referenceContext ? (
        <p className={styles.empty}>
          Select a placed node to inspect its footprint, active mode, and local
          diagnostics.
        </p>
      ) : (
        <div className={styles.details}>
          <h3 className={styles.name}>{referenceContext.placeable.name}</h3>
          <p className={styles.meta}>
            Node <strong>{selectedNode.id}</strong> at ({selectedNode.position.x},{" "}
            {selectedNode.position.y}) with rotation {selectedNode.rotation}
            deg.
          </p>
          <p className={styles.meta}>
            Active mode: {referenceContext.mode?.name ?? "Not selected"}
          </p>
          <p className={styles.meta}>
            Primary recipe: {referenceContext.recipe?.name ?? "No recipe data"}
          </p>
          <ul className={styles.list}>
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic.id}>{diagnostic.message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

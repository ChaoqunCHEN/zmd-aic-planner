import {
  GRID_CELL_GAP,
  GRID_CELL_SIZE
} from "./GridLayer";
import styles from "./PlacementGhost.module.css";

type PlacementGhostProps = {
  position: { x: number; y: number };
  footprint: { width: number; height: number };
  valid: boolean;
};

export function PlacementGhost({ position, footprint, valid }: PlacementGhostProps) {
  return (
    <div
      className={`${styles.ghost} ${valid ? styles.valid : styles.invalid}`}
      data-testid="placement-ghost"
      data-state={valid ? "valid" : "invalid"}
      style={{
        left: position.x * (GRID_CELL_SIZE + GRID_CELL_GAP),
        top: position.y * (GRID_CELL_SIZE + GRID_CELL_GAP),
        width: footprint.width * GRID_CELL_SIZE + (footprint.width - 1) * GRID_CELL_GAP,
        height: footprint.height * GRID_CELL_SIZE + (footprint.height - 1) * GRID_CELL_GAP
      }}
    />
  );
}

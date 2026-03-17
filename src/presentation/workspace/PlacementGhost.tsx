import { getCellPixelPosition, getFootprintPixelSize } from "./workspaceLayout";
import styles from "./PlacementGhost.module.css";

type PlacementGhostProps = {
  position: { x: number; y: number };
  footprint: { width: number; height: number };
  valid: boolean;
};

export function PlacementGhost({ position, footprint, valid }: PlacementGhostProps) {
  const cellPosition = getCellPixelPosition(position);
  const footprintSize = getFootprintPixelSize(footprint);

  return (
    <div
      className={`${styles.ghost} ${valid ? styles.valid : styles.invalid}`}
      data-testid="placement-ghost"
      data-state={valid ? "valid" : "invalid"}
      style={{
        left: cellPosition.left,
        top: cellPosition.top,
        width: footprintSize.width,
        height: footprintSize.height
      }}
    />
  );
}

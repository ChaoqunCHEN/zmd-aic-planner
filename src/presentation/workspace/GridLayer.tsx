import styles from "./GridLayer.module.css";
import {
  getCanvasPixelSize,
  GRID_CELL_GAP,
  GRID_CELL_SIZE,
  GRID_PADDING
} from "./workspaceLayout";

type GridLayerProps = {
  width: number;
  height: number;
  blockedCells: Set<string>;
  onCellHover: (x: number, y: number) => void;
  onCellLeave: () => void;
  onCellClick: (x: number, y: number) => void;
};

export function cellKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function GridLayer({
  width,
  height,
  blockedCells,
  onCellHover,
  onCellLeave,
  onCellClick
}: GridLayerProps) {
  return (
    <div
      className={styles.grid}
      data-testid="site-grid"
      style={{
        gridTemplateColumns: `repeat(${width}, ${GRID_CELL_SIZE}px)`,
        gap: GRID_CELL_GAP,
        padding: GRID_PADDING,
        width: getCanvasPixelSize({ width, height }).width
      }}
    >
      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const blocked = blockedCells.has(cellKey(x, y));

        return (
          <button
            key={`${x}-${y}`}
            className={`${styles.cell} ${blocked ? styles.blocked : ""}`}
            data-testid={`grid-cell:${x}:${y}`}
            onClick={() => onCellClick(x, y)}
            onMouseEnter={() => onCellHover(x, y)}
            onMouseLeave={onCellLeave}
            style={{
              width: GRID_CELL_SIZE,
              height: GRID_CELL_SIZE
            }}
            type="button"
          />
        );
      })}
    </div>
  );
}

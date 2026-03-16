import styles from "./GridLayer.module.css";

type GridLayerProps = {
  width: number;
  height: number;
  blockedCells: Set<string>;
  onCellHover: (x: number, y: number) => void;
  onCellLeave: () => void;
  onCellClick: (x: number, y: number) => void;
};

export const GRID_CELL_SIZE = 42;
export const GRID_CELL_GAP = 2;
export const GRID_PADDING = 12;

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
        width: width * GRID_CELL_SIZE + (width - 1) * GRID_CELL_GAP + GRID_PADDING * 2
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
            type="button"
          />
        );
      })}
    </div>
  );
}

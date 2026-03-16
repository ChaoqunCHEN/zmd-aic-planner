import { useEffect } from "react";

type PlannerHotkeysInput = {
  canRotate: boolean;
  canDelete: boolean;
  onRotate: () => void;
  onDelete: () => void;
};

export function usePlannerHotkeys({
  canRotate,
  canDelete,
  onRotate,
  onDelete
}: PlannerHotkeysInput) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && canDelete) {
        event.preventDefault();
        onDelete();
      }

      if (event.key.toLowerCase() === "r" && canRotate) {
        event.preventDefault();
        onRotate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canDelete, canRotate, onDelete, onRotate]);
}

import type { RuleFragment } from "../../domain/types";
import styles from "./InputCapEditor.module.css";

type InputCapEditorProps = {
  caps: Record<string, number>;
  rules: RuleFragment[];
  onCapChange: (resourceId: string, cap: number | null) => void;
};

export function InputCapEditor({ caps, rules, onCapChange }: InputCapEditorProps) {
  return (
    <section className={styles.panel} data-testid="input-cap-editor">
      <h2 className={styles.heading}>External Input Caps</h2>
      <div className={styles.list}>
        {rules.map((rule) => {
          const value = caps[rule.resourceId] ?? rule.defaultCap;

          return (
            <label key={rule.id} className={styles.field}>
              <span className={styles.name}>{rule.name}</span>
              <span className={styles.meta}>
                {rule.resourceId} ({rule.unit})
              </span>
              <input
                className={styles.input}
                data-testid={`input-cap:${rule.resourceId}`}
                min={0}
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  onCapChange(rule.resourceId, nextValue === "" ? null : Number(nextValue));
                }}
                step="0.01"
                type="number"
                value={value}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

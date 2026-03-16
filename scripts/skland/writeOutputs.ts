import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function normalizeForWrite(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => normalizeForWrite(entry));
    if (normalized.every((entry) => typeof entry === "object" && entry !== null && "id" in entry)) {
      return [...normalized].sort((left, right) => {
        const leftId = String((left as { id: string }).id);
        const rightId = String((right as { id: string }).id);
        return leftId.localeCompare(rightId);
      });
    }

    return normalized;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return Object.fromEntries(entries.map(([key, entry]) => [key, normalizeForWrite(entry)]));
  }

  return value;
}

export async function writeJsonIfChanged(filePath: string, payload: unknown) {
  const content = `${JSON.stringify(normalizeForWrite(payload), null, 2)}\n`;
  let existing: string | undefined;

  try {
    existing = await readFile(filePath, "utf8");
  } catch {
    // Missing files are expected on first write.
  }

  if (existing === content) {
    return {
      changed: false,
      content
    };
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");

  return {
    changed: true,
    content
  };
}

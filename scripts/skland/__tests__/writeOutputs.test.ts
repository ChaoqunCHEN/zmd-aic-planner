// @vitest-environment node

import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeJsonIfChanged } from "../writeOutputs";

describe("writeJsonIfChanged", () => {
  it("writes deterministic pretty-printed JSON and skips identical rewrites", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "skland-write-"));
    const target = join(tempDir, "placeable-items.json");

    const first = await writeJsonIfChanged(target, [{ id: "b" }, { id: "a" }]);
    const firstStats = await stat(target);
    const content = await readFile(target, "utf8");

    expect(first.changed).toBe(true);
    expect(content).toContain('"id": "b"');

    const second = await writeJsonIfChanged(target, [{ id: "b" }, { id: "a" }]);
    const secondStats = await stat(target);

    expect(second.changed).toBe(false);
    expect(secondStats.mtimeMs).toBe(firstStats.mtimeMs);
  });
});

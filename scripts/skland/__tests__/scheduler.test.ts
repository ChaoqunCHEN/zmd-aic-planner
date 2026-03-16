// @vitest-environment node

import { describe, expect, it } from "vitest";
import { RequestScheduler } from "../scheduler";

describe("RequestScheduler", () => {
  it("waits the minimum delay plus jitter between sequential tasks", async () => {
    let now = 0;
    const waits: number[] = [];
    const scheduler = new RequestScheduler({
      minDelayMs: 1500,
      maxJitterMs: 1000,
      random: () => 0.5,
      now: () => now,
      sleep: async (ms) => {
        waits.push(ms);
        now += ms;
      }
    });

    await scheduler.run(async () => {
      now += 25;
      return "first";
    });

    await scheduler.run(async () => {
      now += 25;
      return "second";
    });

    expect(waits).toEqual([2000]);
  });

  it("stops retrying after repeated guarded source errors", async () => {
    const scheduler = new RequestScheduler({
      minDelayMs: 1500,
      maxJitterMs: 1000,
      guardErrorThreshold: 2,
      random: () => 0,
      now: () => 0,
      sleep: async () => {}
    });

    await expect(
      scheduler.run(async () => {
        throw scheduler.createGuardedSourceError("请求异常");
      })
    ).rejects.toThrow("请求异常");

    await expect(
      scheduler.run(async () => {
        throw scheduler.createGuardedSourceError("请求异常");
      })
    ).rejects.toThrow(/guarded source errors/i);
  });
});

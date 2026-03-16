type RequestSchedulerOptions = {
  minDelayMs: number;
  maxJitterMs: number;
  guardErrorThreshold?: number;
  random?: () => number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

class GuardedSourceError extends Error {
  code = "GUARDED_SOURCE_ERROR";
}

export class RequestScheduler {
  private readonly minDelayMs: number;
  private readonly maxJitterMs: number;
  private readonly guardErrorThreshold: number;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastFinishedAt: number | null = null;
  private consecutiveGuardedErrors = 0;

  constructor(options: RequestSchedulerOptions) {
    this.minDelayMs = options.minDelayMs;
    this.maxJitterMs = options.maxJitterMs;
    this.guardErrorThreshold = options.guardErrorThreshold ?? 3;
    this.random = options.random ?? Math.random;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  createGuardedSourceError(message: string) {
    return new GuardedSourceError(message);
  }

  private async waitForTurn() {
    if (this.lastFinishedAt === null) {
      return;
    }

    const targetDelay = this.minDelayMs + Math.round(this.maxJitterMs * this.random());
    const elapsed = this.now() - this.lastFinishedAt;
    const remaining = targetDelay - elapsed;

    if (remaining > 0) {
      await this.sleep(remaining);
    }
  }

  async run<T>(task: () => Promise<T>) {
    if (this.consecutiveGuardedErrors >= this.guardErrorThreshold) {
      throw new Error("Aborting further requests after repeated guarded source errors");
    }

    await this.waitForTurn();

    try {
      const result = await task();
      this.consecutiveGuardedErrors = 0;
      this.lastFinishedAt = this.now();
      return result;
    } catch (error) {
      this.lastFinishedAt = this.now();

      if (error instanceof GuardedSourceError) {
        this.consecutiveGuardedErrors += 1;

        if (this.consecutiveGuardedErrors >= this.guardErrorThreshold) {
          throw new Error("Aborting further requests after repeated guarded source errors", {
            cause: error
          });
        }
      }

      throw error;
    }
  }
}

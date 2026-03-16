export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type AutosaveController = {
  schedule(value: string): void;
  flush(): void;
  cancel(): void;
};

type AutosaveOptions = {
  delayMs: number;
  save: (value: string) => void;
};

export function createAutosaveController(options: AutosaveOptions): AutosaveController {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: string | null = null;

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (pendingValue === null) {
      return;
    }

    options.save(pendingValue);
    pendingValue = null;
  };

  return {
    schedule(value: string) {
      pendingValue = value;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(flush, options.delayMs);
    },
    flush,
    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      pendingValue = null;
    }
  };
}

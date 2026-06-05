import type { ExportProgress } from "./exportProgress";

type Listener = () => void;

let progress: ExportProgress | null = null;
const listeners = new Set<Listener>();
let notifyRaf = 0;

function notifySoon(): void {
  if (notifyRaf) return;
  notifyRaf = requestAnimationFrame(() => {
    notifyRaf = 0;
    for (const listener of listeners) listener();
  });
}

function notifyNow(): void {
  if (notifyRaf) {
    cancelAnimationFrame(notifyRaf);
    notifyRaf = 0;
  }
  for (const listener of listeners) listener();
}

export const exportProgressStore = {
  getSnapshot: (): ExportProgress | null => progress,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Batched to the next frame so export work stays on the hot path. */
  set: (next: ExportProgress | null): void => {
    progress = next;
    notifySoon();
  },
  /** Use for terminal states that should paint immediately. */
  setImmediate: (next: ExportProgress | null): void => {
    progress = next;
    notifyNow();
  },
};

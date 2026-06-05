import type { ExportVariant } from "./exportVariant";

export type ExportFormat = "png" | "zip";

export type ExportProgressPhase =
  | "preparing"
  | "rendering"
  | "zipping"
  | "complete"
  | "error";

export type ExportProgress = {
  phase: ExportProgressPhase;
  format: ExportFormat;
  variant: ExportVariant;
  /** Cards finished, or 0 while preparing. */
  current: number;
  total: number;
  currentRef?: string;
  etaMs: number | null;
  elapsedMs: number;
  /** `performance.now()` when the export started (for live elapsed updates). */
  startedAt: number;
  errorMessage?: string;
};

const ZIP_TAIL_ESTIMATE_MS = 3_000;

export function formatExportDuration(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} min ${s}s` : `${m} min`;
}

export function exportProgressPercent(progress: ExportProgress): number {
  if (progress.total <= 0) return 0;
  switch (progress.phase) {
    case "preparing":
      return 0;
    case "rendering":
      return Math.round((progress.current / progress.total) * 92);
    case "zipping":
      return 96;
    case "complete":
      return 100;
    case "error":
      return Math.round((progress.current / progress.total) * 92);
    default:
      return 0;
  }
}

export function exportProgressLabel(progress: ExportProgress): string {
  const { phase, format, variant, current, total, currentRef } = progress;
  const layout = variant === "live" ? "Live" : "Resolume";

  switch (phase) {
    case "preparing":
      return `Preparing ${layout} ${format.toUpperCase()} export…`;
    case "rendering":
      return currentRef
        ? `Rendering ${current} of ${total} — ${currentRef}`
        : `Rendering ${current} of ${total}…`;
    case "zipping":
      return `Building ZIP (${total} cards)…`;
    case "complete":
      return format === "zip"
        ? "Export complete — download starting"
        : "Export complete — downloads started";
    case "error":
      return progress.errorMessage ?? "Export failed";
    default:
      return "Exporting…";
  }
}

export function createExportProgressTracker(
  total: number,
  format: ExportFormat,
  variant: ExportVariant,
) {
  const startedAt = performance.now();
  const renderDurations: number[] = [];

  const elapsedMs = () => performance.now() - startedAt;

  const estimateEtaMs = (completed: number, phase: ExportProgressPhase): number | null => {
    if (phase === "complete") return 0;
    if (phase === "zipping") return ZIP_TAIL_ESTIMATE_MS;
    if (renderDurations.length === 0) return null;
    const avg =
      renderDurations.reduce((sum, ms) => sum + ms, 0) / renderDurations.length;
    const remainingCards = Math.max(0, total - completed);
    let ms = avg * remainingCards;
    if (format === "zip") ms += ZIP_TAIL_ESTIMATE_MS;
    return Math.round(ms);
  };

  const snapshot = (
    phase: ExportProgressPhase,
    current: number,
    currentRef?: string,
    errorMessage?: string,
  ): ExportProgress => ({
    phase,
    format,
    variant,
    current,
    total,
    currentRef,
    etaMs: estimateEtaMs(current, phase),
    elapsedMs: elapsedMs(),
    startedAt,
    errorMessage,
  });

  return {
    preparing: () => snapshot("preparing", 0),
    rendering: (index: number, currentRef: string) =>
      snapshot("rendering", index + 1, currentRef),
    recordRender: (ms: number) => {
      renderDurations.push(ms);
    },
    zipping: () => snapshot("zipping", total),
    complete: () => snapshot("complete", total),
    error: (message: string, current: number) =>
      snapshot("error", current, undefined, message),
  };
}

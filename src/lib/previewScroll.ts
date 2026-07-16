import type { ExportVariant } from "../export/exportVariant";

export type PreviewScrollTarget = ExportVariant | "both";

function previewCardElement(
  id: string,
  variant: ExportVariant,
): HTMLElement | null {
  const elId =
    variant === "resolume"
      ? `preview-card-resolume-${id}`
      : `preview-card-${id}`;
  return document.getElementById(elId);
}

/** Horizontal-only: scroll the strip so the card is centered, without moving the page. */
function scrollPreviewCardInStrip(id: string, variant: ExportVariant): void {
  const el = previewCardElement(id, variant);
  if (!el) return;
  const strip = el.closest(".preview-cards-strip");
  if (!(strip instanceof HTMLElement)) return;
  const target =
    el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
  strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
}

/** Page queue: center the card in each preview strip (no vertical page scroll). */
export function scrollBothPreviewCards(id: string): void {
  scrollPreviewCardInStrip(id, "live");
  scrollPreviewCardInStrip(id, "resolume");
}

export function scrollPreviewToPage(
  id: string,
  target: PreviewScrollTarget,
): void {
  if (target === "both") {
    scrollBothPreviewCards(id);
  } else {
    scrollPreviewCardInStrip(id, target);
  }
}

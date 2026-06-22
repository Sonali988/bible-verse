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

function scrollPreviewCardInStrip(id: string, variant: ExportVariant): void {
  previewCardElement(id, variant)?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}

function scrollPreviewCard(id: string, variant: ExportVariant): void {
  previewCardElement(id, variant)?.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

/** Page queue: bring both preview strips into view and center the card in each. */
export function scrollBothPreviewCards(id: string): void {
  document.querySelector(".preview-dual-stack")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  requestAnimationFrame(() => {
    scrollPreviewCardInStrip(id, "live");
    scrollPreviewCardInStrip(id, "resolume");
  });
}

export function scrollPreviewToPage(
  id: string,
  target: PreviewScrollTarget,
): void {
  if (target === "both") {
    scrollBothPreviewCards(id);
  } else {
    scrollPreviewCard(id, target);
  }
}

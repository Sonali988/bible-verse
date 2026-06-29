import type { ExportVariant } from "../export/exportVariant";
import type { VersePage } from "../bible/types";
import type { VerseBlockOrder } from "./verseBlockOrder";
import { formatReference } from "./referenceParser";
function sanitizeFileName(s: string): string {
  return s.replace(/[^\w\u0900-\u0fff-]+/g, "_").replace(/_+/g, "_").slice(0, 120);
}

function labelAbbrev(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, 2);
  return trimmed || "xx";
}

export function versionFilePrefix(
  englishLabel: string,
  hindiLabel: string,
  verseBlockOrder: VerseBlockOrder,
): string {
  const en = labelAbbrev(englishLabel);
  const hi = labelAbbrev(hindiLabel);
  return verseBlockOrder === "en-first" ? `${en}-${hi}` : `${hi}-${en}`;
}

export function datedZipFileName(suffix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${suffix}.zip`;
}

export function exportPngFileName(
  page: VersePage,
  variant: ExportVariant,
  fallbackEnglishLabel: string,
  fallbackHindiLabel: string,
  verseBlockOrder: VerseBlockOrder,
): string {
  const englishLabel = page.versionLabelEn ?? fallbackEnglishLabel;
  const hindiLabel = page.versionLabelHi ?? fallbackHindiLabel;
  const prefix = versionFilePrefix(englishLabel, hindiLabel, verseBlockOrder);
  return `${prefix}-${sanitizeFileName(formatReference(page.ref))}-${variant}.png`;
}

/** Ensure unique names within one export batch (ZIP or multi-download). */
export function uniqueExportPngFileNames(
  pages: VersePage[],
  variant: ExportVariant,
  fallbackEnglishLabel: string,
  fallbackHindiLabel: string,
  verseBlockOrder: VerseBlockOrder,
): string[] {
  const seen = new Map<string, number>();
  return pages.map((page) => {
    const base = exportPngFileName(
      page,
      variant,
      fallbackEnglishLabel,
      fallbackHindiLabel,
      verseBlockOrder,
    );
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) return base;
    const stem = base.slice(0, -".png".length);
    return `${stem}_${count + 1}.png`;
  });
}
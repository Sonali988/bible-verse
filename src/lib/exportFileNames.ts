import type { ExportVariant } from "../export/exportVariant";
import type { VerseRef } from "../bible/types";
import { formatReference } from "./referenceParser";

function sanitizeFileName(s: string): string {
  return s.replace(/[^\w\u0900-\u0fff-]+/g, "_").replace(/_+/g, "_").slice(0, 120);
}

export function datedZipFileName(suffix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${suffix}.zip`;
}

export function exportPngFileName(ref: VerseRef, variant: ExportVariant): string {
  return `${sanitizeFileName(formatReference(ref))}-${variant}.png`;
}

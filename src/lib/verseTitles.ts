import type { VersePage } from "../bible/types";
import { formatHindiReference, formatReference } from "./referenceParser";

export function defaultVerseTitleHi(
  page: VersePage,
  versionLabelHi: string,
): string {
  return `${formatHindiReference(page.ref)} ${versionLabelHi}`;
}

export function defaultVerseTitleEn(
  page: VersePage,
  versionLabelEn: string,
): string {
  return `${formatReference(page.ref)} ${versionLabelEn}`;
}

export function verseTitleHi(
  page: VersePage,
  versionLabelHi: string,
): string {
  const custom = page.titleHiOverride?.trim();
  return custom || defaultVerseTitleHi(page, versionLabelHi);
}

export function verseTitleEn(
  page: VersePage,
  versionLabelEn: string,
): string {
  const custom = page.titleEnOverride?.trim();
  return custom || defaultVerseTitleEn(page, versionLabelEn);
}

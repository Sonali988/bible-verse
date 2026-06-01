import {
  MAX_VERSE_BODY_FONT_PX,
  type LayoutSpec,
  type PageTypographyOverrides,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import { verseBodyRect, type VerseBlockOrder } from "./verseBlockOrder";
import { verseBodyEdgePadding } from "./verseBoxStyle";

const MIN_VERSE_BODY_FONT_PX = 6;

export type VerseCardMeasureVariant = "live" | "resolume";

export type FitVerseBodyFontInput = {
  text: string;
  boxWidth: number;
  boxHeight: number;
  fontFamily: string;
  lineHeight: number;
  textAlign: TypographySpec["textAlign"];
  script: "hi" | "en";
  cardVariant?: VerseCardMeasureVariant;
};

function verseBodyAlignmentStyle(
  textAlign: TypographySpec["textAlign"],
  script: "hi" | "en",
): { textAlign: TypographySpec["textAlign"]; hyphens?: "auto" | "manual" } {
  if (textAlign === "justify") {
    return {
      textAlign: "justify",
      hyphens: script === "en" ? "auto" : "manual",
    };
  }
  return { textAlign };
}

let measureEl: HTMLDivElement | null = null;

function measureBox(): HTMLDivElement {
  if (!measureEl) {
    measureEl = document.createElement("div");
    measureEl.setAttribute("aria-hidden", "true");
    Object.assign(measureEl.style, {
      position: "fixed",
      left: "-12000px",
      top: "0",
      visibility: "hidden",
      pointerEvents: "none",
      margin: "0",
      display: "block",
      boxSizing: "border-box",
      overflow: "hidden",
      fontWeight: "500",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "break-word",
    });
    document.body.appendChild(measureEl);
  }
  return measureEl;
}

function verseBodyFitsBox(el: HTMLDivElement): boolean {
  return (
    el.scrollHeight <= el.clientHeight + 1 &&
    el.scrollWidth <= el.clientWidth + 1
  );
}

function applyVerseBodyMeasureStyles(
  el: HTMLDivElement,
  input: FitVerseBodyFontInput,
  fontSizePx: number,
): void {
  const align = verseBodyAlignmentStyle(input.textAlign, input.script);
  const pad = verseBodyEdgePadding(fontSizePx, input.script);
  el.lang = input.script === "hi" ? "hi" : "en";
  el.textContent = input.text;
  el.style.width = `${Math.max(1, Math.round(input.boxWidth))}px`;
  el.style.height = `${Math.max(1, Math.round(input.boxHeight))}px`;
  el.style.fontFamily = input.fontFamily;
  el.style.fontSize = `${fontSizePx}px`;
  el.style.lineHeight = String(input.lineHeight);
  el.style.textAlign = align.textAlign;
  if (input.cardVariant === "resolume" && input.textAlign === "justify") {
    el.style.textAlignLast = "left";
  } else {
    el.style.removeProperty("textAlignLast");
  }
  if (align.hyphens) {
    el.style.hyphens = align.hyphens;
  } else {
    el.style.removeProperty("hyphens");
  }
  el.style.paddingTop = `${pad.paddingTop}px`;
  el.style.paddingBottom = `${pad.paddingBottom}px`;
  el.style.paddingLeft = `${pad.paddingLeft}px`;
  el.style.paddingRight = `${pad.paddingRight}px`;
}

/**
 * Largest body font size (px) so `text` fits in the layout box using the same
 * box model as {@link VerseCard} / {@link ResolumeVerseCard} verse bodies.
 */
export function fitVerseBodyFontPx(input: FitVerseBodyFontInput): number {
  const text = input.text.trim();
  const maxPx = MAX_VERSE_BODY_FONT_PX;
  if (!text) return maxPx;

  const el = measureBox();
  let lo = MIN_VERSE_BODY_FONT_PX - 1;
  let hi = maxPx + 1;

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    applyVerseBodyMeasureStyles(el, input, mid);
    if (verseBodyFitsBox(el)) lo = mid;
    else hi = mid;
  }

  applyVerseBodyMeasureStyles(el, input, Math.max(MIN_VERSE_BODY_FONT_PX, lo));
  return Math.max(MIN_VERSE_BODY_FONT_PX, lo);
}

/** Per-page body font overrides for one layout + typography preset. */
export function computeAutoFitBodyFontOverrides(
  page: Pick<VersePage, "textEn" | "textHi">,
  layout: LayoutSpec,
  typography: TypographySpec,
  verseBlockOrder: VerseBlockOrder,
  cardVariant: VerseCardMeasureVariant = "live",
): Pick<PageTypographyOverrides, "bodyFontPxHi" | "bodyFontPxEn"> {
  const hiRect = verseBodyRect(layout, "hi", verseBlockOrder);
  const enRect = verseBodyRect(layout, "en", verseBlockOrder);

  return {
    bodyFontPxHi: fitVerseBodyFontPx({
      text: page.textHi,
      boxWidth: hiRect.width,
      boxHeight: hiRect.height,
      fontFamily: typography.fontFamilyHi,
      lineHeight: typography.lineHeightHi,
      textAlign: typography.textAlign,
      script: "hi",
      cardVariant,
    }),
    bodyFontPxEn: fitVerseBodyFontPx({
      text: page.textEn,
      boxWidth: enRect.width,
      boxHeight: enRect.height,
      fontFamily: typography.fontFamilyEn,
      lineHeight: typography.lineHeightEn,
      textAlign: typography.textAlign,
      script: "en",
      cardVariant,
    }),
  };
}

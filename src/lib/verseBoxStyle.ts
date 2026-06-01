import type { CSSProperties } from "react";

type Rect = { x: number; y: number; width: number; height: number };

export function absoluteTextBox(rect: Rect): CSSProperties {
  return {
    position: "absolute",
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

/**
 * Inset text inside fixed-height boxes so bold / Devanagari ascenders and descenders
 * are not clipped when overflow is hidden (common at large font sizes).
 */
export function verseBodyEdgePadding(
  fontSizePx: number,
  script: "hi" | "en",
): Pick<CSSProperties, "paddingTop" | "paddingBottom" | "paddingLeft" | "paddingRight"> {
  const vFactor = script === "hi" ? 0.22 : 0.18;
  const v = Math.max(4, Math.round(fontSizePx * vFactor));
  const h = Math.max(2, Math.round(fontSizePx * 0.04));
  return {
    paddingTop: v,
    paddingBottom: v,
    paddingLeft: h,
    paddingRight: h,
  };
}

/** Resolume combined title row — extra vertical inset for Devanagari matras. */
export function resolumeTitleEdgePadding(
  titleFontPxHi: number,
  titleFontPxEn: number,
): Pick<CSSProperties, "paddingTop" | "paddingBottom" | "paddingLeft" | "paddingRight"> {
  const vHi = Math.max(8, Math.round(titleFontPxHi * 0.3));
  const vEn = Math.max(6, Math.round(titleFontPxEn * 0.22));
  const v = Math.max(vHi, vEn);
  const maxPx = Math.max(titleFontPxHi, titleFontPxEn);
  const h = Math.max(4, Math.round(maxPx * 0.05));
  return {
    paddingTop: v,
    paddingBottom: v,
    paddingLeft: h,
    paddingRight: h,
  };
}

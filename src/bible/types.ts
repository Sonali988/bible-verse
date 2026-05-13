export type VerseRef = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

export type HighlightRange = { start: number; end: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type LayoutSpec = {
  width: number;
  height: number;
  titleEn: Rect;
  bodyEn: Rect;
  titleHi: Rect;
  bodyHi: Rect;
};

export type TypographySpec = {
  fontFamilyEn: string;
  fontFamilyHi: string;
  /** Hindi section title (reference + version) */
  titleFontPxHi: number;
  /** English section title (reference + version) */
  titleFontPxEn: number;
  minBodyFontPx: number;
  maxBodyFontPx: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  /** Section titles (reference + version), e.g. `#ffffff` */
  titleColor: string;
  /** Verse body text */
  bodyColor: string;
};

/** What the design toolbar is editing (Canva-style). */
export type DesignTarget =
  | "canvas"
  | "titleEn"
  | "bodyEn"
  | "titleHi"
  | "bodyHi";

export type VersePage = {
  id: string;
  ref: VerseRef;
  textEn: string;
  textHi: string;
  highlightsEn: HighlightRange[];
  highlightsHi: HighlightRange[];
};

/**
 * Default card canvas and text regions (reset + initial load).
 * **1920×1080** to match a full-HD background. Hindi block first (title from **130px** top), then English below.
 * Each title/body region is up to **880×400** (see `VerseCard` max caps); right side stays clear for overlays.
 */
export const CARD_LAYOUT: LayoutSpec = {
  width: 1920,
  height: 1080,
  titleHi: { x: 40, y: 130, width: 880, height: 56 },
  bodyHi: { x: 40, y: 210, width: 880, height: 400 },
  titleEn: { x: 40, y: 634, width: 880, height: 56 },
  bodyEn: { x: 40, y: 706, width: 880, height: 374 },
};

export function cloneLayout(layout: LayoutSpec): LayoutSpec {
  return {
    width: layout.width,
    height: layout.height,
    titleEn: { ...layout.titleEn },
    bodyEn: { ...layout.bodyEn },
    titleHi: { ...layout.titleHi },
    bodyHi: { ...layout.bodyHi },
  };
}

/** Keeps verse/title boxes in the left half so the right 50% stays clear for camera overlay PNGs. */
export function clampRectToCardLeftHalf(rect: Rect, layoutWidth: number): Rect {
  const maxR = layoutWidth / 2;
  let { x, y, width, height } = rect;
  width = Math.max(40, width);
  x = Math.max(0, x);
  if (x + width > maxR) {
    width = Math.max(40, maxR - x);
  }
  if (x + width > maxR) {
    x = Math.max(0, maxR - width);
  }
  return { x, y, width, height };
}

export function clampLayoutTextToLeftHalf(layout: LayoutSpec): LayoutSpec {
  const w = layout.width;
  return {
    ...layout,
    titleEn: clampRectToCardLeftHalf(layout.titleEn, w),
    bodyEn: clampRectToCardLeftHalf(layout.bodyEn, w),
    titleHi: clampRectToCardLeftHalf(layout.titleHi, w),
    bodyHi: clampRectToCardLeftHalf(layout.bodyHi, w),
  };
}

/** Default section title sizes (reference + version line). */
export const DEFAULT_TITLE_FONT_PX_HI = 38;
export const DEFAULT_TITLE_FONT_PX_EN = 40;

export const defaultTypography = (): TypographySpec => ({
  fontFamilyEn: '"Poppins", system-ui, sans-serif',
  fontFamilyHi: '"Poppins", "Noto Sans Devanagari", system-ui, sans-serif',
  titleFontPxHi: DEFAULT_TITLE_FONT_PX_HI,
  titleFontPxEn: DEFAULT_TITLE_FONT_PX_EN,
  minBodyFontPx: 14,
  maxBodyFontPx: 42,
  lineHeight: 1.25,
  textAlign: "left",
  titleColor: "#ffffff",
  bodyColor: "#ffffff",
});

/** Fills in missing fields. Legacy `titleFontPx` (single size) maps to Hindi 38px / English 40px defaults, not the old pixel value. */
export function normalizeTypography(
  raw: Partial<TypographySpec> | null | undefined,
): TypographySpec {
  const d = defaultTypography();
  if (!raw) return d;
  const legacy = raw as Partial<TypographySpec> & { titleFontPx?: number };
  const { titleFontPx: legacyTitle, ...rest } = legacy;
  const base: TypographySpec = { ...d, ...rest };
  if (
    typeof legacyTitle === "number" &&
    Number.isFinite(legacyTitle) &&
    rest.titleFontPxHi === undefined &&
    rest.titleFontPxEn === undefined
  ) {
    return repairStaleTitleFontPair(
      coerceTitleFontSizes({
        ...base,
        titleFontPxHi: DEFAULT_TITLE_FONT_PX_HI,
        titleFontPxEn: DEFAULT_TITLE_FONT_PX_EN,
      }),
    );
  }
  return repairStaleTitleFontPair(coerceTitleFontSizes(base));
}

/** Old migration copied one `titleFontPx` into both fields (often 26×26); bump to current defaults. */
function repairStaleTitleFontPair(t: TypographySpec): TypographySpec {
  if (t.titleFontPxHi === 26 && t.titleFontPxEn === 26) {
    return {
      ...t,
      titleFontPxHi: DEFAULT_TITLE_FONT_PX_HI,
      titleFontPxEn: DEFAULT_TITLE_FONT_PX_EN,
    };
  }
  return t;
}

function coerceTitleFontSizes(t: TypographySpec): TypographySpec {
  const d = defaultTypography();
  const hi =
    typeof t.titleFontPxHi === "number" && Number.isFinite(t.titleFontPxHi)
      ? t.titleFontPxHi
      : d.titleFontPxHi;
  const en =
    typeof t.titleFontPxEn === "number" && Number.isFinite(t.titleFontPxEn)
      ? t.titleFontPxEn
      : d.titleFontPxEn;
  return { ...t, titleFontPxHi: hi, titleFontPxEn: en };
}

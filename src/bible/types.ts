export type VerseRef = {
  bookId: string;
  chapter: number;
  verse: number;
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
  /** Hindi verse body (fixed pixel size) */
  bodyFontPxHi: number;
  /** English verse body (fixed pixel size) */
  bodyFontPxEn: number;
  /** Hindi verse body line height (unitless, e.g. 1.25) */
  lineHeightHi: number;
  /** English verse body line height (unitless, e.g. 1.25) */
  lineHeightEn: number;
  /** Hindi + English section titles (reference + version) */
  titleTextAlign: "left" | "center" | "right";
  /** Hindi + English verse bodies (`justify` = lines stretch to box width) */
  textAlign: "left" | "center" | "right" | "justify";
  /** Section titles (reference + version), e.g. `#ffffff` */
  titleColor: string;
  /** Verse body text (non-highlighted) */
  bodyColor: string;
  /** Highlighted verse text color */
  highlightColor: string;
};

/** Per-card overrides (font sizes + title/verse style) for one preview variant only. */
export type PageTypographyOverrides = Partial<
  Pick<
    TypographySpec,
    | "titleFontPxHi"
    | "titleFontPxEn"
    | "bodyFontPxHi"
    | "bodyFontPxEn"
    | "lineHeightHi"
    | "lineHeightEn"
    | "titleColor"
    | "titleTextAlign"
    | "bodyColor"
    | "highlightColor"
    | "textAlign"
  >
>;

/** @deprecated Use {@link PageTypographyOverrides}. */
export type PageTypographySizeOverrides = PageTypographyOverrides;

export type VersePage = {
  id: string;
  ref: VerseRef;
  textEn: string;
  textHi: string;
  highlightsEn: HighlightRange[];
  highlightsHi: HighlightRange[];
  /** Live preview: per-card typography overrides (not shared with Resolume). */
  typographySizes?: PageTypographyOverrides;
  /** Resolume preview: per-card typography overrides (not shared with Live). */
  resolumeTypographySizes?: PageTypographyOverrides;
};

/** Effective typography for rendering one card (global + optional per-page font sizes). */
export function mergePageTypography(
  global: TypographySpec,
  page: VersePage,
  sizesKey: "typographySizes" | "resolumeTypographySizes" = "typographySizes",
): TypographySpec {
  const o = page[sizesKey];
  if (!o || Object.keys(o).length === 0) return global;
  return normalizeTypography({ ...global, ...o });
}

/**
 * Default card canvas and text regions (reset + initial load).
 * **1920×1080** to match a full-HD background. Hindi block first (title from **220px** top), then English below.
 * Left column **660px** wide at **x 30**; gaps between regions match the prior 130px-top layout (+90px shift).
 */
export const CARD_LAYOUT: LayoutSpec = {
  width: 1920,
  height: 1080,
  titleHi: { x: 30, y: 220, width: 660, height: 56 },
  bodyHi: { x: 30, y: 300, width: 660, height: 350 },
  titleEn: { x: 30, y: 672, width: 660, height: 56 },
  bodyEn: { x: 30, y: 742, width: 660, height: 338 },
};

/**
 * Resolume output: combined title line, then Hindi verse, then English verse.
 * `titleHi` stores the combined title box; `titleEn` is unused by ResolumeVerseCard.
 */
/** Title at y 70; 20px gap between title, Hindi verse, and English verse. */
export const RESOLUME_CARD_LAYOUT: LayoutSpec = {
  width: 1960,
  height: 1080,
  titleHi: { x: 70, y: 70, width: 1820, height: 115 },
  bodyHi: { x: 90, y: 205, width: 1780, height: 380 },
  titleEn: { x: 0, y: 0, width: 0, height: 0 },
  bodyEn: { x: 90, y: 605, width: 1780, height: 380 },
};

export function cloneResolumeLayout(): LayoutSpec {
  return cloneLayout(RESOLUME_CARD_LAYOUT);
}

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

/** Default verse card background when no custom image is uploaded (`public/bg.png` matches this). */
export const DEFAULT_CARD_BACKGROUND_COLOR = "#554111";

/** Default section title sizes (reference + version line). */
export const DEFAULT_TITLE_FONT_PX_HI = 38;
export const DEFAULT_TITLE_FONT_PX_EN = 40;

export const defaultTypography = (): TypographySpec => ({
  fontFamilyEn: '"Poppins", system-ui, sans-serif',
  fontFamilyHi: '"Poppins", "Noto Sans Devanagari", system-ui, sans-serif',
  titleFontPxHi: DEFAULT_TITLE_FONT_PX_HI,
  titleFontPxEn: DEFAULT_TITLE_FONT_PX_EN,
  bodyFontPxHi: 42,
  bodyFontPxEn: 40,
  lineHeightHi: 1.25,
  lineHeightEn: 1.25,
  titleTextAlign: "center",
  textAlign: "justify",
  titleColor: "#ffffff",
  bodyColor: "#ffffff",
  highlightColor: "#f1a600",
});

/** Resolume defaults: 56px Hindi / 58px English verse bodies. */
export const defaultResolumeTypography = (): TypographySpec => ({
  ...defaultTypography(),
  titleFontPxHi: 56,
  titleFontPxEn: 58,
  bodyFontPxHi: 56,
  bodyFontPxEn: 58,
  titleTextAlign: "center",
  textAlign: "center",
});

type RawTypography = Partial<TypographySpec> & {
  titleFontPx?: number;
  minBodyFontPx?: number;
  maxBodyFontPx?: number;
  minBodyFontPxHi?: number;
  maxBodyFontPxHi?: number;
  minBodyFontPxEn?: number;
  maxBodyFontPxEn?: number;
  /** Legacy single verse line height (migrated to Hi + En) */
  lineHeight?: number;
};

/** Fills in missing fields. Migrates legacy min/max verse ranges and `titleFontPx`. */
export function normalizeTypography(
  raw: Partial<TypographySpec> | null | undefined,
): TypographySpec {
  const d = defaultTypography();
  if (!raw) return d;
  const r = raw as RawTypography;
  const {
    titleFontPx: legacyTitle,
    minBodyFontPx: legacyMinBody,
    maxBodyFontPx: legacyMaxBody,
    minBodyFontPxHi: oldMinHi,
    maxBodyFontPxHi: oldMaxHi,
    minBodyFontPxEn: oldMinEn,
    maxBodyFontPxEn: oldMaxEn,
    lineHeight: legacyLineHeight,
    ...rest
  } = r;
  const base = { ...d, ...rest } as TypographySpec;
  const withBody = coerceBodyFontPx(base, rest, {
    legacyMin: legacyMinBody,
    legacyMax: legacyMaxBody,
    oldMinHi,
    oldMaxHi,
    oldMinEn,
    oldMaxEn,
  });
  const withLines = coerceLineHeights(withBody, rest, legacyLineHeight);
  if (
    typeof legacyTitle === "number" &&
    Number.isFinite(legacyTitle) &&
    rest.titleFontPxHi === undefined &&
    rest.titleFontPxEn === undefined
  ) {
    return repairStaleTitleFontPair(
      coerceTitleFontSizes(
        coerceAlignFields({
          ...withLines,
          titleFontPxHi: DEFAULT_TITLE_FONT_PX_HI,
          titleFontPxEn: DEFAULT_TITLE_FONT_PX_EN,
        }),
      ),
    );
  }
  return repairStaleTitleFontPair(coerceTitleFontSizes(coerceAlignFields(withLines)));
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

function coerceAlignFields(t: TypographySpec): TypographySpec {
  const d = defaultTypography();
  return {
    ...t,
    textAlign: coerceVerseTextAlign(t.textAlign as string, d.textAlign),
    titleTextAlign: coerceTitleTextAlign(
      t.titleTextAlign as string,
      d.titleTextAlign,
    ),
  };
}

function coerceVerseTextAlign(
  v: string | undefined,
  fallback: TypographySpec["textAlign"],
): TypographySpec["textAlign"] {
  if (v === "left" || v === "center" || v === "right" || v === "justify")
    return v;
  return fallback;
}

function coerceTitleTextAlign(
  v: string | undefined,
  fallback: TypographySpec["titleTextAlign"],
): TypographySpec["titleTextAlign"] {
  if (v === "justify") return "center";
  if (v === "left" || v === "center" || v === "right") return v;
  return fallback;
}

function mid(a?: number, b?: number): number | undefined {
  if (
    typeof a === "number" &&
    Number.isFinite(a) &&
    typeof b === "number" &&
    Number.isFinite(b)
  ) {
    return Math.round((a + b) / 2);
  }
  return undefined;
}

/** Prefer average of min/max; if only one bound exists, use it. */
function pickLegacySize(min?: number, max?: number): number | undefined {
  const m = mid(min, max);
  if (m !== undefined) return m;
  if (typeof max === "number" && Number.isFinite(max)) return Math.round(max);
  if (typeof min === "number" && Number.isFinite(min)) return Math.round(min);
  return undefined;
}

/** Max verse body font size (px) for Live and Resolume previews. */
export const MAX_VERSE_BODY_FONT_PX = 150;

function clampBodyPx(n: number, d: number): number {
  if (typeof n === "number" && Number.isFinite(n)) {
    return Math.max(6, Math.min(MAX_VERSE_BODY_FONT_PX, Math.round(n)));
  }
  return d;
}

function coerceBodyFontPx(
  t: TypographySpec,
  rest: Partial<TypographySpec>,
  legacy: {
    legacyMin?: number;
    legacyMax?: number;
    oldMinHi?: number;
    oldMaxHi?: number;
    oldMinEn?: number;
    oldMaxEn?: number;
  },
): TypographySpec {
  const d = defaultTypography();
  const fromGlobal = pickLegacySize(legacy.legacyMin, legacy.legacyMax);
  const hiExplicit =
    typeof rest.bodyFontPxHi === "number" && Number.isFinite(rest.bodyFontPxHi);
  const enExplicit =
    typeof rest.bodyFontPxEn === "number" && Number.isFinite(rest.bodyFontPxEn);
  const hi = hiExplicit
    ? clampBodyPx(rest.bodyFontPxHi!, d.bodyFontPxHi)
    : clampBodyPx(
      pickLegacySize(legacy.oldMinHi, legacy.oldMaxHi) ??
      fromGlobal ??
      d.bodyFontPxHi,
      d.bodyFontPxHi,
    );
  const en = enExplicit
    ? clampBodyPx(rest.bodyFontPxEn!, d.bodyFontPxEn)
    : clampBodyPx(
      pickLegacySize(legacy.oldMinEn, legacy.oldMaxEn) ??
      fromGlobal ??
      d.bodyFontPxEn,
      d.bodyFontPxEn,
    );
  return { ...t, bodyFontPxHi: hi, bodyFontPxEn: en };
}

function clampLineHeight(n: number, d: number): number {
  if (typeof n === "number" && Number.isFinite(n)) {
    return Math.max(1, Math.min(3, Math.round(n * 100) / 100));
  }
  return d;
}

function coerceLineHeights(
  t: TypographySpec,
  rest: Partial<TypographySpec>,
  legacy?: number,
): TypographySpec {
  const d = defaultTypography();
  const hiExplicit =
    typeof rest.lineHeightHi === "number" && Number.isFinite(rest.lineHeightHi);
  const enExplicit =
    typeof rest.lineHeightEn === "number" && Number.isFinite(rest.lineHeightEn);
  const leg =
    typeof legacy === "number" && Number.isFinite(legacy)
      ? clampLineHeight(legacy, d.lineHeightHi)
      : undefined;
  const hi = hiExplicit
    ? clampLineHeight(rest.lineHeightHi!, d.lineHeightHi)
    : leg ?? clampLineHeight(t.lineHeightHi, d.lineHeightHi);
  const en = enExplicit
    ? clampLineHeight(rest.lineHeightEn!, d.lineHeightEn)
    : leg ?? clampLineHeight(t.lineHeightEn, d.lineHeightEn);
  return { ...t, lineHeightHi: hi, lineHeightEn: en };
}

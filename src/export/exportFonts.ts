import { getFontEmbedCSS } from "html-to-image";
import type { TypographySpec } from "../bible/types";

/** Weights used on verse cards (body 500, titles 600, highlights 500). */
const CARD_FONT_WEIGHTS = [500, 600] as const;

const SAMPLE_LATIN = "For God so loved the world John 3:16";
const SAMPLE_DEVANAGARI = "परमेश्वर ने जगत से प्रेम किया यूहन्ना ३:१६";

const PREFERRED_FONT_FORMAT = "woff2" as const;

let baseFontEmbedCssPromise: Promise<string> | null = null;

/**
 * Embed card webfonts (Poppins, Noto Sans Devanagari) once per session so
 * html-to-image does not substitute fallback faces during rasterisation.
 */
export function getBaseCardFontEmbedCss(): Promise<string> {
  if (!baseFontEmbedCssPromise) {
    baseFontEmbedCssPromise = getFontEmbedCSS(document.documentElement, {
      preferredFontFormat: PREFERRED_FONT_FORMAT,
    }).catch(() => "");
  }
  return baseFontEmbedCssPromise;
}

/** Per-node font rules plus shared card stacks (refreshed each capture). */
export async function buildFontEmbedCss(node: HTMLElement): Promise<string> {
  const [base, nodeCss] = await Promise.all([
    getBaseCardFontEmbedCss(),
    getFontEmbedCSS(node, { preferredFontFormat: PREFERRED_FONT_FORMAT }),
  ]);
  if (base && nodeCss) return `${base}\n${nodeCss}`;
  return nodeCss || base || "";
}

/**
 * Load every card weight for both stacks before rasterising. Without this,
 * html-to-image may embed a fallback face and render faux-bold text that is
 * wider than the preview (clipping inside overflow:hidden boxes).
 */
export async function ensureCardFontsReady(
  typography: TypographySpec,
): Promise<void> {
  const loads: Promise<FontFace[]>[] = [];
  for (const weight of CARD_FONT_WEIGHTS) {
    loads.push(
      document.fonts.load(
        `${weight} 32px ${typography.fontFamilyEn}`,
        SAMPLE_LATIN,
      ),
    );
    loads.push(
      document.fonts.load(
        `${weight} 32px ${typography.fontFamilyHi}`,
        SAMPLE_DEVANAGARI,
      ),
    );
  }
  await Promise.allSettled(loads);
  await document.fonts.ready;
}

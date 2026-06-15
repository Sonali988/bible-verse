import type { TypographySpec } from "../bible/types";

/** Weights used on verse cards (body 500, titles 600, highlights 500). */
const CARD_FONT_WEIGHTS = [500, 600] as const;

const SAMPLE_LATIN = "For God so loved the world John 3:16";
const SAMPLE_DEVANAGARI = "परमेश्वर ने जगत से प्रेम किया यूहन्ना ३:१६";

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

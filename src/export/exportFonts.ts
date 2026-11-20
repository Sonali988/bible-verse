import type { TypographySpec } from "../bible/types";
import { isWebKit } from "./browser";
import { woffToSfnt } from "./woffToSfnt";

import poppinsDevanagari500 from "@fontsource/poppins/files/poppins-devanagari-500-normal.woff2?url";
import poppinsDevanagari600 from "@fontsource/poppins/files/poppins-devanagari-600-normal.woff2?url";
import poppinsDevanagari700 from "@fontsource/poppins/files/poppins-devanagari-700-normal.woff2?url";
import poppinsLatin500 from "@fontsource/poppins/files/poppins-latin-500-normal.woff2?url";
import poppinsLatin600 from "@fontsource/poppins/files/poppins-latin-600-normal.woff2?url";
import poppinsLatin700 from "@fontsource/poppins/files/poppins-latin-700-normal.woff2?url";
import poppinsLatinExt500 from "@fontsource/poppins/files/poppins-latin-ext-500-normal.woff2?url";
import poppinsLatinExt600 from "@fontsource/poppins/files/poppins-latin-ext-600-normal.woff2?url";
import poppinsLatinExt700 from "@fontsource/poppins/files/poppins-latin-ext-700-normal.woff2?url";
import notoDevanagari500 from "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-500-normal.woff2?url";
import notoDevanagari600 from "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-600-normal.woff2?url";
import notoDevanagari700 from "@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff2?url";

/** Weights used on verse cards (body 500, titles 600; 700 for bold UI). */
const CARD_FONT_WEIGHTS = [500, 600, 700] as const;

const SAMPLE_LATIN = "For God so loved the world John 3:16";
const SAMPLE_DEVANAGARI = "परमेश्वर ने जगत से प्रेम किया यूहन्ना ३:१६";

/** Matches @fontsource unicode-range subsets used for card text. */
const UNICODE = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  latinExt:
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  devanagari:
    "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09",
} as const;

type CardFontFace = {
  /** Stable id used to load the WOFF file on WebKit. */
  key: string;
  family: string;
  weight: number;
  url: string;
  unicodeRange: string;
};

const CARD_FONT_FACES: CardFontFace[] = [
  {
    key: "poppins-latin-500",
    family: "Poppins",
    weight: 500,
    url: poppinsLatin500,
    unicodeRange: UNICODE.latin,
  },
  {
    key: "poppins-latin-600",
    family: "Poppins",
    weight: 600,
    url: poppinsLatin600,
    unicodeRange: UNICODE.latin,
  },
  {
    key: "poppins-latin-700",
    family: "Poppins",
    weight: 700,
    url: poppinsLatin700,
    unicodeRange: UNICODE.latin,
  },
  {
    key: "poppins-latin-ext-500",
    family: "Poppins",
    weight: 500,
    url: poppinsLatinExt500,
    unicodeRange: UNICODE.latinExt,
  },
  {
    key: "poppins-latin-ext-600",
    family: "Poppins",
    weight: 600,
    url: poppinsLatinExt600,
    unicodeRange: UNICODE.latinExt,
  },
  {
    key: "poppins-latin-ext-700",
    family: "Poppins",
    weight: 700,
    url: poppinsLatinExt700,
    unicodeRange: UNICODE.latinExt,
  },
  {
    key: "poppins-devanagari-500",
    family: "Poppins",
    weight: 500,
    url: poppinsDevanagari500,
    unicodeRange: UNICODE.devanagari,
  },
  {
    key: "poppins-devanagari-600",
    family: "Poppins",
    weight: 600,
    url: poppinsDevanagari600,
    unicodeRange: UNICODE.devanagari,
  },
  {
    key: "poppins-devanagari-700",
    family: "Poppins",
    weight: 700,
    url: poppinsDevanagari700,
    unicodeRange: UNICODE.devanagari,
  },
  {
    key: "noto-devanagari-500",
    family: "Noto Sans Devanagari",
    weight: 500,
    url: notoDevanagari500,
    unicodeRange: UNICODE.devanagari,
  },
  {
    key: "noto-devanagari-600",
    family: "Noto Sans Devanagari",
    weight: 600,
    url: notoDevanagari600,
    unicodeRange: UNICODE.devanagari,
  },
  {
    key: "noto-devanagari-700",
    family: "Noto Sans Devanagari",
    weight: 700,
    url: notoDevanagari700,
    unicodeRange: UNICODE.devanagari,
  },
];

let baseFontEmbedCssPromise: Promise<string> | null = null;

/** FileReader avoids Safari's argument-count limit on `String.fromCharCode(...)`. */
function bytesToDataUri(bytes: Uint8Array, mime: string): Promise<string> {
  const blob = new Blob([bytes], { type: mime });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not encode font"));
    reader.readAsDataURL(blob);
  });
}

async function fontUrlToDataUri(url: string, mime: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch font ${url}: ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytesToDataUri(bytes, mime);
}

function fontFaceCss(
  family: string,
  weight: number,
  dataUri: string,
  unicodeRange: string,
  format: "woff2" | "truetype" | "opentype",
): string {
  return [
    "@font-face {",
    `  font-family: '${family}';`,
    "  font-style: normal;",
    `  font-weight: ${weight};`,
    `  src: url(${dataUri}) format('${format}');`,
    `  unicode-range: ${unicodeRange};`,
    "}",
  ].join("\n");
}

/**
 * WebKit does not apply WOFF2 fonts inside an SVG `<foreignObject>` image.
 * Decode WOFF (zlib) to TrueType/OpenType, which Safari can draw.
 */
async function webKitFontFaceCss(face: CardFontFace): Promise<string> {
  const url = await loadWebKitWoffUrl(face.key);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch font ${url}: ${res.status}`);
  }
  const sfnt = woffToSfnt(new Uint8Array(await res.arrayBuffer()));
  const mime = sfnt.format === "opentype" ? "font/otf" : "font/ttf";
  const dataUri = await bytesToDataUri(sfnt.bytes, mime);
  return fontFaceCss(
    face.family,
    face.weight,
    dataUri,
    face.unicodeRange,
    sfnt.format,
  );
}

function loadWebKitWoffUrl(key: string): Promise<string> {
  switch (key) {
    case "poppins-latin-500":
      return import("@fontsource/poppins/files/poppins-latin-500-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-latin-600":
      return import("@fontsource/poppins/files/poppins-latin-600-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-latin-700":
      return import("@fontsource/poppins/files/poppins-latin-700-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-latin-ext-500":
      return import("@fontsource/poppins/files/poppins-latin-ext-500-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-latin-ext-600":
      return import("@fontsource/poppins/files/poppins-latin-ext-600-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-latin-ext-700":
      return import("@fontsource/poppins/files/poppins-latin-ext-700-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-devanagari-500":
      return import("@fontsource/poppins/files/poppins-devanagari-500-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-devanagari-600":
      return import("@fontsource/poppins/files/poppins-devanagari-600-normal.woff?url").then(
        (m) => m.default,
      );
    case "poppins-devanagari-700":
      return import("@fontsource/poppins/files/poppins-devanagari-700-normal.woff?url").then(
        (m) => m.default,
      );
    case "noto-devanagari-500":
      return import("@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-500-normal.woff?url").then(
        (m) => m.default,
      );
    case "noto-devanagari-600":
      return import("@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-600-normal.woff?url").then(
        (m) => m.default,
      );
    case "noto-devanagari-700":
      return import("@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff?url").then(
        (m) => m.default,
      );
    default:
      return Promise.reject(new Error(`Unknown card font ${key}`));
  }
}

/**
 * Build inlined @font-face CSS from same-origin woff2 files so html-to-image
 * rasterisation does not fall back to system fonts (Google Fonts CORS).
 */
export function getBaseCardFontEmbedCss(): Promise<string> {
  if (!baseFontEmbedCssPromise) {
    baseFontEmbedCssPromise = (async () => {
      const rules = await Promise.all(
        CARD_FONT_FACES.map(async (face) => {
          if (isWebKit()) return webKitFontFaceCss(face);
          const dataUri = await fontUrlToDataUri(face.url, "font/woff2");
          return fontFaceCss(
            face.family,
            face.weight,
            dataUri,
            face.unicodeRange,
            "woff2",
          );
        }),
      );
      return rules.join("\n");
    })().catch((err) => {
      baseFontEmbedCssPromise = null;
      console.error("Failed to build card font embed CSS", err);
      return "";
    });
  }
  return baseFontEmbedCssPromise;
}

/** Shared card stacks for each capture (custom toolbar fonts are not embedded). */
export async function buildFontEmbedCss(_node: HTMLElement): Promise<string> {
  return getBaseCardFontEmbedCss();
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
    loads.push(
      document.fonts.load(`${weight} 32px "Poppins"`, SAMPLE_LATIN),
    );
    loads.push(
      document.fonts.load(
        `${weight} 32px "Poppins"`,
        SAMPLE_DEVANAGARI,
      ),
    );
    loads.push(
      document.fonts.load(
        `${weight} 32px "Noto Sans Devanagari"`,
        SAMPLE_DEVANAGARI,
      ),
    );
  }
  await Promise.allSettled(loads);
  await document.fonts.ready;
}

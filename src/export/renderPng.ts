import { toBlob } from "html-to-image";

export type PngLayoutSize = { width: number; height: number };

export type RenderPngOptions = {
  fontEmbedCSS?: string;
};

const RASTER_OPTIONS = {
  pixelRatio: 1,
  skipAutoScale: true,
  backgroundColor: "#ffffff",
  preferredFontFormat: "woff2" as const,
};

/** Forces layout so DOM updates are visible before rasterising. */
export function forceLayout(node: HTMLElement): void {
  void node.offsetWidth;
}

/** Wait two animation frames so React layout and fonts paint before rasterising. */
export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Ensures background `<img>` elements are decoded before rasterising. */
export async function waitForImagesIn(node: HTMLElement): Promise<void> {
  const imgs = [...node.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

/**
 * Rasterises `node` to a PNG. Prefer passing **measured** `size` from the same node
 * (`offsetWidth` / `offsetHeight`) so html-to-image does not stretch the SVG raster
 * when the DOM size differs from the canvas card dimensions.
 */
export async function renderNodeToPng(
  node: HTMLElement,
  size: PngLayoutSize,
  options?: RenderPngOptions,
): Promise<Blob> {
  const w = Math.max(1, Math.round(size.width));
  const h = Math.max(1, Math.round(size.height));
  const blob = await toBlob(node, {
    ...RASTER_OPTIONS,
    width: w,
    height: h,
    canvasWidth: w,
    canvasHeight: h,
    // Prefer our inlined same-origin fonts; skip remote stylesheet scraping (CORS).
    ...(options?.fontEmbedCSS
      ? { fontEmbedCSS: options.fontEmbedCSS, skipFonts: true }
      : {}),
  });
  if (!blob) throw new Error("PNG export failed");
  return blob;
}

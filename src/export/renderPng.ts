import { toBlob, toSvg } from "html-to-image";
import { isWebKit } from "./browser";

export type PngLayoutSize = { width: number; height: number };

export type RenderPngOptions = {
  fontEmbedCSS?: string;
};

const RASTER_OPTIONS = {
  pixelRatio: 1,
  skipAutoScale: true,
  backgroundColor: "#ffffff",
  preferredFontFormat: "woff2" as const,
  /** Stops Safari dark-mode from painting the foreignObject blank. */
  style: { colorScheme: "light" } as Partial<CSSStyleDeclaration>,
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
          if (img.complete && img.naturalWidth > 0) {
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

type RasterSize = { width: number; height: number };

function rasterSize(size: PngLayoutSize): RasterSize {
  return {
    width: Math.max(1, Math.round(size.width)),
    height: Math.max(1, Math.round(size.height)),
  };
}

function rasterOptions(size: RasterSize, fontEmbedCSS: string | undefined) {
  const embed = fontEmbedCSS?.trim() ? fontEmbedCSS : undefined;
  return {
    ...RASTER_OPTIONS,
    width: size.width,
    height: size.height,
    canvasWidth: size.width,
    canvasHeight: size.height,
    // WebKit cannot use the page's WOFF2 faces inside the SVG snapshot.
    ...(embed || isWebKit()
      ? { fontEmbedCSS: embed ?? "/* no embedded fonts */", skipFonts: true }
      : {}),
  };
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
  const box = rasterSize(size);
  if (isWebKit()) {
    const embed = options?.fontEmbedCSS?.trim() ? options.fontEmbedCSS : undefined;
    try {
      const withFonts = await renderWebKitPng(node, box, embed);
      if (embed && (await isMostlyBlankWhitePng(withFonts))) {
        return renderWebKitPng(node, box, undefined);
      }
      return withFonts;
    } catch (err) {
      if (!embed) throw err;
      return renderWebKitPng(node, box, undefined);
    }
  }

  const blob = await toBlob(node, rasterOptions(box, options?.fontEmbedCSS));
  if (!blob) throw new Error("PNG export failed");
  return blob;
}

/**
 * Safari's first `drawImage` of an SVG foreignObject is blank. Redraw the same
 * decoded image a few times, which is what actually paints the card.
 */
async function renderWebKitPng(
  node: HTMLElement,
  size: RasterSize,
  fontEmbedCSS: string | undefined,
): Promise<Blob> {
  const svgUrl = await toSvg(node, rasterOptions(size, fontEmbedCSS));
  const img = new Image();
  img.decoding = "sync";
  img.alt = "";
  img.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(img);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("PNG export failed"));
      img.src = svgUrl;
    });
    try {
      await img.decode();
    } catch {
      // Safari often rejects decode() for SVG data URLs after onload.
    }

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PNG export failed");

    const paint = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(img, 0, 0, size.width, size.height);
    };
    paint();
    for (const delay of [50, 100, 150]) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      paint();
    }

    const blob = await canvasToPngBlob(canvas);
    if (!blob) throw new Error("PNG export failed");
    return blob;
  } finally {
    img.remove();
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 8000);
    canvas.toBlob((blob) => {
      window.clearTimeout(timer);
      if (blob) {
        resolve(blob);
        return;
      }
      try {
        resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
      } catch {
        resolve(null);
      }
    }, "image/png");
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function isMostlyBlankWhitePng(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      return sampledBitmapIsBlank(bitmap);
    } finally {
      bitmap.close();
    }
  } catch {
    return false;
  }
}

function sampledBitmapIsBlank(bitmap: ImageBitmap): boolean {
  const sampleW = Math.min(96, bitmap.width);
  const sampleH = Math.min(54, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  let whiteish = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! > 248 && data[i + 1]! > 248 && data[i + 2]! > 248) {
      whiteish++;
    }
  }
  return pixels > 0 && whiteish / pixels > 0.98;
}

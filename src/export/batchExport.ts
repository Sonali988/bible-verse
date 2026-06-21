import type { VersePage } from "../bible/types";
import type { ExportRasterHost } from "./ExportRasterHost";
import type { ExportVariant } from "./exportVariant";
import { buildFontEmbedCss, ensureCardFontsReady, getBaseCardFontEmbedCss } from "./exportFonts";
import {
  forceLayout,
  renderNodeToPng,
  waitForImagesIn,
  waitForPaint,
  type PngLayoutSize,
} from "./renderPng";

function pageHasVerseText(page: VersePage): boolean {
  return page.textEn.trim().length > 0 || page.textHi.trim().length > 0;
}

function renderHasVerseText(node: HTMLElement): boolean {
  return (node.textContent?.trim().length ?? 0) > 0;
}

/** Detects the all-white PNG html-to-image produces when capture sees no painted content. */
async function isMostlyBlankWhitePng(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    const sampleW = Math.min(96, bitmap.width);
    const sampleH = Math.min(54, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return false;
    }
    ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
    bitmap.close();
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    let whiteish = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 248 && data[i + 1]! > 248 && data[i + 2]! > 248) {
        whiteish++;
      }
    }
    return pixels > 0 && whiteish / pixels > 0.98;
  } catch {
    return false;
  }
}

async function exportLooksBlank(
  blob: Blob,
  node: HTMLElement,
  page: VersePage,
): Promise<boolean> {
  if (!pageHasVerseText(page)) return false;
  if (!renderHasVerseText(node)) return true;
  return isMostlyBlankWhitePng(blob);
}

/** Warm fonts and resolve layout size before a batch export. */
export async function prepareExportBatch(
  host: ExportRasterHost,
  variant: ExportVariant,
  firstPage: VersePage,
): Promise<PngLayoutSize> {
  host.renderPage(firstPage, variant);
  await waitForPaint();
  const typography = host.getTypographyForPage(firstPage, variant);
  await ensureCardFontsReady(typography);
  await document.fonts.ready;
  await getBaseCardFontEmbedCss();
  return host.getLayoutSize(variant);
}

async function rasterizeNode(
  node: HTMLElement,
  size: PngLayoutSize,
): Promise<Blob> {
  forceLayout(node);
  await waitForImagesIn(node);
  const fontEmbedCSS = await buildFontEmbedCss(node);
  return renderNodeToPng(node, size, { fontEmbedCSS });
}

export async function capturePngBlob(
  host: ExportRasterHost,
  page: VersePage,
  variant: ExportVariant,
  layoutSize: PngLayoutSize,
): Promise<Blob> {
  await ensureCardFontsReady(host.getTypographyForPage(page, variant));
  await document.fonts.ready;

  host.renderPage(page, variant);
  await waitForPaint();

  const node = host.getSnapshotNode(variant);
  const size = host.getLayoutSize(variant);
  const rasterSize =
    size.width > 0 && size.height > 0 ? size : layoutSize;

  let blob = await rasterizeNode(node, rasterSize);

  if (await exportLooksBlank(blob, node, page)) {
    host.renderPage(page, variant);
    await waitForPaint();
    blob = await rasterizeNode(host.getSnapshotNode(variant), rasterSize);
  }

  return blob;
}

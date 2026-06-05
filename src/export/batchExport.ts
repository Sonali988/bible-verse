import type { VersePage } from "../bible/types";
import type { ExportRasterHost } from "./ExportRasterHost";
import type { ExportVariant } from "./exportVariant";
import {
  forceLayout,
  prefetchFontEmbedCss,
  renderNodeToPng,
  waitForImagesIn,
  type PngLayoutSize,
} from "./renderPng";

export type ExportBatchContext = {
  fontEmbedCSS: string;
  size: PngLayoutSize;
};

export async function prepareExportBatch(
  host: ExportRasterHost,
  variant: ExportVariant,
  firstPage: VersePage,
): Promise<ExportBatchContext> {
  host.renderPage(firstPage, variant);
  await document.fonts.ready;
  const node = host.getSnapshotNode(variant);
  forceLayout(node);
  await waitForImagesIn(node);
  const fontEmbedCSS = await prefetchFontEmbedCss(node);
  return { fontEmbedCSS, size: host.getLayoutSize(variant) };
}

export async function capturePngBlob(
  host: ExportRasterHost,
  page: VersePage,
  variant: ExportVariant,
  ctx: ExportBatchContext,
): Promise<Blob> {
  host.renderPage(page, variant);
  const node = host.getSnapshotNode(variant);
  forceLayout(node);
  return renderNodeToPng(node, ctx.size, { fontEmbedCSS: ctx.fontEmbedCSS });
}

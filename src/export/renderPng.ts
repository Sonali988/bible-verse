import { toBlob } from "html-to-image";

export type PngLayoutSize = { width: number; height: number };

/**
 * Rasterises `node` to a PNG. Prefer passing **measured** `size` from the same node
 * (`offsetWidth` / `offsetHeight`) so html-to-image does not stretch the SVG raster
 * when the DOM size differs from the canvas card dimensions.
 */
export async function renderNodeToPng(
  node: HTMLElement,
  size: PngLayoutSize,
): Promise<Blob> {
  const w = Math.max(1, Math.round(size.width));
  const h = Math.max(1, Math.round(size.height));
  const blob = await toBlob(node, {
    width: w,
    height: h,
    canvasWidth: w,
    canvasHeight: h,
    pixelRatio: 1,
    cacheBust: true,
    skipAutoScale: true,
    backgroundColor: "#ffffff",
  });
  if (!blob) throw new Error("PNG export failed");
  return blob;
}

import { toBlob } from "html-to-image";

export type PngLayoutSize = { width: number; height: number };

/**
 * Rasterises `node` to a PNG whose pixel size is exactly `width` × `height`.
 * `pixelRatio` is forced to 1 so device DPR does not double dimensions (e.g. 1920×1080 stays 1920×1080).
 */
export async function renderNodeToPng(
  node: HTMLElement,
  size: PngLayoutSize,
): Promise<Blob> {
  const { width, height } = size;
  const blob = await toBlob(node, {
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#ffffff",
  });
  if (!blob) throw new Error("PNG export failed");
  return blob;
}

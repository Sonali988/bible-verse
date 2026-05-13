/**
 * Measure wrapped text in a box using Canvas2D; binary-search font size so height fits.
 */

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    const test = `${line} ${w}`;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = w;
    }
  }
  lines.push(line);
  return lines;
}

function measureWrappedHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  lineHeight: number,
): number {
  const lines = wrapLines(ctx, text, width);
  const lh = ctx.measureText("M").width * lineHeight;
  return lines.length * lh;
}

export function fitBodyFontSize(params: {
  text: string;
  boxWidth: number;
  boxHeight: number;
  fontFamily: string;
  minPx: number;
  maxPx: number;
  lineHeight: number;
}): number {
  const { text, boxWidth, boxHeight, fontFamily, minPx, maxPx, lineHeight } =
    params;
  if (!text.trim()) return maxPx;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return maxPx;

  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `${mid}px ${fontFamily}`;
    const h = measureWrappedHeight(ctx, text, boxWidth - 2, lineHeight);
    if (h <= boxHeight - 2) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

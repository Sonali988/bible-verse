import type { ReactNode } from "react";
import type { HighlightRange } from "../bible/types";

function mergeRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: HighlightRange[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.start <= cur.end) {
      cur.end = Math.max(cur.end, r.end);
    } else {
      out.push(cur);
      cur = { ...r };
    }
  }
  out.push(cur);
  return out;
}

/** Splits `text` into plain / highlighted spans for rendering. */
export function highlightSegments(
  text: string,
  ranges: HighlightRange[],
  highlightColor: string,
): ReactNode[] {
  const merged = mergeRanges(
    ranges
      .map((r) => ({
        start: Math.max(0, Math.min(r.start, text.length)),
        end: Math.max(0, Math.min(r.end, text.length)),
      }))
      .filter((r) => r.end > r.start),
  );
  if (merged.length === 0) return [text];

  const nodes: ReactNode[] = [];
  let pos = 0;
  let key = 0;
  for (const r of merged) {
    if (r.start > pos) {
      nodes.push(text.slice(pos, r.start));
    }
    nodes.push(
      <mark
        key={key++}
        style={{
          backgroundColor: "transparent",
          color: highlightColor,
          fontWeight: 500,
          padding: 0,
          borderRadius: 0,
          textAlign: "inherit",
        }}
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  }
  if (pos < text.length) {
    nodes.push(text.slice(pos));
  }
  return nodes;
}

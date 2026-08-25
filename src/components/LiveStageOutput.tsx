import { useEffect, useRef, useState } from "react";
import type { LayoutSpec, TypographySpec, VersePage } from "../bible/types";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";
import { LiveCardStage } from "./LiveCardStage";

type Props = {
  page: VersePage | null;
  layout: LayoutSpec;
  typography: TypographySpec;
  backgroundDataUrl: string | null;
  versionLabelEn: string;
  versionLabelHi: string;
  verseBlockOrder: VerseBlockOrder;
  className?: string;
};

/** Full-bleed black stage: card letterboxed, empty when nothing is presented. */
export function LiveStageOutput({
  page,
  layout,
  typography,
  backgroundDataUrl,
  versionLabelEn,
  versionLabelHi,
  verseBlockOrder,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: layout.width, h: layout.height });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      setBox({
        w: Math.max(1, el.clientWidth),
        h: Math.max(1, el.clientHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(box.w / layout.width, box.h / layout.height);

  return (
    <div
      ref={hostRef}
      className={className ? `live-stage-output ${className}` : "live-stage-output"}
    >
      {page ? (
        <LiveCardStage
          page={page}
          layout={layout}
          typography={typography}
          backgroundDataUrl={backgroundDataUrl}
          versionLabelEn={versionLabelEn}
          versionLabelHi={versionLabelHi}
          verseBlockOrder={verseBlockOrder}
          scale={scale}
        />
      ) : null}
    </div>
  );
}

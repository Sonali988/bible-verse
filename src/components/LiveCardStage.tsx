import type { CSSProperties } from "react";
import {
  mergePageTypography,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";
import { VerseCard } from "./VerseCard";

type Props = {
  page: VersePage;
  layout: LayoutSpec;
  typography: TypographySpec;
  backgroundDataUrl: string | null;
  versionLabelEn: string;
  versionLabelHi: string;
  verseBlockOrder: VerseBlockOrder;
  /** Scale of the card inside its box (1 = native pixels). */
  scale: number;
  className?: string;
  style?: CSSProperties;
};

/** Renders a Live VerseCard at layout size, optionally CSS-scaled to fit. */
export function LiveCardStage({
  page,
  layout,
  typography,
  backgroundDataUrl,
  versionLabelEn,
  versionLabelHi,
  verseBlockOrder,
  scale,
  className,
  style,
}: Props) {
  const effective = mergePageTypography(typography, page, "typographySizes");
  const scaledW = Math.max(1, Math.round(layout.width * scale));
  const scaledH = Math.max(1, Math.round(layout.height * scale));

  return (
    <div
      className={className}
      style={{
        width: scaledW,
        height: scaledH,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: layout.width,
          height: layout.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <VerseCard
          layout={layout}
          typography={effective}
          page={page}
          backgroundDataUrl={backgroundDataUrl}
          versionLabelEn={page.versionLabelEn ?? versionLabelEn}
          versionLabelHi={page.versionLabelHi ?? versionLabelHi}
          verseBlockOrder={verseBlockOrder}
        />
      </div>
    </div>
  );
}

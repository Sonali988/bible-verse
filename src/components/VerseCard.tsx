import {
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  DEFAULT_CARD_BACKGROUND_COLOR,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import {
  liveCardBlockSequence,
  liveCardRect,
  type VerseBlockOrder,
} from "../lib/verseBlockOrder";
import { formatHindiReference, formatReference } from "../lib/referenceParser";
import { highlightSegments } from "../lib/highlightSegments";
import { verseBodyEdgePadding } from "../lib/verseBoxStyle";

/** Verse body: Poppins Medium (500). Titles keep toolbar fonts + bold. */
const VERSE_BODY_FONT_EN = '"Poppins", system-ui, sans-serif';
const VERSE_BODY_FONT_HI =
  '"Poppins", "Noto Sans Devanagari", system-ui, sans-serif';
const SECTION_MAX_W = 700;
const SECTION_MAX_H = 350;

export type VerseCardProps = {
  layout: LayoutSpec;
  typography: TypographySpec;
  page: VersePage;
  backgroundDataUrl: string | null;
  versionLabelEn: string;
  versionLabelHi: string;
  verseBlockOrder?: VerseBlockOrder;
};

function sectionWidth(r: LayoutSpec["bodyEn"]): number {
  return Math.min(r.width, SECTION_MAX_W);
}

function sectionHeight(r: LayoutSpec["bodyEn"]): number {
  return Math.min(r.height, SECTION_MAX_H);
}

function sectionBox(r: LayoutSpec["bodyEn"]): CSSProperties {
  const sw = sectionWidth(r);
  const sh = sectionHeight(r);
  return {
    width: sw,
    maxWidth: SECTION_MAX_W,
    height: sh,
    maxHeight: SECTION_MAX_H,
    boxSizing: "border-box",
    overflow: "hidden",
    flexShrink: 0,
  };
}

/** Vertical gap matching layout rects; applied as padding on row wrappers. */
function verticalGapBelow(prev: LayoutSpec["bodyEn"], next: LayoutSpec["bodyEn"]): number {
  return Math.max(0, next.y - (prev.y + prev.height));
}

const rowOuter = (padTop: number): CSSProperties => ({
  display: "flex",
  flexDirection: "row",
  width: "100%",
  flexShrink: 0,
  paddingTop: padTop,
  boxSizing: "border-box",
});

/** Verse body alignment + hyphenation helper (no text-justify / text-align-last). */
function verseBodyAlignmentStyle(
  typography: TypographySpec,
  script: "hi" | "en",
): Pick<CSSProperties, "textAlign" | "hyphens"> {
  const ta = typography.textAlign;
  if (ta === "justify") {
    return {
      textAlign: "justify",
      hyphens: script === "en" ? "auto" : "manual",
    };
  }
  return { textAlign: ta };
}

export function VerseCard({
  layout,
  typography,
  page,
  backgroundDataUrl,
  versionLabelEn,
  versionLabelHi,
  verseBlockOrder = "hi-first",
}: VerseCardProps) {
  const [bgLoadFailed, setBgLoadFailed] = useState(false);

  useLayoutEffect(() => {
    setBgLoadFailed(false);
  }, [backgroundDataUrl]);

  const hasRasterBg = Boolean(backgroundDataUrl?.trim());

  const titleLineEn = (refLabel: string, version: string) =>
    `${refLabel} ${version}`;

  const refLabelEn = formatReference(page.ref);
  const titleHiText = `${formatHindiReference(page.ref)} ${versionLabelHi}`;

  const blockSequence = liveCardBlockSequence(verseBlockOrder);
  const blockRects = blockSequence.map((kind) =>
    liveCardRect(layout, kind, verseBlockOrder),
  );

  return (
    <div
      className="verse-card-root"
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
        boxSizing: "border-box",
        color: "#ffffff",
      }}
    >
      {hasRasterBg && !bgLoadFailed ? (
        <img
          alt=""
          role="presentation"
          className="verse-card-bg"
          key={backgroundDataUrl}
          src={backgroundDataUrl!}
          draggable={false}
          onError={() => setBgLoadFailed(true)}
          style={{
            gridRow: 1,
            gridColumn: 1,
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            alignSelf: "stretch",
            justifySelf: "stretch",
            objectFit: "cover",
            objectPosition: "left top",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          className="verse-card-bg"
          aria-hidden
          style={{
            gridRow: 1,
            gridColumn: 1,
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
            alignSelf: "stretch",
            justifySelf: "stretch",
            overflow: "hidden",
            background: DEFAULT_CARD_BACKGROUND_COLOR,
          }}
        />
      )}
      <div
        className="verse-card-content"
        style={{
          gridRow: 1,
          gridColumn: 1,
          zIndex: 1,
          width: layout.width,
          boxSizing: "border-box",
          alignSelf: "start",
          justifySelf: "start",
          paddingTop: blockRects[0]?.y ?? layout.titleHi.y,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {blockSequence.map((kind, index) => {
          const rect = blockRects[index]!;
          const padTop =
            index === 0
              ? 0
              : verticalGapBelow(blockRects[index - 1]!, rect);

          if (kind === "titleHi") {
            return (
              <div key={kind} style={rowOuter(padTop)}>
                <div style={{ width: rect.x, flexShrink: 0 }} aria-hidden />
                <div
                  style={{
                    ...sectionBox(rect),
                    fontFamily: typography.fontFamilyHi,
                    fontSize: typography.titleFontPxHi,
                    fontWeight: 700,
                    fontStyle: "normal",
                    color: typography.titleColor,
                    textAlign: typography.titleTextAlign,
                  }}
                >
                  {titleHiText}
                </div>
              </div>
            );
          }

          if (kind === "bodyHi") {
            return (
              <div key={kind} style={rowOuter(padTop)}>
                <div style={{ width: rect.x, flexShrink: 0 }} aria-hidden />
                <div
                  lang="hi"
                  className="verse-body-box"
                  style={{
                    ...sectionBox(rect),
                    ...verseBodyEdgePadding(typography.bodyFontPxHi, "hi"),
                    display: "block",
                    fontFamily: VERSE_BODY_FONT_HI,
                    fontSize: typography.bodyFontPxHi,
                    lineHeight: typography.lineHeightHi,
                    ...verseBodyAlignmentStyle(typography, "hi"),
                    fontWeight: 700,
                    color: typography.bodyColor,
                  }}
                >
                  {highlightSegments(
                    page.textHi,
                    page.highlightsHi,
                    typography.highlightColor,
                  )}
                </div>
              </div>
            );
          }

          if (kind === "titleEn") {
            return (
              <div key={kind} style={rowOuter(padTop)}>
                <div style={{ width: rect.x, flexShrink: 0 }} aria-hidden />
                <div
                  style={{
                    ...sectionBox(rect),
                    fontFamily: typography.fontFamilyEn,
                    fontSize: typography.titleFontPxEn,
                    fontWeight: 700,
                    fontStyle: "normal",
                    color: typography.titleColor,
                    textAlign: typography.titleTextAlign,
                  }}
                >
                  {titleLineEn(refLabelEn, versionLabelEn)}
                </div>
              </div>
            );
          }

          return (
            <div key={kind} style={rowOuter(padTop)}>
              <div style={{ width: rect.x, flexShrink: 0 }} aria-hidden />
              <div
                lang="en"
                className="verse-body-box"
                style={{
                  ...sectionBox(rect),
                  ...verseBodyEdgePadding(typography.bodyFontPxEn, "en"),
                  display: "block",
                  fontFamily: VERSE_BODY_FONT_EN,
                  fontSize: typography.bodyFontPxEn,
                  lineHeight: typography.lineHeightEn,
                  ...verseBodyAlignmentStyle(typography, "en"),
                  fontWeight: 700,
                  color: typography.bodyColor,
                }}
              >
                {highlightSegments(
                  page.textEn,
                  page.highlightsEn,
                  typography.highlightColor,
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

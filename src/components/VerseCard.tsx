import {
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import type { LayoutSpec, TypographySpec, VersePage } from "../bible/types";
import { formatHindiReference, formatReference } from "../lib/referenceParser";
import { highlightSegments } from "../lib/highlightSegments";

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
              background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)",
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
            paddingTop: layout.titleHi.y,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {/* Hindi first, then English — positions from layout (default: Hindi title from 130px top). */}
          <div style={rowOuter(0)}>
            <div style={{ width: layout.titleHi.x, flexShrink: 0 }} aria-hidden />
            <div
              style={{
                ...sectionBox(layout.titleHi),
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
          <div style={rowOuter(verticalGapBelow(layout.titleHi, layout.bodyHi))}>
            <div style={{ width: layout.bodyHi.x, flexShrink: 0 }} aria-hidden />
            <div
              lang="hi"
              style={{
                ...sectionBox(layout.bodyHi),
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
          <div style={rowOuter(verticalGapBelow(layout.bodyHi, layout.titleEn))}>
            <div style={{ width: layout.titleEn.x, flexShrink: 0 }} aria-hidden />
            <div
              style={{
                ...sectionBox(layout.titleEn),
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
          <div style={rowOuter(verticalGapBelow(layout.titleEn, layout.bodyEn))}>
            <div style={{ width: layout.bodyEn.x, flexShrink: 0 }} aria-hidden />
            <div
              lang="en"
              style={{
                ...sectionBox(layout.bodyEn),
                display: "block",
                fontFamily: VERSE_BODY_FONT_EN,
                fontSize: typography.bodyFontPxEn,
                lineHeight: typography.lineHeightEn,
                ...verseBodyAlignmentStyle(typography, "en"),
                fontWeight: 700,
                color: typography.bodyColor,
                textShadow:
                  "0 1px 4px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.55)",
              }}
            >
              {highlightSegments(
                page.textEn,
                page.highlightsEn,
                typography.highlightColor,
              )}
            </div>
          </div>
        </div>
      </div>
    );
}

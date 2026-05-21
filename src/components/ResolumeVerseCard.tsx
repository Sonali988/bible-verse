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
import { formatHindiReference, formatReference } from "../lib/referenceParser";
import { highlightSegments } from "../lib/highlightSegments";

const VERSE_BODY_FONT_EN = '"Poppins", system-ui, sans-serif';
const VERSE_BODY_FONT_HI =
  '"Poppins", "Noto Sans Devanagari", system-ui, sans-serif';

export type ResolumeVerseCardProps = {
  layout: LayoutSpec;
  typography: TypographySpec;
  page: VersePage;
  backgroundDataUrl: string | null;
  versionLabelEn: string;
  versionLabelHi: string;
};

function boxStyle(r: { x: number; y: number; width: number; height: number }): CSSProperties {
  return {
    position: "absolute",
    left: r.x,
    top: r.y,
    width: r.width,
    height: r.height,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

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

export function ResolumeVerseCard({
  layout,
  typography,
  page,
  backgroundDataUrl,
  versionLabelEn,
  versionLabelHi,
}: ResolumeVerseCardProps) {
  const [bgLoadFailed, setBgLoadFailed] = useState(false);

  useLayoutEffect(() => {
    setBgLoadFailed(false);
  }, [backgroundDataUrl]);

  const hasRasterBg = Boolean(backgroundDataUrl?.trim());
  const combinedTitle = layout.titleHi;
  const hiTitle = `${formatHindiReference(page.ref)} ${versionLabelHi}`;
  const enTitle = `${formatReference(page.ref)} ${versionLabelEn}`;

  return (
    <div
      className="verse-card-root verse-card-root--resolume"
      style={{
        width: layout.width,
        height: layout.height,
        position: "relative",
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
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
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
            position: "absolute",
            inset: 0,
            background: DEFAULT_CARD_BACKGROUND_COLOR,
          }}
        />
      )}

      <div
        className="verse-card-content verse-card-content--resolume"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{
            ...boxStyle(combinedTitle),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: typography.titleColor,
            textAlign: typography.titleTextAlign,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span
            style={{
              fontFamily: typography.fontFamilyHi,
              fontSize: typography.titleFontPxHi,
            }}
          >
            {hiTitle}
          </span>
          <span style={{ margin: "0 0.35em", opacity: 0.85, fontSize: typography.titleFontPxHi, fontWeight: 700 }}> | </span>
          <span
            style={{
              fontFamily: typography.fontFamilyEn,
              fontSize: typography.titleFontPxEn,
            }}
          >
            {enTitle}
          </span>
        </div>

        <div
          lang="hi"
          style={{
            ...boxStyle(layout.bodyHi),
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

        <div
          lang="en"
          style={{
            ...boxStyle(layout.bodyEn),
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
  );
}

import {
  Fragment,
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
import { verseTitleEn, verseTitleHi } from "../lib/verseTitles";
import { highlightSegments } from "../lib/highlightSegments";
import { verseBodyRect, type VerseBlockOrder } from "../lib/verseBlockOrder";
import {
  absoluteTextBox,
  resolumeTitleEdgePadding,
  verseBodyEdgePadding,
} from "../lib/verseBoxStyle";

export type ResolumeVerseCardProps = {
  layout: LayoutSpec;
  typography: TypographySpec;
  page: VersePage;
  backgroundDataUrl: string | null;
  versionLabelEn: string;
  versionLabelHi: string;
  verseBlockOrder?: VerseBlockOrder;
};

function titleFlexJustify(
  align: TypographySpec["titleTextAlign"],
): CSSProperties["justifyContent"] {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

function verseBodyAlignmentStyle(
  typography: TypographySpec,
  script: "hi" | "en",
): Pick<CSSProperties, "textAlign" | "textAlignLast" | "hyphens"> {
  const ta = typography.textAlign;
  if (ta === "justify") {
    return {
      textAlign: "justify",
      textAlignLast: "left",
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
  verseBlockOrder = "hi-first",
}: ResolumeVerseCardProps) {
  const [bgLoadFailed, setBgLoadFailed] = useState(false);

  useLayoutEffect(() => {
    setBgLoadFailed(false);
  }, [backgroundDataUrl]);

  const hasRasterBg = Boolean(backgroundDataUrl?.trim());
  const combinedTitle = layout.titleHi;
  const hiTitle = verseTitleHi(page, versionLabelHi);
  const enTitle = verseTitleEn(page, versionLabelEn);
  const hiBodyRect = verseBodyRect(layout, "hi", verseBlockOrder);
  const enBodyRect = verseBodyRect(layout, "en", verseBlockOrder);
  const titleParts =
    verseBlockOrder === "en-first"
      ? (
          [
            {
              key: "en",
              text: enTitle,
              fontFamily: typography.fontFamilyEn,
              fontSize: typography.titleFontPxEn,
            },
            {
              key: "hi",
              text: hiTitle,
              fontFamily: typography.fontFamilyHi,
              fontSize: typography.titleFontPxHi,
            },
          ] as const
        )
      : (
          [
            {
              key: "hi",
              text: hiTitle,
              fontFamily: typography.fontFamilyHi,
              fontSize: typography.titleFontPxHi,
            },
            {
              key: "en",
              text: enTitle,
              fontFamily: typography.fontFamilyEn,
              fontSize: typography.titleFontPxEn,
            },
          ] as const
        );

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
          className="resolume-title-box"
          style={{
            ...absoluteTextBox(combinedTitle),
            ...resolumeTitleEdgePadding(
              typography.titleFontPxHi,
              typography.titleFontPxEn,
            ),
            display: "flex",
            alignItems: "center",
            justifyContent: titleFlexJustify(typography.titleTextAlign),
            fontWeight: 600,
            color: typography.titleColor,
            textAlign: typography.titleTextAlign,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {titleParts.map((part, index) => (
            <Fragment key={part.key}>
              {index > 0 && (
                <span
                  className="resolume-title-separator"
                  aria-hidden
                  style={{
                    fontSize: titleParts[index - 1]!.fontSize,
                  }}
                />
              )}
              <span
                style={{
                  fontFamily: part.fontFamily,
                  fontSize: part.fontSize,
                  lineHeight: part.key === "hi" ? 1.35 : 1.2,
                }}
              >
                {part.text}
              </span>
            </Fragment>
          ))}
        </div>

        <div
          lang="hi"
          className="verse-body-box"
          style={{
            ...absoluteTextBox(hiBodyRect),
            ...verseBodyEdgePadding(typography.bodyFontPxHi, "hi"),
            fontFamily: typography.fontFamilyHi,
            fontSize: typography.bodyFontPxHi,
            lineHeight: typography.lineHeightHi,
            ...verseBodyAlignmentStyle(typography, "hi"),
            fontWeight: 500,
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
          className="verse-body-box"
          style={{
            ...absoluteTextBox(enBodyRect),
            ...verseBodyEdgePadding(typography.bodyFontPxEn, "en"),
            fontFamily: typography.fontFamilyEn,
            fontSize: typography.bodyFontPxEn,
            lineHeight: typography.lineHeightEn,
            ...verseBodyAlignmentStyle(typography, "en"),
            fontWeight: 500,
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
    </div>
  );
}

import {
  mergePageTypography,
  type LayoutSpec,
  type PageTypographyOverrides,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import { VerseCard } from "./VerseCard";
import { ResolumeVerseCard } from "./ResolumeVerseCard";
import { CardPreviewTypographyControls } from "./CardPreviewTypographyControls";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { formatReference } from "../lib/referenceParser";
import type { PreviewScrollTarget } from "../lib/previewScroll";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";

type Props = {
  pages: VersePage[];
  selectedId: string | null;
  selected: VersePage | null;
  editRailOpen: boolean;
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  cardBackgroundUrl: string | null;
  englishLabel: string;
  hindiLabel: string;
  verseBlockOrder: VerseBlockOrder;
  previewScale: number;
  previewScaledSize: { w: number; h: number };
  previewScaleResolume: number;
  previewScaledSizeResolume: { w: number; h: number };
  selectedLiveTypography: TypographySpec;
  selectedResolumeTypography: TypographySpec;
  onSelectPage: (id: string, target: PreviewScrollTarget) => void;
  onUpdateLiveTypography: (patch: PageTypographyOverrides) => void;
  onUpdateResolumeTypography: (patch: PageTypographyOverrides) => void;
};

export function CardPreviewSection({
  pages,
  selectedId,
  selected,
  editRailOpen,
  cardLayout,
  resolumeLayout,
  typography,
  resolumeTypography,
  cardBackgroundUrl,
  englishLabel,
  hindiLabel,
  verseBlockOrder,
  previewScale,
  previewScaledSize,
  previewScaleResolume,
  previewScaledSizeResolume,
  selectedLiveTypography,
  selectedResolumeTypography,
  onSelectPage,
  onUpdateLiveTypography,
  onUpdateResolumeTypography,
}: Props) {
  return (
    <>
      <p className="hint workflow-tabs-hint">
        {editRailOpen ? (
          <>
            Card layout and fonts are in the <strong>Edit card</strong> panel on the
            right. Click a preview card to adjust per-card font sizes below each strip.
          </>
        ) : (
          <>
            Use <strong>Edit card layout</strong> in the header to open the design panel.
            Click a preview card to adjust per-card font sizes below each strip.
          </>
        )}
      </p>

      {pages.length === 0 ? (
        <p className="muted">Add verses to the queue to preview cards.</p>
      ) : (
        <div className="preview-dual-stack">
        <CollapsiblePanel
          title="Card preview — Live"
          subtitle="Click a card to select · Live typography below"
          defaultOpen
        >
          <div className="preview-cards-strip">
            {pages.map((p) => (
              <div key={p.id} className="preview-card-wrap">
                <div
                  id={`preview-card-${p.id}`}
                  className={
                    p.id === selectedId
                      ? "preview-card-slot preview-card-slot--selected"
                      : "preview-card-slot"
                  }
                  style={{
                    width: previewScaledSize.w,
                    height: previewScaledSize.h,
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Select ${formatReference(p.ref)}`}
                  onClick={() => onSelectPage(p.id, "live")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectPage(p.id, "live");
                    }
                  }}
                >
                  <div
                    className="preview-scale-frame"
                    style={{
                      width: cardLayout.width,
                      height: cardLayout.height,
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      className="preview-scale-content"
                      style={{
                        width: cardLayout.width,
                        height: cardLayout.height,
                      }}
                    >
                      <VerseCard
                        layout={cardLayout}
                        typography={mergePageTypography(typography, p)}
                        page={p}
                        backgroundDataUrl={cardBackgroundUrl}
                        versionLabelEn={p.versionLabelEn ?? englishLabel}
                        versionLabelHi={p.versionLabelHi ?? hindiLabel}
                        verseBlockOrder={verseBlockOrder}
                      />
                    </div>
                  </div>
                </div>
                <p className="preview-card-caption">{formatReference(p.ref)}</p>
              </div>
            ))}
          </div>

          <CardPreviewTypographyControls
            previewLabel="Live"
            typography={selectedLiveTypography}
            enabled={Boolean(selected)}
            onUpdate={onUpdateLiveTypography}
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          title="Card preview — Resolume"
          subtitle="Click a card to select · Resolume typography below"
          defaultOpen
        >
          <div className="preview-cards-strip">
            {pages.map((p) => (
              <div key={`resolume-${p.id}`} className="preview-card-wrap">
                <div
                  id={`preview-card-resolume-${p.id}`}
                  className={
                    p.id === selectedId
                      ? "preview-card-slot preview-card-slot--selected"
                      : "preview-card-slot"
                  }
                  style={{
                    width: previewScaledSizeResolume.w,
                    height: previewScaledSizeResolume.h,
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Select ${formatReference(p.ref)}`}
                  onClick={() => onSelectPage(p.id, "resolume")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectPage(p.id, "resolume");
                    }
                  }}
                >
                  <div
                    className="preview-scale-frame"
                    style={{
                      width: resolumeLayout.width,
                      height: resolumeLayout.height,
                      transform: `scale(${previewScaleResolume})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      className="preview-scale-content"
                      style={{
                        width: resolumeLayout.width,
                        height: resolumeLayout.height,
                      }}
                    >
                      <ResolumeVerseCard
                        layout={resolumeLayout}
                        typography={mergePageTypography(
                          resolumeTypography,
                          p,
                          "resolumeTypographySizes",
                        )}
                        page={p}
                        backgroundDataUrl={cardBackgroundUrl}
                        versionLabelEn={p.versionLabelEn ?? englishLabel}
                        versionLabelHi={p.versionLabelHi ?? hindiLabel}
                        verseBlockOrder={verseBlockOrder}
                      />
                    </div>
                  </div>
                </div>
                <p className="preview-card-caption">{formatReference(p.ref)}</p>
              </div>
            ))}
          </div>

          <CardPreviewTypographyControls
            previewLabel="Resolume"
            typography={selectedResolumeTypography}
            enabled={Boolean(selected)}
            onUpdate={onUpdateResolumeTypography}
          />
        </CollapsiblePanel>
      </div>
      )}
    </>
  );
}

import type { LayoutSpec, TypographySpec } from "../bible/types";
import { DesignToolbar } from "./DesignToolbar";
import { VerseOrderControl } from "./VerseOrderControl";
import type { ExportVariant } from "../export/exportVariant";
import type { VerseBlockOrder } from "../lib/verseBlockOrder";

type Props = {
  workflowVariant: ExportVariant;
  verseBlockOrder: VerseBlockOrder;
  cardLayout: LayoutSpec;
  resolumeLayout: LayoutSpec;
  typography: TypographySpec;
  resolumeTypography: TypographySpec;
  onVariantChange: (variant: ExportVariant) => void;
  onVerseBlockOrderChange: (order: VerseBlockOrder) => void;
  onUpdateCardLayout: (fn: (prev: LayoutSpec) => LayoutSpec) => void;
  onUpdateTypography: (fn: (prev: TypographySpec) => TypographySpec) => void;
  onUpdateResolumeLayout: (fn: (prev: LayoutSpec) => LayoutSpec) => void;
  onUpdateResolumeTypography: (fn: (prev: TypographySpec) => TypographySpec) => void;
  onResetCardDesign: () => void;
  onResetResolumeDesign: () => void;
  onClose: () => void;
};

export function EditCardRail({
  workflowVariant,
  verseBlockOrder,
  cardLayout,
  resolumeLayout,
  typography,
  resolumeTypography,
  onVariantChange,
  onVerseBlockOrderChange,
  onUpdateCardLayout,
  onUpdateTypography,
  onUpdateResolumeLayout,
  onUpdateResolumeTypography,
  onResetCardDesign,
  onResetResolumeDesign,
  onClose,
}: Props) {
  return (
    <aside className="app-edit-rail" aria-label="Edit card design">
      <div className="app-edit-rail__chrome">
        <p className="workflow-heading app-edit-rail__heading">Edit card</p>
        <button
          type="button"
          className="app-edit-rail__close"
          aria-label="Close edit panel"
          onClick={onClose}
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      <section className="panel app-edit-rail__panel app-edit-rail__panel--order">
        <VerseOrderControl value={verseBlockOrder} onChange={onVerseBlockOrderChange} />
      </section>
      <div className="variant-tabs" role="tablist" aria-label="Edit card variant">
        <button
          type="button"
          role="tab"
          aria-selected={workflowVariant === "live"}
          className={
            workflowVariant === "live"
              ? "variant-tab variant-tab--active"
              : "variant-tab"
          }
          onClick={() => onVariantChange("live")}
        >
          Live
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workflowVariant === "resolume"}
          className={
            workflowVariant === "resolume"
              ? "variant-tab variant-tab--active"
              : "variant-tab"
          }
          onClick={() => onVariantChange("resolume")}
        >
          Resolume
        </button>
      </div>

      <section className="panel app-edit-rail__panel">
        {workflowVariant === "live" ? (
          <>
            <h2 className="app-edit-rail__title">Live layout</h2>
            <p className="hint app-edit-rail__hint">Canvas, text boxes, and global fonts.</p>
            <DesignToolbar
              mode="live"
              layout={cardLayout}
              onUpdateLayout={onUpdateCardLayout}
              typography={typography}
              onUpdateTypography={onUpdateTypography}
              onResetDesign={onResetCardDesign}
            />
          </>
        ) : (
          <>
            <h2 className="app-edit-rail__title">Resolume layout</h2>
            <p className="hint app-edit-rail__hint">
              Combined title, verse boxes, and global fonts.
            </p>
            <DesignToolbar
              mode="resolume"
              layout={resolumeLayout}
              onUpdateLayout={onUpdateResolumeLayout}
              typography={resolumeTypography}
              onUpdateTypography={onUpdateResolumeTypography}
              onResetDesign={onResetResolumeDesign}
            />
          </>
        )}
      </section>
    </aside>
  );
}

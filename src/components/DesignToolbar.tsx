import type { LayoutSpec, Rect, TypographySpec, PageTypographySizeOverrides } from "../bible/types";

type Props = {
  layout: LayoutSpec;
  onUpdateLayout: (fn: (prev: LayoutSpec) => LayoutSpec) => void;
  typography: TypographySpec;
  /** Merged global + selected card font sizes (for “Font sizes” row only). */
  fontTypography: TypographySpec;
  /** When false, font size inputs are disabled (sizes apply only to the selected queue card). */
  fontSizesEnabled: boolean;
  onUpdateTypography: (fn: (prev: TypographySpec) => TypographySpec) => void;
  onUpdateFontSizes: (patch: PageTypographySizeOverrides) => void;
  onResetDesign: () => void;
};

type RectKey = keyof Pick<
  LayoutSpec,
  "titleEn" | "bodyEn" | "titleHi" | "bodyHi"
>;

function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label className="toolbar-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function PxSlider({
  label,
  value,
  onChange,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  const safeValue = Number.isFinite(value) ? Math.round(value) : min;
  return (
    <label className="toolbar-field">
      <span>
        {label}: {safeValue}
      </span>
      <input
        type="range"
        value={safeValue}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function patchRect(
  layout: LayoutSpec,
  key: RectKey,
  patch: Partial<Rect>,
): LayoutSpec {
  return {
    ...layout,
    [key]: { ...layout[key], ...patch },
  };
}

function clampVersePx(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(6, Math.min(400, Math.round(n)));
}

function RectFields({
  rectKey,
  layout,
  onUpdateLayout,
}: {
  rectKey: RectKey;
  layout: LayoutSpec;
  onUpdateLayout: Props["onUpdateLayout"];
}) {
  const rect = layout[rectKey];
  return (
    <div className="design-toolbar__row design-toolbar__row--controls">
      <Num
        label="X"
        value={rect.x}
        min={0}
        max={layout.width}
        onChange={(x) => onUpdateLayout((l) => patchRect(l, rectKey, { x }))}
      />
      <Num
        label="Y"
        value={rect.y}
        min={0}
        max={layout.height}
        onChange={(y) => onUpdateLayout((l) => patchRect(l, rectKey, { y }))}
      />
      <Num
        label="W"
        value={rect.width}
        min={40}
        max={layout.width}
        onChange={(width) =>
          onUpdateLayout((l) =>
            patchRect(l, rectKey, { width: Math.max(40, width) }),
          )
        }
      />
      <Num
        label="H"
        value={rect.height}
        min={24}
        max={layout.height}
        onChange={(height) =>
          onUpdateLayout((l) =>
            patchRect(l, rectKey, { height: Math.max(24, height) }),
          )
        }
      />
    </div>
  );
}

export function DesignToolbar({
  layout,
  onUpdateLayout,
  typography,
  fontTypography,
  fontSizesEnabled,
  onUpdateTypography,
  onUpdateFontSizes,
  onResetDesign,
}: Props) {
  return (
    <div className="design-toolbar" aria-label="Card layout and typography">
      <div className="design-toolbar__row design-toolbar__row--reset">
        <button type="button" className="btn btn--ghost" onClick={onResetDesign}>
          Reset design to defaults
        </button>
      </div>

      <p className="design-toolbar__section-label">Canvas</p>
      <div className="design-toolbar__row design-toolbar__row--controls">
        <Num
          label="Width (px)"
          value={layout.width}
          min={320}
          max={8192}
          onChange={(width) =>
            onUpdateLayout((l) => ({ ...l, width: Math.max(320, width) }))
          }
        />
        <Num
          label="Height (px)"
          value={layout.height}
          min={240}
          max={8192}
          onChange={(height) =>
            onUpdateLayout((l) => ({ ...l, height: Math.max(240, height) }))
          }
        />
      </div>

      <p className="design-toolbar__section-label">Hindi title box</p>
      <RectFields rectKey="titleHi" layout={layout} onUpdateLayout={onUpdateLayout} />

      <p className="design-toolbar__section-label">Hindi verse box</p>
      <RectFields rectKey="bodyHi" layout={layout} onUpdateLayout={onUpdateLayout} />

      <p className="design-toolbar__section-label">English title box</p>
      <RectFields rectKey="titleEn" layout={layout} onUpdateLayout={onUpdateLayout} />

      <p className="design-toolbar__section-label">English verse box</p>
      <RectFields rectKey="bodyEn" layout={layout} onUpdateLayout={onUpdateLayout} />

      <p className="design-toolbar__section-label">Font sizes</p>
      {!fontSizesEnabled && (
        <p className="hint" style={{ marginBottom: "0.35rem" }}>
          Select a card in the <strong>Page queue</strong> to change font sizes for that card only.
        </p>
      )}
      <div className="design-toolbar__row design-toolbar__row--controls">
        <Num
          label="Hindi title (px)"
          value={fontTypography.titleFontPxHi}
          min={8}
          max={200}
          disabled={!fontSizesEnabled}
          onChange={(titleFontPxHi) => onUpdateFontSizes({ titleFontPxHi })}
        />
        <Num
          label="English title (px)"
          value={fontTypography.titleFontPxEn}
          min={8}
          max={200}
          disabled={!fontSizesEnabled}
          onChange={(titleFontPxEn) => onUpdateFontSizes({ titleFontPxEn })}
        />
        <PxSlider
          label="Hindi verse (px)"
          value={fontTypography.bodyFontPxHi}
          min={6}
          max={400}
          disabled={!fontSizesEnabled}
          onChange={(n) =>
            onUpdateFontSizes({
              bodyFontPxHi: clampVersePx(n, fontTypography.bodyFontPxHi),
            })
          }
        />
        <PxSlider
          label="English verse (px)"
          value={fontTypography.bodyFontPxEn}
          min={6}
          max={400}
          disabled={!fontSizesEnabled}
          onChange={(n) =>
            onUpdateFontSizes({
              bodyFontPxEn: clampVersePx(n, fontTypography.bodyFontPxEn),
            })
          }
        />
        <Num
          label="Hindi verse line height"
          value={fontTypography.lineHeightHi}
          min={1}
          max={3}
          step={0.05}
          disabled={!fontSizesEnabled}
          onChange={(lineHeightHi) => onUpdateFontSizes({ lineHeightHi })}
        />
        <Num
          label="English verse line height"
          value={fontTypography.lineHeightEn}
          min={1}
          max={3}
          step={0.05}
          disabled={!fontSizesEnabled}
          onChange={(lineHeightEn) => onUpdateFontSizes({ lineHeightEn })}
        />
      </div>

      <p className="design-toolbar__section-label">Title & verse style</p>
      <div className="design-toolbar__row design-toolbar__row--controls">
        <label className="toolbar-field">
          <span>Title color</span>
          <input
            type="color"
            value={normalizeHex(typography.titleColor, "#ffffff")}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                titleColor: e.target.value,
              }))
            }
          />
        </label>
        <label className="toolbar-field">
          <span>Title align</span>
          <select
            value={typography.titleTextAlign}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                titleTextAlign: e.target.value as TypographySpec["titleTextAlign"],
              }))
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="toolbar-field">
          <span>Verse color</span>
          <input
            type="color"
            value={normalizeHex(typography.bodyColor, "#ffffff")}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                bodyColor: e.target.value,
              }))
            }
          />
        </label>
        <label className="toolbar-field">
          <span>Highlight color</span>
          <input
            type="color"
            value={normalizeHex(typography.highlightColor, "#f1a600")}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                highlightColor: e.target.value,
              }))
            }
          />
        </label>
        <label className="toolbar-field">
          <span>Verse align</span>
          <select
            value={typography.textAlign}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                textAlign: e.target.value as TypographySpec["textAlign"],
              }))
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify (fill line width)</option>
          </select>
        </label>
      </div>

      <div className="design-toolbar__row design-toolbar__row--fonts">
        <label className="toolbar-field toolbar-field--wide">
          <span>English font (CSS)</span>
          <input
            type="text"
            value={typography.fontFamilyEn}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                fontFamilyEn: e.target.value,
              }))
            }
          />
        </label>
        <label className="toolbar-field toolbar-field--wide">
          <span>Hindi font (CSS)</span>
          <input
            type="text"
            value={typography.fontFamilyHi}
            onChange={(e) =>
              onUpdateTypography((t) => ({
                ...t,
                fontFamilyHi: e.target.value,
              }))
            }
          />
        </label>
      </div>
    </div>
  );
}

function normalizeHex(color: string, fallback: string): string {
  const s = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

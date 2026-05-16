import type { PageTypographyOverrides, TypographySpec } from "../bible/types";

type Props = {
  previewLabel: string;
  typography: TypographySpec;
  enabled: boolean;
  onUpdate: (patch: PageTypographyOverrides) => void;
};

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
    <label className="toolbar-field toolbar-field--verse-range">
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

function clampVersePx(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(6, Math.min(400, Math.round(n)));
}

function normalizeHex(color: string, fallback: string): string {
  const s = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

export function CardPreviewTypographyControls({
  previewLabel,
  typography,
  enabled,
  onUpdate,
}: Props) {
  return (
    <div
      className="design-toolbar preview-typography-controls"
      aria-label={`${previewLabel} card typography`}
    >
      {!enabled && (
        <p className="hint" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
          Click a card in this preview to edit font sizes and colors for that card only. Changes
          here do not affect the other preview.
        </p>
      )}

      <p className="design-toolbar__section-label">Font sizes</p>
      <div className="design-toolbar__row design-toolbar__row--controls">
        <Num
          label="Hindi title (px)"
          value={typography.titleFontPxHi}
          min={8}
          max={200}
          disabled={!enabled}
          onChange={(titleFontPxHi) => onUpdate({ titleFontPxHi })}
        />
        <Num
          label="English title (px)"
          value={typography.titleFontPxEn}
          min={8}
          max={200}
          disabled={!enabled}
          onChange={(titleFontPxEn) => onUpdate({ titleFontPxEn })}
        />
        <PxSlider
          label="Hindi verse (px)"
          value={typography.bodyFontPxHi}
          min={6}
          max={400}
          disabled={!enabled}
          onChange={(n) =>
            onUpdate({
              bodyFontPxHi: clampVersePx(n, typography.bodyFontPxHi),
            })
          }
        />
        <PxSlider
          label="English verse (px)"
          value={typography.bodyFontPxEn}
          min={6}
          max={400}
          disabled={!enabled}
          onChange={(n) =>
            onUpdate({
              bodyFontPxEn: clampVersePx(n, typography.bodyFontPxEn),
            })
          }
        />
        <Num
          label="Hindi verse line height"
          value={typography.lineHeightHi}
          min={1}
          max={3}
          step={0.05}
          disabled={!enabled}
          onChange={(lineHeightHi) => onUpdate({ lineHeightHi })}
        />
        <Num
          label="English verse line height"
          value={typography.lineHeightEn}
          min={1}
          max={3}
          step={0.05}
          disabled={!enabled}
          onChange={(lineHeightEn) => onUpdate({ lineHeightEn })}
        />
      </div>

      <p className="design-toolbar__section-label">Title & verse style</p>
      <div className="design-toolbar__row design-toolbar__row--controls">
        <label className="toolbar-field">
          <span>Title color</span>
          <input
            type="color"
            value={normalizeHex(typography.titleColor, "#ffffff")}
            disabled={!enabled}
            onChange={(e) => onUpdate({ titleColor: e.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>Title align</span>
          <select
            value={typography.titleTextAlign}
            disabled={!enabled}
            onChange={(e) =>
              onUpdate({
                titleTextAlign: e.target.value as TypographySpec["titleTextAlign"],
              })
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
            disabled={!enabled}
            onChange={(e) => onUpdate({ bodyColor: e.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>Highlight color</span>
          <input
            type="color"
            value={normalizeHex(typography.highlightColor, "#f1a600")}
            disabled={!enabled}
            onChange={(e) => onUpdate({ highlightColor: e.target.value })}
          />
        </label>
        <label className="toolbar-field">
          <span>Verse align</span>
          <select
            value={typography.textAlign}
            disabled={!enabled}
            onChange={(e) =>
              onUpdate({
                textAlign: e.target.value as TypographySpec["textAlign"],
              })
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify (fill line width)</option>
          </select>
        </label>
      </div>
    </div>
  );
}

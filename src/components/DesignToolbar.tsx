import type {
  DesignTarget,
  LayoutSpec,
  Rect,
  TypographySpec,
} from "../bible/types";

type Props = {
  target: DesignTarget;
  onTargetChange: (t: DesignTarget) => void;
  layout: LayoutSpec;
  onUpdateLayout: (fn: (prev: LayoutSpec) => LayoutSpec) => void;
  typography: TypographySpec;
  onUpdateTypography: (fn: (prev: TypographySpec) => TypographySpec) => void;
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
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

export function DesignToolbar({
  target,
  onTargetChange,
  layout,
  onUpdateLayout,
  typography,
  onUpdateTypography,
  onResetDesign,
}: Props) {
  const rectKey: RectKey | null =
    target === "titleEn" ||
    target === "bodyEn" ||
    target === "titleHi" ||
    target === "bodyHi"
      ? target
      : null;

  const rect = rectKey ? layout[rectKey] : null;

  return (
    <div className="design-toolbar" aria-label="Card layout and typography">
      <div className="design-toolbar__row design-toolbar__row--primary">
        <label className="toolbar-field toolbar-field--grow">
          <span>Edit</span>
          <select
            value={target}
            onChange={(e) => onTargetChange(e.target.value as DesignTarget)}
          >
            <option value="canvas">Canvas</option>
            <option value="titleHi">Hindi title</option>
            <option value="bodyHi">Hindi verse</option>
            <option value="titleEn">English title</option>
            <option value="bodyEn">English verse</option>
          </select>
        </label>
        <button type="button" className="btn btn--ghost" onClick={onResetDesign}>
          Reset design to defaults
        </button>
      </div>

      <div className="design-toolbar__row design-toolbar__row--controls">
        {target === "canvas" && (
          <>
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
          </>
        )}

        {rect && rectKey && (
          <>
            <Num
              label="X"
              value={rect.x}
              min={0}
              max={layout.width}
              onChange={(x) =>
                onUpdateLayout((l) => patchRect(l, rectKey, { x }))
              }
            />
            <Num
              label="Y"
              value={rect.y}
              min={0}
              max={layout.height}
              onChange={(y) =>
                onUpdateLayout((l) => patchRect(l, rectKey, { y }))
              }
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
          </>
        )}

        {(target === "titleEn" || target === "titleHi") && (
          <>
            <Num
              label="Title font (px)"
              value={typography.titleFontPx}
              min={8}
              max={200}
              onChange={(titleFontPx) =>
                onUpdateTypography((t) => ({ ...t, titleFontPx }))
              }
            />
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
          </>
        )}

        {(target === "bodyEn" || target === "bodyHi") && (
          <>
            <Num
              label="Body min (px)"
              value={typography.minBodyFontPx}
              min={6}
              max={typography.maxBodyFontPx}
              onChange={(minBodyFontPx) =>
                onUpdateTypography((t) => ({
                  ...t,
                  minBodyFontPx: Math.min(minBodyFontPx, t.maxBodyFontPx),
                }))
              }
            />
            <Num
              label="Body max (px)"
              value={typography.maxBodyFontPx}
              min={typography.minBodyFontPx}
              max={400}
              onChange={(maxBodyFontPx) =>
                onUpdateTypography((t) => ({
                  ...t,
                  maxBodyFontPx: Math.max(maxBodyFontPx, t.minBodyFontPx),
                }))
              }
            />
            <Num
              label="Line height"
              value={typography.lineHeight}
              min={1}
              max={3}
              step={0.05}
              onChange={(lineHeight) =>
                onUpdateTypography((t) => ({ ...t, lineHeight }))
              }
            />
            <label className="toolbar-field">
              <span>Align</span>
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
              </select>
            </label>
          </>
        )}
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

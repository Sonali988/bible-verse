import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BibleProvider } from "./bible/provider";
import { SqliteBibleProvider } from "./bible/sqlite/SqliteBibleProvider";
import {
  defaultSqliteSchema,
  type SqliteSchemaConfig,
} from "./bible/sqlite/schemaConfig";
import { StaticJsonProvider } from "./bible/StaticJsonProvider";
import {
  CARD_LAYOUT,
  clampLayoutTextToLeftHalf,
  cloneLayout,
  defaultTypography,
  normalizeTypography,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
  type VerseRef,
} from "./bible/types";
import { ReferencePicker } from "./components/ReferencePicker";
import { HighlightEditor } from "./components/HighlightEditor";
import { VerseCard } from "./components/VerseCard";
import { DesignToolbar } from "./components/DesignToolbar";
import { renderNodeToPng } from "./export/renderPng";
import { savePng, zipBlobs } from "./export/downloadZip";
import { formatReference } from "./lib/referenceParser";
import { newId } from "./lib/id";
import { loadPersisted, savePersisted } from "./lib/storage";
import {
  BUNDLED_SQLITE_URLS,
  fetchSqliteArrayBuffer,
} from "./config/bundledBibles";

const LABEL_EN = "NKJV";
const LABEL_HI = "HINOVBSI";

/**
 * Absolute URL to `public/bg.png` so the file you drop in `public/` is what loads (not a bundled copy).
 * Uses `import.meta.env.BASE_URL` so subpath deploys work.
 */
function defaultCardBackgroundHref(): string {
  const base = import.meta.env.BASE_URL || "/";
  const pathBase = base.startsWith("/") ? base : `/${base}`;
  const withSlash = pathBase.endsWith("/") ? pathBase : `${pathBase}/`;
  if (typeof window === "undefined") {
    return `${withSlash}bg.png`.replace(/([^:]\/)\/+/g, "$1");
  }
  return new URL("bg.png", `${window.location.origin}${withSlash}`).href;
}

function sanitizeFileName(s: string): string {
  return s.replace(/[^\w\u0900-\u0fff-]+/g, "_").replace(/_+/g, "_").slice(0, 120);
}

async function nextFrames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}

export default function App() {
  const persisted = useMemo(() => loadPersisted(), []);
  const [useSample, setUseSample] = useState(true);
  const [schemaEn, setSchemaEn] = useState<SqliteSchemaConfig>(
    persisted.schemaEn ?? defaultSqliteSchema(),
  );
  const [schemaHi, setSchemaHi] = useState<SqliteSchemaConfig>(
    persisted.schemaHi ?? defaultSqliteSchema(),
  );

  const [providerEn, setProviderEn] = useState<BibleProvider>(
    () => new StaticJsonProvider(LABEL_EN, "en"),
  );
  const [providerHi, setProviderHi] = useState<BibleProvider>(
    () => new StaticJsonProvider(LABEL_HI, "hi"),
  );

  const [cardLayout, setCardLayout] = useState<LayoutSpec>(() =>
    clampLayoutTextToLeftHalf(
      persisted.cardLayout ?? cloneLayout(CARD_LAYOUT),
    ),
  );
  const [typography, setTypography] = useState<TypographySpec>(() =>
    normalizeTypography(persisted.typography ?? null),
  );
  const [schemaEnJson, setSchemaEnJson] = useState(() =>
    JSON.stringify(persisted.schemaEn ?? defaultSqliteSchema(), null, 2),
  );
  const [schemaHiJson, setSchemaHiJson] = useState(() =>
    JSON.stringify(persisted.schemaHi ?? defaultSqliteSchema(), null, 2),
  );

  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<VersePage[]>(persisted.pages ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    persisted.pages?.[0]?.id ?? null,
  );

  const [draft, setDraft] = useState<{
    ref: VerseRef;
    textEn: string;
    textHi: string;
  } | null>(null);

  const [exportPage, setExportPage] = useState<VersePage | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [bundledStatus, setBundledStatus] = useState<
    "idle" | "loading" | "loaded" | "missing"
  >("idle");
  const exportRef = useRef<HTMLDivElement>(null);

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  const defaultPublicCardBgHref = useMemo(() => defaultCardBackgroundHref(), []);

  useEffect(() => {
    if (!useSample) return;
    setProviderEn((prev) => {
      if (prev instanceof SqliteBibleProvider) prev.close();
      return new StaticJsonProvider(LABEL_EN, "en");
    });
    setProviderHi((prev) => {
      if (prev instanceof SqliteBibleProvider) prev.close();
      return new StaticJsonProvider(LABEL_HI, "hi");
    });
  }, [useSample]);

  useEffect(() => {
    savePersisted({
      pages,
      cardLayout,
      typography,
      schemaEn,
      schemaHi,
    });
  }, [pages, cardLayout, typography, schemaEn, schemaHi]);

  useEffect(() => {
    if (selectedId && !pages.some((p) => p.id === selectedId)) {
      setSelectedId(pages[0]?.id ?? null);
    }
  }, [pages, selectedId]);

  /** Auto-load SQLite from `public/bibles/` when both default URLs return 200. */
  useEffect(() => {
    const ac = new AbortController();
    const schemaEnBoot = persisted.schemaEn ?? defaultSqliteSchema();
    const schemaHiBoot = persisted.schemaHi ?? defaultSqliteSchema();
    setBundledStatus("loading");
    void (async () => {
      const [bufEn, bufHi] = await Promise.all([
        fetchSqliteArrayBuffer(BUNDLED_SQLITE_URLS.en, ac.signal),
        fetchSqliteArrayBuffer(BUNDLED_SQLITE_URLS.hi, ac.signal),
      ]);
      if (ac.signal.aborted) return;
      if (!bufEn || !bufHi) {
        setBundledStatus("missing");
        return;
      }
      try {
        const pEn = new SqliteBibleProvider(LABEL_EN, schemaEnBoot);
        const pHi = new SqliteBibleProvider(LABEL_HI, schemaHiBoot);
        await Promise.all([
          pEn.loadArrayBuffer(bufEn),
          pHi.loadArrayBuffer(bufHi),
        ]);
        if (ac.signal.aborted) {
          pEn.close();
          pHi.close();
          return;
        }
        setProviderEn((prev) => {
          if (prev instanceof SqliteBibleProvider) prev.close();
          return pEn;
        });
        setProviderHi((prev) => {
          if (prev instanceof SqliteBibleProvider) prev.close();
          return pHi;
        });
        setUseSample(false);
        setBundledStatus("loaded");
      } catch {
        if (!ac.signal.aborted) setBundledStatus("missing");
      }
    })();
    return () => ac.abort();
  }, [persisted.schemaEn, persisted.schemaHi]);

  const onPreview = useCallback((ref: VerseRef, textEn: string, textHi: string) => {
    setDraft({ ref, textEn, textHi });
  }, []);

  const addPage = () => {
    if (!draft) return;
    const page: VersePage = {
      id: newId(),
      ref: draft.ref,
      textEn: draft.textEn,
      textHi: draft.textHi,
      highlightsEn: [],
      highlightsHi: [],
    };
    setPages((p) => [...p, page]);
    setSelectedId(page.id);
  };

  const applySchemaJson = () => {
    setParseErr(null);
    try {
      setSchemaEn(JSON.parse(schemaEnJson) as SqliteSchemaConfig);
      setSchemaHi(JSON.parse(schemaHiJson) as SqliteSchemaConfig);
    } catch (e) {
      setParseErr(e instanceof Error ? e.message : String(e));
    }
  };

  const resetCardDesign = () => {
    setCardLayout(cloneLayout(CARD_LAYOUT));
    setTypography(normalizeTypography(defaultTypography()));
  };

  const onBgFile = (file: File | null) => {
    if (!file) {
      setBgDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      console.warn("Background file is not a supported image type:", file.type);
      return;
    }
    const r = new FileReader();
    r.onload = () => setBgDataUrl(String(r.result));
    r.onerror = () => {
      console.error("Could not read background image file");
      setBgDataUrl(null);
    };
    r.readAsDataURL(file);
  };

  const loadSqlite = async (
    file: File | null,
    lang: "en" | "hi",
  ): Promise<void> => {
    if (!file) return;
    const schema = lang === "en" ? schemaEn : schemaHi;
    const label = lang === "en" ? LABEL_EN : LABEL_HI;
    const prov = new SqliteBibleProvider(label, schema);
    await prov.loadFile(file);
    if (lang === "en") {
      setProviderEn((prev) => {
        if (prev instanceof SqliteBibleProvider) prev.close();
        return prov;
      });
    } else {
      setProviderHi((prev) => {
        if (prev instanceof SqliteBibleProvider) prev.close();
        return prov;
      });
    }
    setUseSample(false);
  };

  const cardPage = exportPage ?? selected ?? pages[0] ?? null;

  const capturePngBlob = async (page: VersePage): Promise<Blob> => {
    setExportPage(page);
    await nextFrames(2);
    await document.fonts.ready;
    const node = exportRef.current;
    if (!node) throw new Error("Export node missing");
    // Use measured box so PNG matches layout (avoids stretch when off-screen / subpixel ≠ cardLayout).
    const ow = Math.round(node.offsetWidth);
    const oh = Math.round(node.offsetHeight);
    const w = ow > 0 ? ow : cardLayout.width;
    const h = oh > 0 ? oh : cardLayout.height;
    return renderNodeToPng(node, { width: w, height: h });
  };

  const downloadCurrentPng = async () => {
    if (!selected) return;
    setExportBusy(true);
    try {
      const blob = await capturePngBlob(selected);
      const name = `${sanitizeFileName(formatReference(selected.ref))}.png`;
      savePng(blob, name);
    } finally {
      setExportPage(null);
      setExportBusy(false);
    }
  };

  const downloadZip = async () => {
    if (pages.length === 0) return;
    setExportBusy(true);
    try {
      const entries: { name: string; blob: Blob }[] = [];
      for (const p of pages) {
        const blob = await capturePngBlob(p);
        entries.push({
          name: `${sanitizeFileName(formatReference(p.ref))}.png`,
          blob,
        });
      }
      await zipBlobs(entries, "verse_cards.zip");
    } finally {
      setExportPage(null);
      setExportBusy(false);
    }
  };

  const updateSelectedHighlights = (
    lang: "en" | "hi",
    ranges: VersePage["highlightsEn"],
  ) => {
    if (!selected) return;
    setPages((list) =>
      list.map((p) =>
        p.id !== selected.id
          ? p
          : {
            ...p,
            highlightsEn: lang === "en" ? ranges : p.highlightsEn,
            highlightsHi: lang === "hi" ? ranges : p.highlightsHi,
          },
      ),
    );
  };

  const updateCardLayout = useCallback(
    (fn: (prev: LayoutSpec) => LayoutSpec) => {
      setCardLayout((prev) => clampLayoutTextToLeftHalf(fn(prev)));
    },
    [],
  );

  const updateTypography = useCallback(
    (fn: (prev: TypographySpec) => TypographySpec) => {
      setTypography((prev) => normalizeTypography(fn(prev)));
    },
    [],
  );

  /** Scale preview so ~1920px card fits typical viewports; frame keeps true 16:9 box. */
  const previewScale = useMemo(
    () =>
      Math.min(0.5, Math.min(880, cardLayout.width / 2) / cardLayout.width),
    [cardLayout.width],
  );

  const previewScaledSize = useMemo(
    () => ({
      w: Math.max(1, Math.round(cardLayout.width * previewScale)),
      h: Math.max(1, Math.round(cardLayout.height * previewScale)),
    }),
    [cardLayout.width, cardLayout.height, previewScale],
  );

  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`preview-card-${selectedId}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedId]);

  const cardBackgroundUrl =
    bgDataUrl && bgDataUrl.trim().length > 0 ? bgDataUrl : defaultPublicCardBgHref;

  return (
    <>
      <header className="app-header">
        <h1>Bible verse cards</h1>
        <p className="sub">
          Parallel {LABEL_EN} + {LABEL_HI}. Adjust layout and type in the form below, then export
          PNG or ZIP.
        </p>
      </header>

      <section className="panel">
        <h2>Edit card</h2>
        <DesignToolbar
          layout={cardLayout}
          onUpdateLayout={updateCardLayout}
          typography={typography}
          onUpdateTypography={updateTypography}
          onResetDesign={resetCardDesign}
        />
      </section>

      <section className="panel">
        <h2>SQLite sources</h2>
        {bundledStatus === "loading" && (
          <p className="muted">Checking for bundled databases under /bibles/…</p>
        )}
        {bundledStatus === "loaded" && (
          <p className="muted">
            Loaded bundled files: <code>{BUNDLED_SQLITE_URLS.en}</code> and{" "}
            <code>{BUNDLED_SQLITE_URLS.hi}</code> (from <code>public/bibles/</code> in the
            repo).
          </p>
        )}
        {bundledStatus === "missing" && (
          <p className="hint">
            No bundled pair found at the default URLs (or fetch failed). Auto-load needs{" "}
            <strong>both</strong> <code>/bibles/nkjv.sqlite</code> and <code>/bibles/bsiov.sqlite</code>{" "}
            (restart dev server after adding files). If only English is in{" "}
            <code>public/bibles/</code>, add the Hindi file too or use the manual pickers. See{" "}
            <code>public/bibles/README.txt</code>.
          </p>
        )}
        <label className="btn-row" style={{ flexDirection: "row", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={useSample}
            onChange={(e) => setUseSample(e.target.checked)}
          />
          Use built-in sample verses (John 3:16) for layout testing
        </label>
        <p className="hint" style={{ marginTop: "0.75rem" }}>
          <strong>Manual file pickers</strong> below only show a path after <em>you</em> click and
          choose a file from your PC. They are <strong>not</strong> connected to{" "}
          <code>public/bibles/</code> — the browser cannot display &quot;nkjv.sqlite&quot; there
          automatically. Bundled DBs load in the background via URL (see messages above); use
          these inputs only if you want to override without rebuilding.
        </p>
        <div className="grid2" style={{ marginTop: "0.75rem" }}>
          <label>
            NKJV SQLite (.sqlite) — optional override
            <input
              type="file"
              accept=".sqlite,.db,application/x-sqlite3,*/*"
              disabled={useSample}
              onChange={(e) =>
                void loadSqlite(e.target.files?.[0] ?? null, "en")
              }
            />
          </label>
          <label>
            HINOVBSI (Hindi) SQLite — optional override
            <input
              type="file"
              accept=".sqlite,.db,application/x-sqlite3,*/*"
              disabled={useSample}
              onChange={(e) =>
                void loadSqlite(e.target.files?.[0] ?? null, "hi")
              }
            />
          </label>
        </div>
        <p className="hint" style={{ marginTop: "0.65rem" }}>
          Schema JSON (below) is applied when you click &quot;Apply schema JSON&quot; and on the
          next SQLite file load. Adjust table and column names to match your database.
        </p>
      </section>

      <ReferencePicker
        providerEn={providerEn}
        providerHi={providerHi}
        onPreview={onPreview}
      />

      {draft && (
        <section className="panel">
          <h2>Preview</h2>
          <div className="preview-grid preview-box">
            <div>
              <strong>{LABEL_HI}</strong>
              <p>{draft.textHi}</p>
            </div>
            <div>
              <strong>{LABEL_EN}</strong>
              <p>{draft.textEn}</p>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: "0.65rem" }}>
            <button type="button" className="btn btn--primary" onClick={addPage}>
              Add to page queue
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Page queue</h2>
        {pages.length === 0 ? (
          <p className="muted">No pages yet. Fetch a verse and add it.</p>
        ) : (
          <ul className="queue">
            {pages.map((p) => (
              <li
                key={p.id}
                className={p.id === selectedId ? "selected" : ""}
                onClick={() => setSelectedId(p.id)}
              >
                <span>{formatReference(p.ref)}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPages((xs) => xs.filter((x) => x.id !== p.id));
                    if (selectedId === p.id) setSelectedId(null);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="btn-row" style={{ marginTop: "0.65rem" }}>
          <button
            type="button"
            className="btn"
            disabled={!selected || exportBusy}
            onClick={() => void downloadCurrentPng()}
          >
            Download selected PNG
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={pages.length === 0 || exportBusy}
            onClick={() => void downloadZip()}
          >
            Download all as ZIP
          </button>
        </div>
        {exportBusy && <p className="muted">Rendering…</p>}
      </section>

      {selected && (
        <section className="panel">
          <h2>Highlights — {formatReference(selected.ref)}</h2>
          <HighlightEditor
            label={LABEL_HI}
            text={selected.textHi}
            highlights={selected.highlightsHi}
            onChange={(h) => updateSelectedHighlights("hi", h)}
          />
          <HighlightEditor
            label={LABEL_EN}
            text={selected.textEn}
            highlights={selected.highlightsEn}
            onChange={(h) => updateSelectedHighlights("en", h)}
          />
        </section>
      )}

      <section className="panel">
        <h2>Background &amp; database schema</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Canvas size, text box positions, fonts, and colors are edited in <strong>Edit card</strong>{" "}
          above and saved to localStorage. Code defaults live in{" "}
          <code>src/bible/types.ts</code> (<code>CARD_LAYOUT</code> + <code>reset</code>).
        </p>
        <label>
          Background image
          <input type="file" accept="image/*" onChange={(e) => onBgFile(e.target.files?.[0] ?? null)} />
        </label>
        <p className="hint" style={{ marginTop: "0.35rem" }}>
          With no upload, the card loads <code>public/bg.png</code> from the dev server. Replace that
          file on disk, then refresh (or restart dev) if you do not see the update. Uploads must be a
          normal browser image type (PNG, JPEG, WebP); HEIC often will not display.
        </p>
        <label style={{ marginTop: "0.65rem" }}>
          English DB schema JSON
          <textarea rows={8} value={schemaEnJson} onChange={(e) => setSchemaEnJson(e.target.value)} />
        </label>
        <label>
          Hindi DB schema JSON
          <textarea rows={8} value={schemaHiJson} onChange={(e) => setSchemaHiJson(e.target.value)} />
        </label>
        {parseErr && <p className="error">{parseErr}</p>}
        <button type="button" className="btn btn--primary" onClick={applySchemaJson}>
          Apply schema JSON
        </button>
      </section>

      {pages.length > 0 && (
        <section className="panel">
          <h2>Card preview</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            All queued verses are shown side by side — scroll horizontally to see each card. Click a
            card to select it for highlights and PNG export.
          </p>

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
                  onClick={() => setSelectedId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(p.id);
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
                        typography={typography}
                        page={p}
                        backgroundDataUrl={cardBackgroundUrl}
                        versionLabelEn={LABEL_EN}
                        versionLabelHi={LABEL_HI}
                      />
                    </div>
                  </div>
                </div>
                <p className="preview-card-caption">{formatReference(p.ref)}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginBottom: "0.5rem" }}>
            WYSIWYG at {cardLayout.width}×{cardLayout.height}px (scaled to fit). That size is your
            current <strong>Edit card</strong> canvas (saved in this browser), which drives preview and
            PNG export.
            {(cardLayout.width !== CARD_LAYOUT.width ||
              cardLayout.height !== CARD_LAYOUT.height) && (
                <>
                  {" "}
                  Code defaults are {CARD_LAYOUT.width}×{CARD_LAYOUT.height}px for a full-HD
                  background; use <strong>Reset design to defaults</strong> in Edit card if you want
                  that canvas again.
                </>
              )}
          </p>
        </section>

      )}

      {cardPage && (
        <div className="export-hidden-host" aria-hidden>
          <div
            ref={exportRef}
            className="export-card-snapshot"
            style={{
              width: cardLayout.width,
              height: cardLayout.height,
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <VerseCard
              layout={cardLayout}
              typography={typography}
              page={exportPage ?? selected ?? pages[0]}
              backgroundDataUrl={cardBackgroundUrl}
              versionLabelEn={LABEL_EN}
              versionLabelHi={LABEL_HI}
            />
          </div>
        </div>
      )}
    </>
  );
}

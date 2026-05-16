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
  cloneResolumeLayout,
  defaultResolumeTypography,
  defaultTypography,
  mergePageTypography,
  normalizeTypography,
  type LayoutSpec,
  type PageTypographyOverrides,
  type TypographySpec,
  type VersePage,
  type VerseRef,
} from "./bible/types";
import { ReferencePicker } from "./components/ReferencePicker";
import { HighlightEditor } from "./components/HighlightEditor";
import { VerseCard } from "./components/VerseCard";
import { ResolumeVerseCard } from "./components/ResolumeVerseCard";
import { DesignToolbar } from "./components/DesignToolbar";
import { CardPreviewTypographyControls } from "./components/CardPreviewTypographyControls";
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

function datedZipFileName(suffix: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${suffix}.zip`;
}

type ExportVariant = "live" | "resolume";

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
  const [resolumeLayout] = useState<LayoutSpec>(() =>
    persisted.resolumeLayout ?? cloneResolumeLayout(),
  );
  const [resolumeTypography] = useState<TypographySpec>(() =>
    normalizeTypography(persisted.resolumeTypography ?? defaultResolumeTypography()),
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
  const [exportVariant, setExportVariant] = useState<ExportVariant>("live");
  const [exportBusy, setExportBusy] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [bundledStatus, setBundledStatus] = useState<
    "idle" | "loading" | "loaded" | "missing"
  >("idle");
  const [sqliteFileErr, setSqliteFileErr] = useState<string | null>(null);
  const [sqliteLoadNote, setSqliteLoadNote] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportResolumeRef = useRef<HTMLDivElement>(null);
  const sidebarId = "app-sidebar-panel";

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
      resolumeLayout,
      resolumeTypography,
      schemaEn,
      schemaHi,
    });
  }, [pages, cardLayout, typography, resolumeLayout, resolumeTypography, schemaEn, schemaHi]);

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
        const [resolvedEn, resolvedHi] = await Promise.all([
          pEn.loadArrayBuffer(bufEn),
          pHi.loadArrayBuffer(bufHi),
        ]);
        if (ac.signal.aborted) {
          pEn.close();
          pHi.close();
          return;
        }
        setSchemaEn(resolvedEn);
        setSchemaHi(resolvedHi);
        setSchemaEnJson(JSON.stringify(resolvedEn, null, 2));
        setSchemaHiJson(JSON.stringify(resolvedHi, null, 2));
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
        setSqliteFileErr(null);
        const notes: string[] = [];
        if (JSON.stringify(resolvedEn) !== JSON.stringify(schemaEnBoot)) {
          notes.push(`English table "${resolvedEn.verseTable}" auto-detected.`);
        }
        if (JSON.stringify(resolvedHi) !== JSON.stringify(schemaHiBoot)) {
          notes.push(`Hindi table "${resolvedHi.verseTable}" auto-detected.`);
        }
        setSqliteLoadNote(notes.length ? notes.join(" ") : null);
      } catch (e) {
        if (!ac.signal.aborted) {
          setBundledStatus("missing");
          setSqliteLoadNote(null);
          setSqliteFileErr(
            e instanceof Error ? e.message : String(e),
          );
        }
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
    setPages((ps) =>
      ps.map(({ typographySizes: _ts, resolumeTypographySizes: _rs, ...rest }) => ({
        ...rest,
      })),
    );
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
    setSqliteFileErr(null);
    setSqliteLoadNote(null);
    try {
      const configured = lang === "en" ? schemaEn : schemaHi;
      const label = lang === "en" ? LABEL_EN : LABEL_HI;
      const prov = new SqliteBibleProvider(label, configured);
      const resolved = await prov.loadFile(file);
      if (lang === "en") {
        setSchemaEn(resolved);
        setSchemaEnJson(JSON.stringify(resolved, null, 2));
        setProviderEn((prev) => {
          if (prev instanceof SqliteBibleProvider) prev.close();
          return prov;
        });
      } else {
        setSchemaHi(resolved);
        setSchemaHiJson(JSON.stringify(resolved, null, 2));
        setProviderHi((prev) => {
          if (prev instanceof SqliteBibleProvider) prev.close();
          return prov;
        });
      }
      setUseSample(false);
      if (JSON.stringify(resolved) !== JSON.stringify(configured)) {
        setSqliteLoadNote(
          `${lang === "en" ? "English" : "Hindi"} schema auto-detected from your file (table "${resolved.verseTable}") — JSON updated above.`,
        );
      }
    } catch (e) {
      setSqliteLoadNote(null);
      setSqliteFileErr(
        e instanceof Error ? e.message : `Could not load ${lang} database: ${String(e)}`,
      );
    }
  };

  const cardPage = exportPage ?? selected ?? pages[0] ?? null;

  const capturePngBlob = async (
    page: VersePage,
    variant: ExportVariant,
  ): Promise<Blob> => {
    setExportPage(page);
    setExportVariant(variant);
    await nextFrames(2);
    await document.fonts.ready;
    const layout = variant === "live" ? cardLayout : resolumeLayout;
    const node =
      variant === "live" ? exportRef.current : exportResolumeRef.current;
    if (!node) throw new Error("Export node missing");
    const ow = Math.round(node.offsetWidth);
    const oh = Math.round(node.offsetHeight);
    const w = ow > 0 ? ow : layout.width;
    const h = oh > 0 ? oh : layout.height;
    return renderNodeToPng(node, { width: w, height: h });
  };

  const downloadCurrentPng = async () => {
    if (!selected) return;
    setExportBusy(true);
    try {
      const blob = await capturePngBlob(selected, "live");
      const name = `${sanitizeFileName(formatReference(selected.ref))}.png`;
      savePng(blob, name);
    } finally {
      setExportPage(null);
      setExportBusy(false);
    }
  };

  const downloadZip = async (variant: ExportVariant) => {
    if (pages.length === 0) return;
    setExportBusy(true);
    try {
      const entries: { name: string; blob: Blob }[] = [];
      for (const p of pages) {
        const blob = await capturePngBlob(p, variant);
        entries.push({
          name: `${sanitizeFileName(formatReference(p.ref))}.png`,
          blob,
        });
      }
      await zipBlobs(
        entries,
        datedZipFileName(variant === "live" ? "live" : "resolume"),
      );
    } finally {
      setExportPage(null);
      setExportVariant("live");
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

  const updatePageTypographyForSelected = useCallback(
    (
      patch: PageTypographyOverrides,
      sizesKey: "typographySizes" | "resolumeTypographySizes",
    ) => {
      if (!selectedId) return;
      setPages((list) =>
        list.map((p) =>
          p.id !== selectedId
            ? p
            : {
                ...p,
                [sizesKey]: { ...p[sizesKey], ...patch },
              },
        ),
      );
    },
    [selectedId],
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

  const previewScaleResolume = useMemo(
    () =>
      Math.min(0.5, Math.min(880, resolumeLayout.width / 2) / resolumeLayout.width),
    [resolumeLayout.width],
  );

  const previewScaledSizeResolume = useMemo(
    () => ({
      w: Math.max(1, Math.round(resolumeLayout.width * previewScaleResolume)),
      h: Math.max(1, Math.round(resolumeLayout.height * previewScaleResolume)),
    }),
    [resolumeLayout.width, resolumeLayout.height, previewScaleResolume],
  );

  useEffect(() => {
    if (!selectedId) return;
    document
      .getElementById(`preview-card-${selectedId}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedId]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const cardBackgroundUrl =
    bgDataUrl && bgDataUrl.trim().length > 0 ? bgDataUrl : defaultPublicCardBgHref;

  const selectedLiveTypography = useMemo(
    () =>
      selected ? mergePageTypography(typography, selected) : typography,
    [typography, selected],
  );

  const selectedResolumeTypography = useMemo(
    () =>
      selected
        ? mergePageTypography(resolumeTypography, selected, "resolumeTypographySizes")
        : resolumeTypography,
    [resolumeTypography, selected],
  );

  return (
    <>
      <header className="app-header">
        <div className="app-header__top">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarOpen ? "Hide data panel" : "Show data panel"}
            aria-expanded={sidebarOpen}
            aria-controls={sidebarId}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span className="sidebar-toggle__bars" aria-hidden />
          </button>
          <h1>Bible verse cards</h1>
        </div>
        <p className="sub">
          Parallel {LABEL_EN} + {LABEL_HI}. Use the menu to load SQLite and schema, design in{" "}
          <strong>Edit card</strong>, then export PNG or ZIP.
        </p>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close data panel"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={
          sidebarOpen ? "app-layout app-layout--sidebar-open" : "app-layout"
        }
      >
        <aside
          id={sidebarId}
          className={
            sidebarOpen ? "app-sidebar app-sidebar--open" : "app-sidebar"
          }
          aria-label="Data sources and schema"
          aria-hidden={!sidebarOpen}
        >
      <section className="panel panel--sidebar">
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
            <strong>both</strong> SQLite files under <code>public/bibles/</code> (see{" "}
            <code>public/bibles/README.txt</code>). You can still load databases with the manual
            file pickers below. If only one language file is present, add the other or use pickers.
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
          <strong>Manual file pickers</strong> work anytime: choose an <code>.sqlite</code> file from
          your PC to load that Bible. Loading a file turns off sample mode for this session. The
          pickers are not the same as files in <code>public/bibles/</code> (those load automatically
          when both URLs return 200). After changing schema JSON, click <strong>Apply schema JSON</strong>{" "}
          before loading again if your table layout changed.
        </p>
        <div className="grid2" style={{ marginTop: "0.75rem" }}>
          <label>
            NKJV SQLite (.sqlite) — optional override
            <input
              type="file"
              accept=".sqlite,.db,application/x-sqlite3,*/*"
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
              onChange={(e) =>
                void loadSqlite(e.target.files?.[0] ?? null, "hi")
              }
            />
          </label>
        </div>
        {sqliteFileErr && <p className="error">{sqliteFileErr}</p>}
        {sqliteLoadNote && <p className="muted">{sqliteLoadNote}</p>}
        <p className="hint" style={{ marginTop: "0.65rem" }}>
          Schema JSON below is applied when you click &quot;Apply schema JSON&quot; and on the next
          SQLite file load.
        </p>
      </section>

      <section className="panel panel--sidebar">
        <h2>Background &amp; database schema</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Layout and typography are in <strong>Edit card</strong> (main area). Code defaults:{" "}
          <code>src/bible/types.ts</code>.
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
        </aside>

        <div className="app-main">
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
            onClick={() => void downloadZip("live")}
          >
            Download Live ZIP
          </button>
          <button
            type="button"
            className="btn"
            disabled={pages.length === 0 || exportBusy}
            onClick={() => void downloadZip("resolume")}
          >
            Download Resolume ZIP
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

      {pages.length > 0 && (
        <>
        <section className="panel">
          <h2>Card preview - Live</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Click a card to select it for highlights and Live PNG export. Font sizes and colors
            below apply only to the selected card in this preview.
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
                        typography={mergePageTypography(typography, p)}
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

          <CardPreviewTypographyControls
            previewLabel="Live"
            typography={selectedLiveTypography}
            enabled={Boolean(selected)}
            onUpdate={(patch) =>
              updatePageTypographyForSelected(patch, "typographySizes")
            }
          />

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

        <section className="panel">
          <h2>Card preview - Resolume</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Same verses as Live, with Resolume layout. Font sizes and colors below apply only to
            the selected card here — not Live.
          </p>

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

          <CardPreviewTypographyControls
            previewLabel="Resolume"
            typography={selectedResolumeTypography}
            enabled={Boolean(selected)}
            onUpdate={(patch) =>
              updatePageTypographyForSelected(patch, "resolumeTypographySizes")
            }
          />
        </section>
        </>
      )}
        </div>
      </div>

      {cardPage && (
        <>
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
                typography={mergePageTypography(
                  typography,
                  cardPage,
                  "typographySizes",
                )}
                page={cardPage}
                backgroundDataUrl={cardBackgroundUrl}
                versionLabelEn={LABEL_EN}
                versionLabelHi={LABEL_HI}
              />
            </div>
          </div>
          <div className="export-hidden-host" aria-hidden>
            <div
              ref={exportResolumeRef}
              className="export-card-snapshot"
              style={{
                width: resolumeLayout.width,
                height: resolumeLayout.height,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <ResolumeVerseCard
                layout={resolumeLayout}
                typography={mergePageTypography(
                  resolumeTypography,
                  cardPage,
                  "resolumeTypographySizes",
                )}
                page={cardPage}
                backgroundDataUrl={cardBackgroundUrl}
                versionLabelEn={LABEL_EN}
                versionLabelHi={LABEL_HI}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

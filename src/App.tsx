import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { BibleProvider } from "./bible/provider";
import { SqliteBibleProvider } from "./bible/sqlite/SqliteBibleProvider";
import {
  defaultSqliteSchema,
  type SqliteSchemaConfig,
} from "./bible/sqlite/schemaConfig";
import { StaticJsonProvider } from "./bible/StaticJsonProvider";
import { BibleComProvider } from "./bible/bibleCom/BibleComProvider";
import { BIBLE_COM_EN, BIBLE_COM_HI } from "./bible/bibleCom/config";
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
  type VerseDraftItem,
  type VersePage,
  type VerseRef,
} from "./bible/types";
import { ReferencePicker } from "./components/ReferencePicker";
import { ExportModal } from "./components/ExportModal";
import { PageQueuePanel } from "./components/PageQueuePanel";
import { VerseCard } from "./components/VerseCard";
import { ResolumeVerseCard } from "./components/ResolumeVerseCard";
import { DesignToolbar } from "./components/DesignToolbar";
import { CardPreviewTypographyControls } from "./components/CardPreviewTypographyControls";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import {
  prefetchFontEmbedCss,
  renderNodeToPng,
  waitForImagesIn,
} from "./export/renderPng";
import { savePng, zipBlobs } from "./export/downloadZip";
import { formatReference } from "./lib/referenceParser";
import { newId } from "./lib/id";
import {
  loadBackgroundDataUrl,
  loadPersisted,
  saveBackgroundDataUrl,
  savePersisted,
  DEFAULT_VERSE_BLOCK_ORDER,
} from "./lib/storage";
import type { VerseBlockOrder } from "./lib/verseBlockOrder";
import { computeAutoFitBodyFontOverrides } from "./lib/fitVerseBodyFont";
import { VerseOrderControl } from "./components/VerseOrderControl";
import {
  BUNDLED_SQLITE_URLS,
  fetchSqliteArrayBuffer,
} from "./config/bundledBibles";

const LABEL_EN = "NKJV";
const LABEL_HI = "HINOVBSI";

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
type PreviewScrollTarget = ExportVariant | "both";

function previewCardElement(
  id: string,
  variant: ExportVariant,
): HTMLElement | null {
  const elId =
    variant === "resolume"
      ? `preview-card-resolume-${id}`
      : `preview-card-${id}`;
  return document.getElementById(elId);
}

function scrollPreviewCardInStrip(id: string, variant: ExportVariant): void {
  previewCardElement(id, variant)?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}

function scrollPreviewCard(id: string, variant: ExportVariant): void {
  previewCardElement(id, variant)?.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}

/** Page queue: bring both preview strips into view and center the card in each. */
function scrollBothPreviewCards(id: string): void {
  document.querySelector(".preview-dual-stack")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  requestAnimationFrame(() => {
    scrollPreviewCardInStrip(id, "live");
    scrollPreviewCardInStrip(id, "resolume");
  });
}

function exportPngFileName(ref: VerseRef, variant: ExportVariant): string {
  return `${sanitizeFileName(formatReference(ref))}-${variant}.png`;
}

async function nextFrames(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}

export default function App() {
  const persisted = useMemo(() => loadPersisted(), []);
  const [useSample, setUseSample] = useState(true);
  const [useBibleComEn, setUseBibleComEn] = useState(
    () => persisted.useBibleComEn ?? true,
  );
  const [useBibleComHi, setUseBibleComHi] = useState(
    () => persisted.useBibleComHi ?? true,
  );
  const [sqliteEnActive, setSqliteEnActive] = useState(false);
  const [sqliteHiActive, setSqliteHiActive] = useState(false);
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
  const [resolumeLayout, setResolumeLayout] = useState<LayoutSpec>(() =>
    persisted.resolumeLayout ?? cloneResolumeLayout(),
  );
  const [resolumeTypography, setResolumeTypography] = useState<TypographySpec>(() =>
    normalizeTypography(persisted.resolumeTypography ?? defaultResolumeTypography()),
  );
  const [verseBlockOrder, setVerseBlockOrder] = useState<VerseBlockOrder>(
    () => persisted.verseBlockOrder ?? DEFAULT_VERSE_BLOCK_ORDER,
  );
  const [schemaEnJson, setSchemaEnJson] = useState(() =>
    JSON.stringify(persisted.schemaEn ?? defaultSqliteSchema(), null, 2),
  );
  const [schemaHiJson, setSchemaHiJson] = useState(() =>
    JSON.stringify(persisted.schemaHi ?? defaultSqliteSchema(), null, 2),
  );

  const [bgDataUrl, setBgDataUrl] = useState<string | null>(() =>
    loadBackgroundDataUrl(),
  );
  const [bgSaveWarning, setBgSaveWarning] = useState<string | null>(null);
  const [pages, setPages] = useState<VersePage[]>(persisted.pages ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    persisted.pages?.[0]?.id ?? null,
  );

  const [draft, setDraft] = useState<VerseDraftItem[] | null>(null);

  const [exportPage, setExportPage] = useState<VersePage | null>(null);
  const [exportVariant, setExportVariant] = useState<ExportVariant>("live");
  const [exportBusy, setExportBusy] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [bundledStatus, setBundledStatus] = useState<
    "idle" | "loading" | "loaded" | "missing"
  >("idle");
  const [sqliteFileErr, setSqliteFileErr] = useState<string | null>(null);
  const [sqliteLoadNote, setSqliteLoadNote] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRailOpen, setEditRailOpen] = useState(false);
  const [workflowVariant, setWorkflowVariant] = useState<ExportVariant>("live");
  const exportRef = useRef<HTMLDivElement>(null);
  const exportResolumeRef = useRef<HTMLDivElement>(null);
  const sqliteEnProviderRef = useRef<SqliteBibleProvider | null>(null);
  const sqliteHiProviderRef = useRef<SqliteBibleProvider | null>(null);
  const sidebarId = "app-sidebar-panel";

  const selectPage = useCallback(
    (id: string, scrollTarget?: PreviewScrollTarget) => {
      setSelectedId(id);
      if (!scrollTarget) return;
      requestAnimationFrame(() => {
        if (scrollTarget === "both") {
          scrollBothPreviewCards(id);
        } else {
          scrollPreviewCard(id, scrollTarget);
        }
      });
    },
    [],
  );

  const selected = pages.find((p) => p.id === selectedId) ?? null;


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
    if (useSample) return;

    if (useBibleComEn) {
      setProviderEn((prev) => {
        if (prev instanceof BibleComProvider) return prev;
        return new BibleComProvider(BIBLE_COM_EN);
      });
    } else if (sqliteEnActive && sqliteEnProviderRef.current) {
      setProviderEn(sqliteEnProviderRef.current);
    } else {
      setProviderEn((prev) => {
        if (prev instanceof StaticJsonProvider) return prev;
        return new StaticJsonProvider(LABEL_EN, "en");
      });
    }

    if (useBibleComHi) {
      setProviderHi((prev) => {
        if (prev instanceof BibleComProvider) return prev;
        return new BibleComProvider(BIBLE_COM_HI);
      });
    } else if (sqliteHiActive && sqliteHiProviderRef.current) {
      setProviderHi(sqliteHiProviderRef.current);
    } else {
      setProviderHi((prev) => {
        if (prev instanceof StaticJsonProvider) return prev;
        return new StaticJsonProvider(LABEL_HI, "hi");
      });
    }
  }, [useSample, useBibleComEn, useBibleComHi, sqliteEnActive, sqliteHiActive]);

  useEffect(() => {
    if (bgDataUrl && !saveBackgroundDataUrl(bgDataUrl)) {
      setBgSaveWarning(
        "Background image is too large to remember after refresh. Use a smaller file or replace public/bg.png.",
      );
    } else {
      setBgSaveWarning(null);
    }
  }, [bgDataUrl]);

  useEffect(() => {
    savePersisted({
      pages,
      cardLayout,
      typography,
      resolumeLayout,
      resolumeTypography,
      schemaEn,
      schemaHi,
      verseBlockOrder,
      useBibleComEn,
      useBibleComHi,
    });
  }, [
    pages,
    cardLayout,
    typography,
    resolumeLayout,
    resolumeTypography,
    schemaEn,
    schemaHi,
    verseBlockOrder,
    useBibleComEn,
    useBibleComHi,
  ]);

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
        sqliteEnProviderRef.current = pEn;
        sqliteHiProviderRef.current = pHi;
        setSqliteEnActive(true);
        setSqliteHiActive(true);
        if (!useBibleComEn) setProviderEn(pEn);
        if (!useBibleComHi) setProviderHi(pHi);
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

  const onPreview = useCallback((items: VerseDraftItem[]) => {
    setDraft(items.length > 0 ? items : null);
  }, []);

  const addPage = async () => {
    if (!draft?.length) return;
    await document.fonts.ready;
    const newPages: VersePage[] = [];
    for (const item of draft) {
      const liveBodyFonts = computeAutoFitBodyFontOverrides(
        item,
        cardLayout,
        typography,
        verseBlockOrder,
      );
      const resolumeBodyFonts = computeAutoFitBodyFontOverrides(
        item,
        resolumeLayout,
        resolumeTypography,
        verseBlockOrder,
        "resolume",
      );
      newPages.push({
        id: newId(),
        ref: item.ref,
        textEn: item.textEn,
        textHi: item.textHi,
        highlightsEn: [],
        highlightsHi: [],
        typographySizes: liveBodyFonts,
        resolumeTypographySizes: resolumeBodyFonts,
      });
    }
    setPages((p) => [...p, ...newPages]);
    selectPage(newPages[0]!.id, "live");
    setDraft(null);
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
      ps.map(({ typographySizes: _ts, ...rest }) => ({ ...rest })),
    );
  };

  const resetResolumeDesign = () => {
    setResolumeLayout(cloneResolumeLayout());
    setResolumeTypography(normalizeTypography(defaultResolumeTypography()));
    setPages((ps) =>
      ps.map(({ resolumeTypographySizes: _rs, ...rest }) => ({ ...rest })),
    );
  };

  const onBgFile = (file: File | null) => {
    setBgSaveWarning(null);
    if (!file) {
      setBgDataUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      console.warn("Background file is not a supported image type:", file.type);
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      setBgDataUrl(dataUrl);
      if (!saveBackgroundDataUrl(dataUrl)) {
        setBgSaveWarning(
          "Background image is too large to remember after refresh. Use a smaller file or replace public/bg.png.",
        );
      }
    };
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
        sqliteEnProviderRef.current = prov;
        setSqliteEnActive(true);
        if (!useBibleComEn) setProviderEn(prov);
      } else {
        setSchemaHi(resolved);
        setSchemaHiJson(JSON.stringify(resolved, null, 2));
        sqliteHiProviderRef.current = prov;
        setSqliteHiActive(true);
        if (!useBibleComHi) setProviderHi(prov);
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

  const exportNodeFor = (variant: ExportVariant) =>
    variant === "live" ? exportRef.current : exportResolumeRef.current;

  const measureExportNode = (variant: ExportVariant) => {
    const layout = variant === "live" ? cardLayout : resolumeLayout;
    const node = exportNodeFor(variant);
    if (!node) throw new Error("Export node missing");
    const ow = Math.round(node.offsetWidth);
    const oh = Math.round(node.offsetHeight);
    return {
      node,
      size: {
        width: ow > 0 ? ow : layout.width,
        height: oh > 0 ? oh : layout.height,
      },
    };
  };

  const capturePngBlob = async (
    page: VersePage,
    variant: ExportVariant,
    fontEmbedCSS: string,
  ): Promise<Blob> => {
    flushSync(() => {
      setExportPage(page);
      setExportVariant(variant);
    });
    await nextFrames(1);
    const { node, size } = measureExportNode(variant);
    await waitForImagesIn(node);
    return renderNodeToPng(node, size, { fontEmbedCSS });
  };

  const prepareExportBatch = async (
    variant: ExportVariant,
    firstPage: VersePage,
  ): Promise<string> => {
    flushSync(() => {
      setExportVariant(variant);
      setExportPage(firstPage);
    });
    await document.fonts.ready;
    await nextFrames(1);
    const { node } = measureExportNode(variant);
    await waitForImagesIn(node);
    return prefetchFontEmbedCss(node);
  };

  const runExportBatch = async (
    variant: ExportVariant,
    list: VersePage[],
    onBlob: (page: VersePage, blob: Blob) => void | Promise<void>,
  ) => {
    flushSync(() => {
      setExportVariant(variant);
      setExportBusy(true);
    });
    try {
      const fontEmbedCSS = await prepareExportBatch(variant, list[0]!);
      for (const p of list) {
        const blob = await capturePngBlob(p, variant, fontEmbedCSS);
        await onBlob(p, blob);
      }
    } finally {
      setExportPage(null);
      setExportVariant("live");
      setExportBusy(false);
    }
  };

  const pagesByIds = (ids: string[]) =>
    pages.filter((p) => ids.includes(p.id));

  const downloadPng = async (variant: ExportVariant, pageIds: string[]) => {
    const list = pagesByIds(pageIds);
    if (list.length === 0) return;
    await runExportBatch(variant, list, (p, blob) => {
      savePng(blob, exportPngFileName(p.ref, variant));
    });
  };

  const downloadZip = async (variant: ExportVariant, pageIds: string[]) => {
    const list = pagesByIds(pageIds);
    if (list.length === 0) return;
    const entries: { name: string; blob: Blob }[] = [];
    await runExportBatch(variant, list, (p, blob) => {
      entries.push({
        name: exportPngFileName(p.ref, variant),
        blob,
      });
    });
    await zipBlobs(
      entries,
      datedZipFileName(variant === "live" ? "live" : "resolume"),
    );
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

  const updateResolumeLayout = useCallback(
    (fn: (prev: LayoutSpec) => LayoutSpec) => {
      setResolumeLayout((prev) => fn(prev));
    },
    [],
  );

  const updateResolumeTypography = useCallback(
    (fn: (prev: TypographySpec) => TypographySpec) => {
      setResolumeTypography((prev) => normalizeTypography(fn(prev)));
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
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const cardBackgroundUrl =
    bgDataUrl && bgDataUrl.trim().length > 0 ? bgDataUrl : null;

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
          Parallel {providerEn.versionLabel} + {providerHi.versionLabel}. Open the menu for
          databases and background, build a queue, then use <strong>Edit card layout</strong> when
          you need the design panel.
        </p>
        <div className="app-header__meta">
          <span className="chip">
            {pages.length} {pages.length === 1 ? "card" : "cards"} in queue
          </span>
          {selected && (
            <span className="chip chip--accent">{formatReference(selected.ref)}</span>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setSidebarOpen(true)}
          >
            Data &amp; background
          </button>
          <button
            type="button"
            className={
              editRailOpen ? "btn btn--sm" : "btn btn--ghost btn--sm"
            }
            aria-expanded={editRailOpen}
            onClick={() => setEditRailOpen((open) => !open)}
          >
            {editRailOpen ? "Hide edit panel" : "Edit card layout"}
          </button>
        </div>
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
          <div className="bible-source-column">
            <label>
              English SQLite (.sqlite) — optional override
              <input
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,*/*"
                onChange={(e) =>
                  void loadSqlite(e.target.files?.[0] ?? null, "en")
                }
              />
            </label>
            <label className="bible-source-column__toggle btn-row">
              <input
                type="checkbox"
                checked={useBibleComEn}
                disabled={useSample}
                onChange={(e) => setUseBibleComEn(e.target.checked)}
              />
              Use Bible.com API ({BIBLE_COM_EN.label})
            </label>
          </div>
          <div className="bible-source-column">
            <label>
              Hindi SQLite (.sqlite) — optional override
              <input
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,*/*"
                onChange={(e) =>
                  void loadSqlite(e.target.files?.[0] ?? null, "hi")
                }
              />
            </label>
            <label className="bible-source-column__toggle btn-row">
              <input
                type="checkbox"
                checked={useBibleComHi}
                disabled={useSample}
                onChange={(e) => setUseBibleComHi(e.target.checked)}
              />
              Use Bible.com API ({BIBLE_COM_HI.label})
            </label>
          </div>
        </div>
        {!useSample && (useBibleComEn || useBibleComHi) && (
          <p className="hint" style={{ marginTop: "0.5rem" }}>
            Bible.com uses the same Next.js endpoint as the website. Local dev proxies requests
            through <code>/bible-com</code>. Uncheck a box to use the SQLite file for that language
            instead (after loading a file above).
          </p>
        )}
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
          Card layout defaults live in <code>src/bible/types.ts</code>. Use the{" "}
          <strong>Edit card</strong> panel on the right for Live and Resolume.
        </p>
        <label>
          Background image
          <input type="file" accept="image/*" onChange={(e) => onBgFile(e.target.files?.[0] ?? null)} />
        </label>
        {bgSaveWarning && <p className="warn">{bgSaveWarning}</p>}
        <p className="hint" style={{ marginTop: "0.35rem" }}>
          Uploads are saved in this browser so they survive refresh. With no upload, cards use the
          default background color (<code>#554111</code> in <code>types.ts</code>). Very large
          images may exceed storage limits — use a compressed PNG/JPEG or replace{" "}
          <code>public/bg.png</code> on disk. HEIC often will not display.
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

        <div
          className={
            editRailOpen
              ? "app-content app-content--edit-open"
              : "app-content"
          }
        >
          <div className="app-content__main">
      <div className="workflow-block">
        <p className="workflow-heading">1 · Build your queue</p>

      <ReferencePicker
        providerEn={providerEn}
        providerHi={providerHi}
        onPreview={onPreview}
      />

      {draft && draft.length > 0 && (
        <section className="panel verse-draft" aria-label="Verse draft (read-only)">
          <div className="verse-draft__head">
            <div>
              <h2 className="verse-draft__title">
                {draft.length === 1 ? "Verse draft" : `Verse draft (${draft.length})`}
              </h2>
              <p className="hint verse-draft__hint">
                Review fetched text before adding to the queue. Each verse becomes its
                own card. This section is not editable.
              </p>
            </div>
            <span className="verse-draft__badge">Read-only</span>
          </div>
          <div className="verse-draft__entries">
            {draft.map((item) => (
              <article
                key={`${item.ref.bookId}-${item.ref.chapter}-${item.ref.verse}`}
                className="verse-draft__entry"
              >
                <h3 className="verse-draft__entry-ref">
                  {formatReference(item.ref)}
                </h3>
                <div className="verse-draft__body">
                  <div className="verse-draft__col">
                    <span className="verse-draft__label">{LABEL_HI}</span>
                    <p className="verse-draft__text">{item.textHi}</p>
                  </div>
                  <div className="verse-draft__col">
                    <span className="verse-draft__label">{LABEL_EN}</span>
                    <p className="verse-draft__text">{item.textEn}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="verse-draft__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void addPage()}
            >
              {draft.length === 1
                ? "Add to page queue"
                : `Add ${draft.length} cards to queue`}
            </button>
          </div>
        </section>
      )}

      <PageQueuePanel
        pages={pages}
        selectedId={selectedId}
        selected={selected}
        onSelect={(id) => selectPage(id, "both")}
        onRemove={(id) => {
          setPages((xs) => xs.filter((x) => x.id !== id));
          if (selectedId === id) setSelectedId(null);
        }}
        onRemoveAll={() => {
          setPages([]);
          setSelectedId(null);
        }}
        exportBusy={exportBusy}
        onOpenExport={() => setExportModalOpen(true)}
        onUpdateHighlights={updateSelectedHighlights}
        labelEn={LABEL_EN}
        labelHi={LABEL_HI}
      />
      </div>

      <div className="workflow-block">
        <p className="workflow-heading">2 · Preview</p>

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

        {pages.length > 0 ? (
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
                  onClick={() => selectPage(p.id, "live")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectPage(p.id, "live");
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
            onUpdate={(patch) =>
              updatePageTypographyForSelected(patch, "typographySizes")
            }
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
                  onClick={() => selectPage(p.id, "resolume")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectPage(p.id, "resolume");
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
            onUpdate={(patch) =>
              updatePageTypographyForSelected(patch, "resolumeTypographySizes")
            }
          />
              </CollapsiblePanel>
          </div>
        ) : (
          <p className="muted">Add verses to the queue to preview cards.</p>
        )}
      </div>
          </div>

          {editRailOpen && (
          <aside className="app-edit-rail" aria-label="Edit card design">
            <p className="workflow-heading app-edit-rail__heading">Edit card</p>
            <section className="panel app-edit-rail__panel app-edit-rail__panel--order">
              <VerseOrderControl
                value={verseBlockOrder}
                onChange={setVerseBlockOrder}
              />
            </section>
            <div
              className="variant-tabs"
              role="tablist"
              aria-label="Edit card variant"
            >
              <button
                type="button"
                role="tab"
                aria-selected={workflowVariant === "live"}
                className={
                  workflowVariant === "live"
                    ? "variant-tab variant-tab--active"
                    : "variant-tab"
                }
                onClick={() => setWorkflowVariant("live")}
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
                onClick={() => setWorkflowVariant("resolume")}
              >
                Resolume
              </button>
            </div>

            <section className="panel app-edit-rail__panel">
              {workflowVariant === "live" ? (
                <>
                  <h2 className="app-edit-rail__title">Live layout</h2>
                  <p className="hint app-edit-rail__hint">
                    Canvas, text boxes, and global fonts.
                  </p>
                  <DesignToolbar
                    mode="live"
                    layout={cardLayout}
                    onUpdateLayout={updateCardLayout}
                    typography={typography}
                    onUpdateTypography={updateTypography}
                    onResetDesign={resetCardDesign}
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
                    onUpdateLayout={updateResolumeLayout}
                    typography={resolumeTypography}
                    onUpdateTypography={updateResolumeTypography}
                    onResetDesign={resetResolumeDesign}
                  />
                </>
              )}
            </section>
          </aside>
          )}
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        pages={pages}
        selectedId={selectedId}
        exportBusy={exportBusy}
        onClose={() => setExportModalOpen(false)}
        onDownloadPng={downloadPng}
        onDownloadZip={downloadZip}
      />

      {cardPage && (
        <>
          {(!exportBusy || exportVariant === "live") && (
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
                  verseBlockOrder={verseBlockOrder}
                />
              </div>
            </div>
          )}
          {(!exportBusy || exportVariant === "resolume") && (
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
                  verseBlockOrder={verseBlockOrder}
                />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

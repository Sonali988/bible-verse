import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BibleProvider } from "./bible/provider";
import { SqliteBibleProvider } from "./bible/sqlite/SqliteBibleProvider";
import {
  defaultSqliteSchema,
  type SqliteSchemaConfig,
} from "./bible/sqlite/schemaConfig";
import { EmptyBibleProvider } from "./bible/StaticJsonProvider";
import { BibleComProvider } from "./bible/bibleCom/BibleComProvider";
import { BIBLE_COM_HI } from "./bible/bibleCom/config";
import { YouVersionProvider } from "./bible/youversion/YouVersionProvider";
import { YOUVERSION_HHBD, YOUVERSION_TPT } from "./bible/youversion/config";
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
import { capturePngBlob, prepareExportBatch } from "./export/batchExport";
import { savePng, zipBlobs } from "./export/downloadZip";
import { ExportRasterHost } from "./export/ExportRasterHost";
import {
  createExportProgressTracker,
  type ExportFormat,
} from "./export/exportProgress";
import { exportProgressStore } from "./export/exportProgressStore";
import type { ExportVariant } from "./export/exportVariant";
import { formatReference } from "./lib/referenceParser";
import { newId } from "./lib/id";
import {
  saveBackgroundDataUrl,
  savePersistedLocal,
  savePersistedRemote,
  DEFAULT_VERSE_BLOCK_ORDER,
  type PersistedState,
} from "./lib/storage";
import type { AppBootstrapData } from "./AppBootstrap";
import type { VerseBlockOrder } from "./lib/verseBlockOrder";
import { computeAutoFitBodyFontOverrides } from "./lib/fitVerseBodyFont";
import { VerseOrderControl } from "./components/VerseOrderControl";
import {
  BUNDLED_SQLITE_URLS,
  fetchSqliteArrayBuffer,
} from "./config/bundledBibles";
import {
  bundledEnglishSqliteUrl,
  ENGLISH_SQLITE_VERSIONS_IN_UI,
  englishSqliteVersion,
  englishVersionUsesYouVersion,
  normalizeEnglishSqliteVersionId,
  type EnglishSqliteVersionId,
} from "./config/englishSqliteVersions";
import {
  HINDI_SOURCES,
  hindiSourceLabel,
  hindiSourceUsesBibleCom,
  hindiSourceUsesSqlite,
  hindiSourceUsesYouVersion,
  normalizeHindiSourceId,
  type HindiSourceId,
} from "./config/hindiSources";

const SQLITE_HI_LABEL = "HINOVBSI";

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

export default function App({
  bootstrap,
  sharedStorage = false,
  onReloadShared,
}: {
  bootstrap: AppBootstrapData;
  sharedStorage?: boolean;
  onReloadShared?: () => Promise<void>;
}) {
  const persisted = bootstrap.persisted;
  const [hindiSourceId, setHindiSourceId] = useState<HindiSourceId>(() =>
    normalizeHindiSourceId(persisted.hindiSourceId),
  );
  const [englishVersionId, setEnglishVersionId] = useState<EnglishSqliteVersionId>(
    () =>
      normalizeEnglishSqliteVersionId(persisted.englishSqliteVersionId),
  );
  const englishLabel = englishSqliteVersion(englishVersionId).label;
  const hindiLabel = hindiSourceLabel(hindiSourceId);
  const englishUsesYouVersion = englishVersionUsesYouVersion(englishVersionId);
  const [sqliteEnActive, setSqliteEnActive] = useState(false);
  const [sqliteHiActive, setSqliteHiActive] = useState(false);
  const [schemaEn, setSchemaEn] = useState<SqliteSchemaConfig>(
    persisted.schemaEn ?? defaultSqliteSchema(),
  );
  const [schemaHi, setSchemaHi] = useState<SqliteSchemaConfig>(
    persisted.schemaHi ?? defaultSqliteSchema(),
  );

  const [providerEn, setProviderEn] = useState<BibleProvider>(() => {
    const label = englishSqliteVersion(
      normalizeEnglishSqliteVersionId(persisted.englishSqliteVersionId),
    ).label;
    return new EmptyBibleProvider(label);
  });
  const [providerHi, setProviderHi] = useState<BibleProvider>(
    () => new EmptyBibleProvider(hindiSourceLabel(normalizeHindiSourceId(persisted.hindiSourceId))),
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

  const [bgDataUrl, setBgDataUrl] = useState<string | null>(
    () => bootstrap.bgDataUrl,
  );
  const [bgSaveWarning, setBgSaveWarning] = useState<string | null>(null);
  const [pages, setPages] = useState<VersePage[]>(persisted.pages ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    persisted.pages?.[0]?.id ?? null,
  );

  const [draft, setDraft] = useState<VerseDraftItem[] | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [enBundledLoading, setEnBundledLoading] = useState(false);
  const [hiBundledLoading, setHiBundledLoading] = useState(false);
  const [sqliteFileErr, setSqliteFileErr] = useState<string | null>(null);
  const [sqliteLoadNote, setSqliteLoadNote] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editRailOpen, setEditRailOpen] = useState(false);
  const [workflowVariant, setWorkflowVariant] = useState<ExportVariant>("live");
  const exportHostRef = useRef<ExportRasterHost | null>(null);
  const sqliteEnProviderRef = useRef<SqliteBibleProvider | null>(null);
  const sqliteHiProviderRef = useRef<SqliteBibleProvider | null>(null);
  const bundledEnLoadGenRef = useRef(0);
  const bundledHiLoadGenRef = useRef(0);

  const bundledStatus = useMemo(() => {
    if (enBundledLoading || hiBundledLoading) return "loading" as const;
    if (sqliteEnActive && sqliteHiActive) return "loaded" as const;
    if (sqliteEnActive || sqliteHiActive) return "partial" as const;
    return "missing" as const;
  }, [
    enBundledLoading,
    hiBundledLoading,
    sqliteEnActive,
    sqliteHiActive,
  ]);
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
    if (englishUsesYouVersion) {
      setProviderEn((prev) => {
        if (prev instanceof YouVersionProvider && prev.versionLabel === englishLabel) {
          return prev;
        }
        return new YouVersionProvider(YOUVERSION_TPT);
      });
    } else if (
      sqliteEnActive &&
      sqliteEnProviderRef.current?.isReady()
    ) {
      setProviderEn(sqliteEnProviderRef.current);
    } else {
      setProviderEn((prev) => {
        if (prev instanceof SqliteBibleProvider && prev.isReady()) return prev;
        if (prev instanceof EmptyBibleProvider && prev.versionLabel === englishLabel) {
          return prev;
        }
        return new EmptyBibleProvider(englishLabel);
      });
    }

    if (hindiSourceUsesYouVersion(hindiSourceId)) {
      setProviderHi((prev) => {
        if (prev instanceof YouVersionProvider && prev.versionLabel === hindiLabel) {
          return prev;
        }
        return new YouVersionProvider(YOUVERSION_HHBD);
      });
    } else if (hindiSourceUsesBibleCom(hindiSourceId)) {
      setProviderHi((prev) => {
        if (prev instanceof BibleComProvider) return prev;
        return new BibleComProvider(BIBLE_COM_HI);
      });
    } else if (
      sqliteHiActive &&
      sqliteHiProviderRef.current?.isReady()
    ) {
      setProviderHi(sqliteHiProviderRef.current);
    } else {
      setProviderHi((prev) => {
        if (prev instanceof SqliteBibleProvider && prev.isReady()) return prev;
        if (prev instanceof EmptyBibleProvider && prev.versionLabel === hindiLabel) {
          return prev;
        }
        return new EmptyBibleProvider(hindiLabel);
      });
    }
  }, [
    hindiSourceId,
    sqliteEnActive,
    sqliteHiActive,
    englishLabel,
    hindiLabel,
    englishUsesYouVersion,
  ]);

  const [sharedSaveState, setSharedSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const sharedSaveTimerRef = useRef<number | undefined>(undefined);
  const remoteUpdatedAtRef = useRef<number | null>(bootstrap.remoteUpdatedAt);
  const skipInitialRemoteSaveRef = useRef(sharedStorage);

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
    const snapshot: PersistedState = {
      pages,
      cardLayout,
      typography,
      resolumeLayout,
      resolumeTypography,
      schemaEn,
      schemaHi,
      verseBlockOrder,
      hindiSourceId,
      englishSqliteVersionId: englishVersionId,
    };

    if (!sharedStorage) {
      savePersistedLocal(snapshot);
      return;
    }

    if (skipInitialRemoteSaveRef.current) {
      skipInitialRemoteSaveRef.current = false;
      return;
    }

    window.clearTimeout(sharedSaveTimerRef.current);
    setSharedSaveState("saving");
    sharedSaveTimerRef.current = window.setTimeout(() => {
      void savePersistedRemote(snapshot, remoteUpdatedAtRef.current ?? undefined)
        .then((updatedAt) => {
          remoteUpdatedAtRef.current = updatedAt;
          setSharedSaveState("saved");
        })
        .catch(() => {
          setSharedSaveState("error");
        });
    }, 800);

    return () => {
      window.clearTimeout(sharedSaveTimerRef.current);
    };
  }, [
    pages,
    cardLayout,
    typography,
    resolumeLayout,
    resolumeTypography,
    schemaEn,
    schemaHi,
    verseBlockOrder,
    hindiSourceId,
    englishVersionId,
    sharedStorage,
  ]);

  useEffect(() => {
    if (selectedId && !pages.some((p) => p.id === selectedId)) {
      setSelectedId(pages[0]?.id ?? null);
    }
  }, [pages, selectedId]);

  /** Auto-load bundled Hindi SQLite once (independent of English version). */
  useEffect(() => {
    const ac = new AbortController();
    const loadGen = ++bundledHiLoadGenRef.current;
    const isCurrentLoad = () => bundledHiLoadGenRef.current === loadGen;
    const schemaHiBoot = defaultSqliteSchema();
    setHiBundledLoading(true);
    void (async () => {
      const bufHi = await fetchSqliteArrayBuffer(BUNDLED_SQLITE_URLS.hi, ac.signal);
      if (!isCurrentLoad() || ac.signal.aborted) return;

      if (bufHi) {
        try {
          const pHi = new SqliteBibleProvider(SQLITE_HI_LABEL, schemaHiBoot);
          const resolvedHi = await pHi.loadArrayBuffer(bufHi);
          if (!isCurrentLoad() || ac.signal.aborted) {
            pHi.close();
            return;
          }
          sqliteHiProviderRef.current?.close();
          setSchemaHi(resolvedHi);
          sqliteHiProviderRef.current = pHi;
          setSqliteHiActive(true);
          if (hindiSourceUsesSqlite(hindiSourceId)) setProviderHi(pHi);
          if (JSON.stringify(resolvedHi) !== JSON.stringify(schemaHiBoot)) {
            setSqliteLoadNote(
              `Hindi table "${resolvedHi.verseTable}" auto-detected.`,
            );
          }
        } catch (e) {
          if (isCurrentLoad() && !ac.signal.aborted) {
            sqliteHiProviderRef.current?.close();
            sqliteHiProviderRef.current = null;
            setSqliteHiActive(false);
            if (hindiSourceUsesSqlite(hindiSourceId)) {
              setProviderHi(new EmptyBibleProvider(hindiLabel));
            }
            setSqliteFileErr(
              e instanceof Error ? e.message : String(e),
            );
          }
        }
      } else if (
        isCurrentLoad() &&
        !ac.signal.aborted &&
        hindiSourceUsesSqlite(hindiSourceId)
      ) {
        setSqliteFileErr(
          `Could not load Hindi from ${BUNDLED_SQLITE_URLS.hi}. Add public/bibles/bsiov.sqlite or use the file picker.`,
        );
      }

      if (isCurrentLoad()) setHiBundledLoading(false);
    })();
    return () => {
      ac.abort();
      if (bundledHiLoadGenRef.current === loadGen) setHiBundledLoading(false);
    };
  }, [hindiSourceId]);

  /** Auto-load bundled English SQLite when the selected version changes. */
  useEffect(() => {
    if (englishVersionUsesYouVersion(englishVersionId)) {
      setEnBundledLoading(false);
      return;
    }
    const ac = new AbortController();
    const loadGen = ++bundledEnLoadGenRef.current;
    const isCurrentLoad = () => bundledEnLoadGenRef.current === loadGen;
    const schemaEnBoot = defaultSqliteSchema();
    setEnBundledLoading(true);
    void (async () => {
      const enUrl = bundledEnglishSqliteUrl(englishVersionId);
      const bufEn = await fetchSqliteArrayBuffer(enUrl, ac.signal);
      if (!isCurrentLoad() || ac.signal.aborted) return;

      if (bufEn) {
        try {
          const label = englishSqliteVersion(englishVersionId).label;
          const pEn = new SqliteBibleProvider(label, schemaEnBoot);
          const resolvedEn = await pEn.loadArrayBuffer(bufEn);
          if (!isCurrentLoad() || ac.signal.aborted) {
            pEn.close();
            return;
          }
          sqliteEnProviderRef.current?.close();
          setSchemaEn(resolvedEn);
          sqliteEnProviderRef.current = pEn;
          setSqliteEnActive(true);
          if (!englishUsesYouVersion) setProviderEn(pEn);
          setSqliteFileErr(null);
          if (JSON.stringify(resolvedEn) !== JSON.stringify(schemaEnBoot)) {
            setSqliteLoadNote(
              `English (${label}) table "${resolvedEn.verseTable}" auto-detected.`,
            );
          }
        } catch (e) {
          if (isCurrentLoad() && !ac.signal.aborted) {
            sqliteEnProviderRef.current?.close();
            sqliteEnProviderRef.current = null;
            setSqliteEnActive(false);
            if (!englishUsesYouVersion) {
              setProviderEn(
                new EmptyBibleProvider(englishSqliteVersion(englishVersionId).label),
              );
            }
            setSqliteFileErr(
              e instanceof Error ? e.message : String(e),
            );
          }
        }
      } else if (
        isCurrentLoad() &&
        !ac.signal.aborted &&
        !englishUsesYouVersion
      ) {
        sqliteEnProviderRef.current?.close();
        sqliteEnProviderRef.current = null;
        setSqliteEnActive(false);
        if (!englishUsesYouVersion) {
          setProviderEn(
            new EmptyBibleProvider(englishSqliteVersion(englishVersionId).label),
          );
        }
        const v = englishSqliteVersion(englishVersionId);
        setSqliteFileErr(
          `Could not load ${v.label} from ${enUrl}. Add public/bibles/${v.bundledFile} or use the file picker.`,
        );
      }

      if (isCurrentLoad()) setEnBundledLoading(false);
    })();
    return () => {
      ac.abort();
      if (bundledEnLoadGenRef.current === loadGen) setEnBundledLoading(false);
    };
  }, [englishVersionId, englishUsesYouVersion]);

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
        versionLabelEn: providerEn.versionLabel,
        versionLabelHi: providerHi.versionLabel,
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
      const label = lang === "en" ? englishLabel : SQLITE_HI_LABEL;
      const prov = new SqliteBibleProvider(label, configured);
      const resolved = await prov.loadFile(file);
      if (lang === "en") {
        setSchemaEn(resolved);
        sqliteEnProviderRef.current = prov;
        setSqliteEnActive(true);
        if (!englishUsesYouVersion) setProviderEn(prov);
      } else {
        setSchemaHi(resolved);
        sqliteHiProviderRef.current = prov;
        setSqliteHiActive(true);
        if (hindiSourceUsesSqlite(hindiSourceId)) setProviderHi(prov);
      }
      if (JSON.stringify(resolved) !== JSON.stringify(configured)) {
        setSqliteLoadNote(
          `${lang === "en" ? "English" : "Hindi"} table "${resolved.verseTable}" auto-detected.`,
        );
      }
    } catch (e) {
      setSqliteLoadNote(null);
      setSqliteFileErr(
        e instanceof Error ? e.message : `Could not load ${lang} database: ${String(e)}`,
      );
    }
  };

  const clearExportProgressSoon = () => {
    window.setTimeout(() => exportProgressStore.setImmediate(null), 5000);
  };

  const runExportBatch = async (
    variant: ExportVariant,
    list: VersePage[],
    format: ExportFormat,
    onBlob: (page: VersePage, blob: Blob) => void | Promise<void>,
  ) => {
    const host = exportHostRef.current;
    if (!host) throw new Error("Export host missing");
    const tracker = createExportProgressTracker(list.length, format, variant);
    setExportBusy(true);
    exportProgressStore.setImmediate(tracker.preparing());
    let completed = 0;
    try {
      const layoutSize = await prepareExportBatch(host, variant, list[0]!);
      for (let i = 0; i < list.length; i++) {
        const p = list[i]!;
        exportProgressStore.set(tracker.rendering(i, formatReference(p.ref)));
        const t0 = performance.now();
        const blob = await capturePngBlob(host, p, variant, layoutSize);
        tracker.recordRender(performance.now() - t0);
        await onBlob(p, blob);
        completed = i + 1;
      }
      return tracker;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      exportProgressStore.setImmediate(tracker.error(message, completed));
      setExportBusy(false);
      clearExportProgressSoon();
      throw e;
    }
  };

  const pagesByIds = (ids: string[]) =>
    pages.filter((p) => ids.includes(p.id));

  const downloadPng = async (variant: ExportVariant, pageIds: string[]) => {
    const list = pagesByIds(pageIds);
    if (list.length === 0) return;
    try {
      const tracker = await runExportBatch(variant, list, "png", (p, blob) => {
        savePng(blob, exportPngFileName(p.ref, variant));
      });
      exportProgressStore.setImmediate(tracker.complete());
    } finally {
      setExportBusy(false);
      clearExportProgressSoon();
    }
  };

  const downloadZip = async (variant: ExportVariant, pageIds: string[]) => {
    const list = pagesByIds(pageIds);
    if (list.length === 0) return;
    const entries: { name: string; blob: Blob }[] = [];
    try {
      const tracker = await runExportBatch(variant, list, "zip", (p, blob) => {
        entries.push({
          name: exportPngFileName(p.ref, variant),
          blob,
        });
      });
      exportProgressStore.setImmediate(tracker.zipping());
      await zipBlobs(
        entries,
        datedZipFileName(variant === "live" ? "live" : "resolume"),
      );
      exportProgressStore.setImmediate(tracker.complete());
    } finally {
      setExportBusy(false);
      clearExportProgressSoon();
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

  const updateSelectedText = (lang: "en" | "hi", text: string) => {
    if (!selected) return;
    setPages((list) =>
      list.map((p) => {
        if (p.id !== selected.id) return p;
        const updated = {
          ...p,
          textEn: lang === "en" ? text : p.textEn,
          textHi: lang === "hi" ? text : p.textHi,
          highlightsEn: lang === "en" ? [] : p.highlightsEn,
          highlightsHi: lang === "hi" ? [] : p.highlightsHi,
        };
        return {
          ...updated,
          typographySizes: computeAutoFitBodyFontOverrides(
            updated,
            cardLayout,
            typography,
            verseBlockOrder,
          ),
          resolumeTypographySizes: computeAutoFitBodyFontOverrides(
            updated,
            resolumeLayout,
            resolumeTypography,
            verseBlockOrder,
            "resolume",
          ),
        };
      }),
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

  useEffect(() => {
    const host = new ExportRasterHost();
    host.mount(document.body);
    exportHostRef.current = host;
    return () => {
      host.destroy();
      exportHostRef.current = null;
    };
  }, []);

  useEffect(() => {
    exportHostRef.current?.setProps({
      cardLayout,
      resolumeLayout,
      typography,
      resolumeTypography,
      backgroundDataUrl: cardBackgroundUrl,
      englishLabel,
      labelHi: hindiLabel,
      verseBlockOrder,
    });
  }, [
    cardLayout,
    resolumeLayout,
    typography,
    resolumeTypography,
    cardBackgroundUrl,
    englishLabel,
    hindiLabel,
    verseBlockOrder,
  ]);

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
        <div className="app-header__layout">
          <div className="app-header__main">
            <div className="app-header__brand">
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
              {sharedStorage && (
                <>
                  <span className="chip">Shared workspace</span>
                  {sharedSaveState === "saving" && (
                    <span className="chip">Saving…</span>
                  )}
                  {sharedSaveState === "saved" && (
                    <span className="chip">Saved for everyone</span>
                  )}
                  {sharedSaveState === "error" && (
                    <span className="chip chip--warn">Save failed</span>
                  )}
                  {onReloadShared && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => void onReloadShared()}
                    >
                      Refresh cards
                    </button>
                  )}
                </>
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
          </div>
          <div className="app-header__logo-wrap">
            <img
              className="app-header__logo"
              src="/logo.jpeg"
              alt=""
              decoding="async"
            />
          </div>
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
          aria-label="Data sources"
          aria-hidden={!sidebarOpen}
          >
          <div className="app-sidebar__chrome">
            <h2 className="app-sidebar__title">Data panel</h2>
            <button
              type="button"
              className="app-sidebar__close"
              aria-label="Close data panel"
              onClick={() => setSidebarOpen(false)}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          <div className="app-sidebar__scroll">
      <section className="panel panel--sidebar">
        <h2>Background</h2>
        <label>
          Card background image
          <input type="file" accept="image/*" onChange={(e) => onBgFile(e.target.files?.[0] ?? null)} />
        </label>
        {bgSaveWarning && <p className="warn">{bgSaveWarning}</p>}
        <p className="hint">
          Saved in this browser. Cards use the default color when no image is set.
        </p>
      </section>

      <section className="panel panel--sidebar">
        <h2>Bible sources</h2>
        {bundledStatus === "loading" && (
          <p className="muted">Loading bundled databases…</p>
        )}
        {(bundledStatus === "loaded" || bundledStatus === "partial") && (
          <ul className="data-source-status">
            <li>
              English:{" "}
              {englishUsesYouVersion ? (
                <span>{englishLabel} (YouVersion)</span>
              ) : sqliteEnActive ? (
                <span>{englishLabel} ready</span>
              ) : enBundledLoading ? (
                <span className="muted">Loading…</span>
              ) : (
                <span className="muted">Not loaded</span>
              )}
            </li>
            <li>
              Hindi:{" "}
              {hindiSourceUsesYouVersion(hindiSourceId) ? (
                <span>{hindiLabel} (YouVersion)</span>
              ) : hindiSourceUsesBibleCom(hindiSourceId) ? (
                <span>{hindiLabel} (Bible.com)</span>
              ) : sqliteHiActive ? (
                <span>{hindiLabel} ready</span>
              ) : hiBundledLoading ? (
                <span className="muted">Loading…</span>
              ) : (
                <span className="muted">Not loaded</span>
              )}
            </li>
          </ul>
        )}
        {bundledStatus === "missing" && (
          <p className="hint">
            Choose a translation below or upload your own <code>.sqlite</code> file.
          </p>
        )}
        <div className="grid2 data-source-grid">
          <div className="bible-source-column">
            <label>
              English
              <select
                value={englishVersionId}
                onChange={(e) =>
                  setEnglishVersionId(
                    normalizeEnglishSqliteVersionId(e.target.value),
                  )
                }
              >
                {ENGLISH_SQLITE_VERSIONS_IN_UI.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                    {v.youVersionBibleId != null ? " (YouVersion)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Upload English SQLite
              <input
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,*/*"
                disabled={englishUsesYouVersion}
                onChange={(e) =>
                  void loadSqlite(e.target.files?.[0] ?? null, "en")
                }
              />
            </label>
          </div>
          <div className="bible-source-column">
            <label>
              Hindi
              <select
                value={hindiSourceId}
                onChange={(e) =>
                  setHindiSourceId(normalizeHindiSourceId(e.target.value))
                }
              >
                {HINDI_SOURCES.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Upload Hindi SQLite
              <input
                type="file"
                accept=".sqlite,.db,application/x-sqlite3,*/*"
                disabled={!hindiSourceUsesSqlite(hindiSourceId)}
                onChange={(e) =>
                  void loadSqlite(e.target.files?.[0] ?? null, "hi")
                }
              />
            </label>
          </div>
        </div>
        {sqliteFileErr && <p className="error">{sqliteFileErr}</p>}
        {sqliteLoadNote && <p className="muted">{sqliteLoadNote}</p>}
      </section>
          </div>
          <div className="app-sidebar__foot">
            <button
              type="button"
              className="btn btn--ghost app-sidebar__done"
              onClick={() => setSidebarOpen(false)}
            >
              Done
            </button>
          </div>
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
                    <span className="verse-draft__label">{hindiLabel}</span>
                    <p className="verse-draft__text">{item.textHi}</p>
                  </div>
                  <div className="verse-draft__col">
                    <span className="verse-draft__label">{englishLabel}</span>
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
        onUpdateText={updateSelectedText}
        labelEn={englishLabel}
        labelHi={hindiLabel}
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
    </>
  );
}

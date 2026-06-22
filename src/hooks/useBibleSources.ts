import { useEffect, useMemo, useRef, useState } from "react";
import type { BibleProvider } from "../bible/provider";
import { SqliteBibleProvider } from "../bible/sqlite/SqliteBibleProvider";
import {
  defaultSqliteSchema,
  type SqliteSchemaConfig,
} from "../bible/sqlite/schemaConfig";
import { EmptyBibleProvider } from "../bible/EmptyBibleProvider";
import { BibleComProvider } from "../bible/bibleCom/BibleComProvider";
import { BIBLE_COM_HI } from "../bible/bibleCom/config";
import { YouVersionProvider } from "../bible/youversion/YouVersionProvider";
import { YOUVERSION_HHBD, YOUVERSION_TPT } from "../bible/youversion/config";
import {
  BUNDLED_HI_SQLITE_URL,
  fetchSqliteArrayBuffer,
} from "../config/bundledBibles";
import {
  bundledEnglishSqliteUrl,
  englishSqliteVersion,
  englishVersionUsesYouVersion,
  normalizeEnglishSqliteVersionId,
  type EnglishSqliteVersionId,
} from "../config/englishSqliteVersions";
import {
  hindiSourceLabel,
  hindiSourceUsesBibleCom,
  hindiSourceUsesSqlite,
  hindiSourceUsesYouVersion,
  normalizeHindiSourceId,
  type HindiSourceId,
} from "../config/hindiSources";
import type { PersistedState } from "../lib/storage";

const SQLITE_HI_LABEL = "HINOVBSI";

type PersistedSlice = Partial<
  Pick<
    PersistedState,
    "hindiSourceId" | "englishSqliteVersionId" | "schemaEn" | "schemaHi"
  >
>;

export function useBibleSources(persisted: PersistedSlice) {
  const [hindiSourceId, setHindiSourceId] = useState<HindiSourceId>(() =>
    normalizeHindiSourceId(persisted.hindiSourceId),
  );
  const [englishVersionId, setEnglishVersionId] = useState<EnglishSqliteVersionId>(
    () => normalizeEnglishSqliteVersionId(persisted.englishSqliteVersionId),
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
    () =>
      new EmptyBibleProvider(
        hindiSourceLabel(normalizeHindiSourceId(persisted.hindiSourceId)),
      ),
  );

  const [enBundledLoading, setEnBundledLoading] = useState(false);
  const [hiBundledLoading, setHiBundledLoading] = useState(false);
  const [sqliteFileErr, setSqliteFileErr] = useState<string | null>(null);
  const [sqliteLoadNote, setSqliteLoadNote] = useState<string | null>(null);
  const [sqliteUploadLang, setSqliteUploadLang] = useState<"en" | "hi" | null>(
    null,
  );

  const sqliteEnProviderRef = useRef<SqliteBibleProvider | null>(null);
  const sqliteHiProviderRef = useRef<SqliteBibleProvider | null>(null);
  const bundledEnLoadGenRef = useRef(0);
  const bundledHiLoadGenRef = useRef(0);

  const bundledStatus = useMemo(() => {
    if (enBundledLoading || hiBundledLoading) return "loading" as const;
    if (sqliteEnActive && sqliteHiActive) return "loaded" as const;
    if (sqliteEnActive || sqliteHiActive) return "partial" as const;
    return "missing" as const;
  }, [enBundledLoading, hiBundledLoading, sqliteEnActive, sqliteHiActive]);

  useEffect(() => {
    if (englishUsesYouVersion) {
      setProviderEn((prev) => {
        if (prev instanceof YouVersionProvider && prev.versionLabel === englishLabel) {
          return prev;
        }
        return new YouVersionProvider(YOUVERSION_TPT);
      });
    } else if (sqliteEnActive && sqliteEnProviderRef.current?.isReady()) {
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
    } else if (sqliteHiActive && sqliteHiProviderRef.current?.isReady()) {
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

  useEffect(() => {
    const ac = new AbortController();
    const loadGen = ++bundledHiLoadGenRef.current;
    const isCurrentLoad = () => bundledHiLoadGenRef.current === loadGen;
    const schemaHiBoot = defaultSqliteSchema();
    setHiBundledLoading(true);
    void (async () => {
      const bufHi = await fetchSqliteArrayBuffer(BUNDLED_HI_SQLITE_URL, ac.signal);
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
            setSqliteFileErr(e instanceof Error ? e.message : String(e));
          }
        }
      } else if (
        isCurrentLoad() &&
        !ac.signal.aborted &&
        hindiSourceUsesSqlite(hindiSourceId)
      ) {
        setSqliteFileErr(
          `Could not load Hindi from ${BUNDLED_HI_SQLITE_URL}. Add public/bibles/bsiov.sqlite or use the file picker.`,
        );
      }

      if (isCurrentLoad()) setHiBundledLoading(false);
    })();
    return () => {
      ac.abort();
      if (bundledHiLoadGenRef.current === loadGen) setHiBundledLoading(false);
    };
  }, [hindiSourceId, hindiLabel]);

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
            setSqliteFileErr(e instanceof Error ? e.message : String(e));
          }
        }
      } else if (isCurrentLoad() && !ac.signal.aborted && !englishUsesYouVersion) {
        sqliteEnProviderRef.current?.close();
        sqliteEnProviderRef.current = null;
        setSqliteEnActive(false);
        setProviderEn(
          new EmptyBibleProvider(englishSqliteVersion(englishVersionId).label),
        );
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

  const loadSqlite = async (file: File | null, lang: "en" | "hi"): Promise<void> => {
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

  return {
    providerEn,
    providerHi,
    hindiSourceId,
    setHindiSourceId,
    englishVersionId,
    setEnglishVersionId,
    englishLabel,
    hindiLabel,
    englishUsesYouVersion,
    schemaEn,
    schemaHi,
    bundledStatus,
    enBundledLoading,
    hiBundledLoading,
    sqliteEnActive,
    sqliteHiActive,
    sqliteFileErr,
    sqliteLoadNote,
    sqliteUploadLang,
    setSqliteUploadLang,
    loadSqlite,
  };
}

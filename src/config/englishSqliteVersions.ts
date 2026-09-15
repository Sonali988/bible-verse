import type { YouVersionBibleConfig } from "../bible/youversion/config";

export type EnglishSqliteVersionId =
  | "nkjv"
  | "kjv"
  | "niv"
  | "nlt"
  | "ampc"
  | "msg"
  | "tpt"
  | "asv"
  | "cpdv"
  | "nasb1995"
  | "nirv"
  | "niv11"
  | "nivuk"
  | "tojb2011"
  | "webus"
  | "wmbbe"
  | "wmb"
  | "amp"
  | "fbv"
  | "easy"
  | "gnv"
  | "pev"
  | "lsv"
  | "nasb2020"
  | "bsb"
  | "tcent";

export type EnglishSqliteVersion = {
  id: EnglishSqliteVersionId;
  /** Shown on verse cards (reference line). */
  label: string;
  /** File name under `public/bibles/` for bundled auto-load. */
  bundledFile?: string;
  /** When set, text is loaded from YouVersion Platform instead of SQLite. */
  youVersionBibleId?: number;
};

export const ENGLISH_SQLITE_VERSIONS: readonly EnglishSqliteVersion[] = [
  { id: "nkjv", label: "NKJV", bundledFile: "nkjv.sqlite" },
  { id: "kjv", label: "KJV", bundledFile: "kjv.sqlite" },
  { id: "niv", label: "NIV", bundledFile: "niv.sqlite" },
  { id: "nlt", label: "NLT", bundledFile: "nlt.sqlite" },
  { id: "msg", label: "MSG", bundledFile: "msg.sqlite" },
  { id: "ampc", label: "AMPC", bundledFile: "ampc.sqlite" },
  { id: "amp", label: "AMP", youVersionBibleId: 1588 },
  { id: "tpt", label: "TPT", bundledFile: "tpt.sqlite", youVersionBibleId: 1849 },
  { id: "asv", label: "ASV", youVersionBibleId: 12 },
  { id: "cpdv", label: "CPDV", youVersionBibleId: 42 },
  { id: "nasb1995", label: "NASB1995", youVersionBibleId: 100 },
  { id: "nirv", label: "NIrV", youVersionBibleId: 110 },
  { id: "niv11", label: "NIV11", youVersionBibleId: 111 },
  { id: "nivuk", label: "NIVUK", youVersionBibleId: 113 },
  { id: "tojb2011", label: "TOJB2011", youVersionBibleId: 130 },
  { id: "webus", label: "WEBUS", youVersionBibleId: 206 },
  { id: "wmbbe", label: "WMBBE", youVersionBibleId: 1207 },
  { id: "wmb", label: "WMB", youVersionBibleId: 1209 },
  { id: "fbv", label: "FBV", youVersionBibleId: 1932 },
  { id: "easy", label: "EASY", youVersionBibleId: 2079 },
  { id: "gnv", label: "GNV", youVersionBibleId: 2163 },
  { id: "pev", label: "PEV", youVersionBibleId: 2530 },
  { id: "lsv", label: "LSV", youVersionBibleId: 2660 },
  { id: "nasb2020", label: "NASB2020", youVersionBibleId: 2692 },
  { id: "bsb", label: "BSB", youVersionBibleId: 3034 },
  { id: "tcent", label: "TCENT", youVersionBibleId: 3427 },
] as const;

export const DEFAULT_ENGLISH_SQLITE_VERSION_ID: EnglishSqliteVersionId = "nkjv";

const BY_ID = new Map(
  ENGLISH_SQLITE_VERSIONS.map((v) => [v.id, v] as const),
);

export function isEnglishSqliteVersionId(
  raw: unknown,
): raw is EnglishSqliteVersionId {
  return typeof raw === "string" && BY_ID.has(raw as EnglishSqliteVersionId);
}

export function normalizeEnglishSqliteVersionId(
  raw: unknown,
): EnglishSqliteVersionId {
  if (!isEnglishSqliteVersionId(raw)) {
    return DEFAULT_ENGLISH_SQLITE_VERSION_ID;
  }
  return raw;
}

export function englishSqliteVersion(
  id: EnglishSqliteVersionId,
): EnglishSqliteVersion {
  return BY_ID.get(id)!;
}

function defaultBundledSqlitePath(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const pathBase = base.startsWith("/") ? base : `/${base}`;
  const withSlash = pathBase.endsWith("/") ? pathBase : `${pathBase}/`;
  return `${withSlash}bibles/${file}`.replace(/([^:]\/)\/+/g, "$1");
}

function envOverride(id: EnglishSqliteVersionId): string | undefined {
  const env = import.meta.env;
  switch (id) {
    case "nkjv":
      return env.VITE_BUNDLED_EN_NKJV_SQLITE_URL ?? env.VITE_BUNDLED_EN_SQLITE_URL;
    case "kjv":
      return env.VITE_BUNDLED_EN_KJV_SQLITE_URL;
    case "niv":
      return env.VITE_BUNDLED_EN_NIV_SQLITE_URL;
    case "nlt":
      return env.VITE_BUNDLED_EN_NLT_SQLITE_URL;
    case "ampc":
      return env.VITE_BUNDLED_EN_AMPC_SQLITE_URL;
    case "msg":
      return env.VITE_BUNDLED_EN_MSG_SQLITE_URL;
    case "tpt":
      return env.VITE_BUNDLED_EN_TPT_SQLITE_URL;
    default:
      return undefined;
  }
}

export function bundledEnglishSqliteUrl(id: EnglishSqliteVersionId): string {
  const fromEnv = envOverride(id);
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  const file = englishSqliteVersion(id).bundledFile;
  if (!file) return defaultBundledSqlitePath("missing.sqlite");
  return defaultBundledSqlitePath(file);
}

export function englishVersionUsesYouVersion(id: EnglishSqliteVersionId): boolean {
  return englishSqliteVersion(id).youVersionBibleId != null;
}

export function youVersionConfigForEnglish(
  id: EnglishSqliteVersionId,
): YouVersionBibleConfig | undefined {
  const v = englishSqliteVersion(id);
  if (v.youVersionBibleId == null) return undefined;
  return {
    bibleId: v.youVersionBibleId,
    abbreviation: v.label,
    label: v.label,
  };
}

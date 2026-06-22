export type EnglishSqliteVersionId =
  | "nkjv"
  | "kjv"
  | "niv"
  | "nlt"
  | "ampc"
  | "tpt";

export type EnglishSqliteVersion = {
  id: EnglishSqliteVersionId;
  /** Shown on verse cards (reference line). */
  label: string;
  /** File name under `public/bibles/` for bundled auto-load. */
  bundledFile: string;
  /** When set, text is loaded from YouVersion Platform instead of SQLite. */
  youVersionBibleId?: number;
};

export const ENGLISH_SQLITE_VERSIONS: readonly EnglishSqliteVersion[] = [
  { id: "nkjv", label: "NKJV", bundledFile: "nkjv.sqlite" },
  { id: "kjv", label: "KJV", bundledFile: "kjv.sqlite" },
  { id: "niv", label: "NIV", bundledFile: "niv.sqlite" },
  { id: "nlt", label: "NLT", bundledFile: "nlt.sqlite" },
  { id: "ampc", label: "AMPC", bundledFile: "ampc.sqlite" },
  { id: "tpt", label: "TPT", bundledFile: "tpt.sqlite", youVersionBibleId: 1849 },
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
    case "tpt":
      return env.VITE_BUNDLED_EN_TPT_SQLITE_URL;
    default:
      return undefined;
  }
}

export function bundledEnglishSqliteUrl(id: EnglishSqliteVersionId): string {
  const fromEnv = envOverride(id);
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return defaultBundledSqlitePath(englishSqliteVersion(id).bundledFile);
}

export function englishVersionUsesYouVersion(id: EnglishSqliteVersionId): boolean {
  return englishSqliteVersion(id).youVersionBibleId != null;
}

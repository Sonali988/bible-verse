/**
 * Default paths point at `public/bibles/` (served under Vite `import.meta.env.BASE_URL`).
 * Override with `.env`: VITE_BUNDLED_EN_SQLITE_URL, VITE_BUNDLED_HI_SQLITE_URL
 */
function defaultBundledSqlitePath(file: "nkjv.sqlite" | "bsiov.sqlite"): string {
  const base = import.meta.env.BASE_URL || "/";
  const pathBase = base.startsWith("/") ? base : `/${base}`;
  const withSlash = pathBase.endsWith("/") ? pathBase : `${pathBase}/`;
  return `${withSlash}bibles/${file}`.replace(/([^:]\/)\/+/g, "$1");
}

export const BUNDLED_SQLITE_URLS = {
  en:
    import.meta.env.VITE_BUNDLED_EN_SQLITE_URL ??
    defaultBundledSqlitePath("nkjv.sqlite"),
  hi:
    import.meta.env.VITE_BUNDLED_HI_SQLITE_URL ??
    defaultBundledSqlitePath("bsiov.sqlite"),
} as const;

export async function fetchSqliteArrayBuffer(
  url: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { signal, cache: "force-cache" });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

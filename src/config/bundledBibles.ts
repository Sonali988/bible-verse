/**
 * Default URLs point at files in `public/bibles/` (served from site root in dev and build).
 * Override with `.env`: VITE_BUNDLED_EN_SQLITE_URL, VITE_BUNDLED_HI_SQLITE_URL
 */
export const BUNDLED_SQLITE_URLS = {
  en: import.meta.env.VITE_BUNDLED_EN_SQLITE_URL ?? "/bibles/nkjv.sqlite",
  hi: import.meta.env.VITE_BUNDLED_HI_SQLITE_URL ?? "/bibles/bsiov.sqlite",
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

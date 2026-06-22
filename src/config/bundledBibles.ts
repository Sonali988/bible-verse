function defaultBundledHiPath(): string {
  const base = import.meta.env.BASE_URL || "/";
  const pathBase = base.startsWith("/") ? base : `/${base}`;
  const withSlash = pathBase.endsWith("/") ? pathBase : `${pathBase}/`;
  return `${withSlash}bibles/bsiov.sqlite`.replace(/([^:]\/)\/+/g, "$1");
}

export const BUNDLED_HI_SQLITE_URL =
  import.meta.env.VITE_BUNDLED_HI_SQLITE_URL ?? defaultBundledHiPath();

export async function fetchSqliteArrayBuffer(
  url: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { signal, cache: "no-cache" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (!isSqliteFile(buf)) return null;
    return buf;
  } catch {
    return null;
  }
}

function isSqliteFile(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 16) return false;
  const header = new TextDecoder().decode(new Uint8Array(buf, 0, 15));
  return header === "SQLite format 3";
}

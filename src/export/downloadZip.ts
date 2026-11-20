export type DownloadFile = { name: string; blob: Blob };

export async function zipBlobs(entries: DownloadFile[]): Promise<Blob> {
  const { zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    entries.map(async (e) => {
      files[e.name] = new Uint8Array(await e.blob.arrayBuffer());
    }),
  );
  const out = zipSync(files, { level: 9 });
  return new Blob([out], { type: "application/zip" });
}

/** Click an in-document anchor. A detached link, or one clicked from a timer, is ignored on Safari. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

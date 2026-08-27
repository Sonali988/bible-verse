import { saveAs } from "file-saver";

export async function zipBlobs(
  entries: { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  const { zipSync } = await import("fflate");
  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    entries.map(async (e) => {
      files[e.name] = new Uint8Array(await e.blob.arrayBuffer());
    }),
  );
  const out = zipSync(files, { level: 9 });
  saveAs(new Blob([out], { type: "application/zip" }), zipName);
}

export function savePng(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

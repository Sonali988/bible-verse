import JSZip from "jszip";
import { saveAs } from "file-saver";

export async function zipBlobs(
  entries: { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.name, e.blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  saveAs(out, zipName);
}

export function savePng(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

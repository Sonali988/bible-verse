import { unzlibSync, zlibSync } from "fflate";

/** PNG chunk CRC (ISO 3309 / ITU-T V.42). */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function chunkBytes(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeU32(out, 0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  writeU32(out, 8 + data.length, crc);
  return out;
}

/** Re-deflate PNG IDAT at max zlib level; drop ancillary chunks. Lossless. */
export function recompressPngBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 8) return bytes;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return bytes;
  }

  const kept: Uint8Array[] = [];
  const idatParts: Uint8Array[] = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    const data = bytes.subarray(dataStart, dataEnd);
    if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IHDR" || type === "PLTE" || type === "tRNS") {
      kept.push(chunkBytes(type, data.slice()));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  if (idatParts.length === 0) return bytes;

  let raw: Uint8Array;
  try {
    raw = unzlibSync(concat(idatParts));
  } catch {
    return bytes;
  }

  const compressed = zlibSync(raw, { level: 9, mem: 12 });
  const rebuilt = concat([PNG_SIGNATURE, ...kept, chunkBytes("IDAT", compressed), chunkBytes("IEND", new Uint8Array(0))]);
  return rebuilt.length < bytes.length ? rebuilt : bytes;
}

/** Flatten to opaque RGB then recompress PNG. Same pixels, typically much smaller files. */
export async function compactPngBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    bitmap.close();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const flattened = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!flattened) return blob;

  const bytes = new Uint8Array(await flattened.arrayBuffer());
  const compact = recompressPngBytes(bytes);
  const out = new Blob([compact], { type: "image/png" });
  return out.size < blob.size ? out : blob;
}

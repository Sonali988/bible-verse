import { inflateSync, unzlibSync } from "fflate";

export type SfntFont = {
  bytes: Uint8Array;
  format: "truetype" | "opentype";
};

/**
 * Unpack a WOFF (version 1) file into an sfnt (TrueType or CFF OpenType) font.
 * WebKit can draw those inside an SVG image; it skips WOFF2 there.
 */
export function woffToSfnt(input: Uint8Array): SfntFont {
  const woff =
    input.byteOffset === 0 && input.byteLength === input.buffer.byteLength
      ? input
      : input.slice();
  if (woff.length < 44) throw new Error("WOFF font is too small");

  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (view.getUint32(0) !== 0x774f4646) throw new Error("Not a WOFF font");

  const flavor = view.getUint32(4);
  const numTables = view.getUint16(12);
  const totalSfntSize = view.getUint32(16);
  if (numTables === 0 || 44 + numTables * 20 > woff.length) {
    throw new Error("Invalid WOFF table directory");
  }

  const tables: { tag: Uint8Array; checksum: number; orig: Uint8Array }[] = [];
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const tag = woff.slice(entry, entry + 4);
    const offset = view.getUint32(entry + 4);
    const compLength = view.getUint32(entry + 8);
    const origLength = view.getUint32(entry + 12);
    const checksum = view.getUint32(entry + 16);
    if (offset + compLength > woff.length) {
      throw new Error("WOFF table is out of range");
    }
    const compressed = woff.slice(offset, offset + compLength);
    const raw =
      compLength === origLength ? compressed : inflateWoffTable(compressed);
    if (raw.length < origLength) {
      throw new Error("WOFF table expanded short");
    }
    tables.push({ tag, checksum, orig: raw.subarray(0, origLength) });
  }

  const placements: number[] = [];
  let dataOffset = 12 + numTables * 16;
  for (const table of tables) {
    dataOffset = (dataOffset + 3) & ~3;
    placements.push(dataOffset);
    dataOffset += table.orig.length;
  }

  const size = Math.max(totalSfntSize, dataOffset);
  const out = new Uint8Array(size);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, flavor);
  outView.setUint16(4, numTables);

  let power = 1;
  let entrySelector = 0;
  while (power << 1 <= numTables) {
    power <<= 1;
    entrySelector += 1;
  }
  const searchRange = power * 16;
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, numTables * 16 - searchRange);

  tables.forEach((table, i) => {
    const rec = 12 + i * 16;
    const at = placements[i]!;
    out.set(table.tag, rec);
    outView.setUint32(rec + 4, table.checksum);
    outView.setUint32(rec + 8, at);
    outView.setUint32(rec + 12, table.orig.length);
    out.set(table.orig, at);
  });

  return {
    bytes: out.subarray(0, size),
    format: flavor === 0x4f54544f ? "opentype" : "truetype",
  };
}

function inflateWoffTable(compressed: Uint8Array): Uint8Array {
  try {
    return unzlibSync(compressed);
  } catch {
    return inflateSync(compressed);
  }
}

export type HindiSourceId = "sqlite" | "hhbd" | "hsb" | "biblecom";

export type HindiSource = {
  id: HindiSourceId;
  label: string;
  detail: string;
};

export const HINDI_SOURCES: readonly HindiSource[] = [
  { id: "sqlite", label: "HINOVBSI", detail: "SQLite bundled" },
  { id: "hhbd", label: "HHBD", detail: "YouVersion API" },
  { id: "hsb", label: "HSB", detail: "YouVersion API" },
  // { id: "biblecom", label: "HINOVBSI", detail: "Bible.com API" },
] as const;

export const DEFAULT_HINDI_SOURCE_ID: HindiSourceId = "sqlite";

const BY_ID = new Map(HINDI_SOURCES.map((s) => [s.id, s] as const));

export function isHindiSourceId(raw: unknown): raw is HindiSourceId {
  return typeof raw === "string" && BY_ID.has(raw as HindiSourceId);
}

export function normalizeHindiSourceId(raw: unknown): HindiSourceId {
  if (!isHindiSourceId(raw)) return DEFAULT_HINDI_SOURCE_ID;
  return raw;
}

export function hindiSource(id: HindiSourceId): HindiSource {
  return BY_ID.get(id)!;
}

export function hindiSourceLabel(id: HindiSourceId): string {
  return hindiSource(id).label;
}

export function hindiSourceUsesYouVersion(id: HindiSourceId): boolean {
  return id === "hhbd" || id === "hsb";
}

export function hindiSourceUsesBibleCom(id: HindiSourceId): boolean {
  return id === "biblecom";
}

export function hindiSourceUsesSqlite(id: HindiSourceId): boolean {
  return id === "sqlite";
}

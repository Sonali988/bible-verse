import {
  YOUVERSION_HCV,
  YOUVERSION_HHBD,
  YOUVERSION_HLT,
  YOUVERSION_HSB,
  YOUVERSION_IRVHIN,
  type YouVersionBibleConfig,
} from "../bible/youversion/config";

export type HindiSourceId =
  | "sqlite"
  | "hhbd"
  | "hsb"
  | "hcv"
  | "irvhin"
  | "hlt"
  | "biblecom";

export type HindiSource = {
  id: HindiSourceId;
  label: string;
  detail: string;
};

export const HINDI_SOURCES: readonly HindiSource[] = [
  { id: "sqlite", label: "HINOVBSI", detail: "SQLite bundled" },
  { id: "hhbd", label: "HHBD", detail: "YouVersion API" },
  { id: "hsb", label: "HSB", detail: "YouVersion API" },
  { id: "hcv", label: "HCV", detail: "YouVersion API" },
  { id: "irvhin", label: "IRVHin", detail: "YouVersion API" },
  { id: "hlt", label: "HLT", detail: "YouVersion API" },
  // { id: "biblecom", label: "HINOVBSI", detail: "Bible.com API" },
] as const;

const YOUVERSION_BY_HINDI_ID: Partial<
  Record<HindiSourceId, YouVersionBibleConfig>
> = {
  hhbd: YOUVERSION_HHBD,
  hsb: YOUVERSION_HSB,
  hcv: YOUVERSION_HCV,
  irvhin: YOUVERSION_IRVHIN,
  hlt: YOUVERSION_HLT,
};

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
  return youVersionConfigForHindiSource(id) != null;
}

export function youVersionConfigForHindiSource(
  id: HindiSourceId,
): YouVersionBibleConfig | undefined {
  return YOUVERSION_BY_HINDI_ID[id];
}

export function hindiSourceUsesBibleCom(id: HindiSourceId): boolean {
  return id === "biblecom";
}

export function hindiSourceUsesSqlite(id: HindiSourceId): boolean {
  return id === "sqlite";
}

import {
  cloneLayout,
  type LayoutSpec,
  type TypographySpec,
  type VersePage,
} from "../bible/types";
import type { SqliteSchemaConfig } from "../bible/sqlite/schemaConfig";

const K_PAGES = "bvc:pages";
const K_CARD_LAYOUT = "bvc:cardLayout";
const K_TYPO = "bvc:typography";
const K_SCHEMA_EN = "bvc:schemaEn";
const K_SCHEMA_HI = "bvc:schemaHi";

function isValidLayout(value: unknown): value is LayoutSpec {
  if (!value || typeof value !== "object") return false;
  const l = value as LayoutSpec;
  if (typeof l.width !== "number" || l.width < 100) return false;
  if (typeof l.height !== "number" || l.height < 100) return false;
  const rects = [l.titleEn, l.bodyEn, l.titleHi, l.bodyHi];
  for (const r of rects) {
    if (!r || typeof r.x !== "number" || typeof r.width !== "number") return false;
  }
  return true;
}

export type PersistedState = {
  pages: VersePage[];
  cardLayout: LayoutSpec;
  typography: TypographySpec;
  schemaEn: SqliteSchemaConfig;
  schemaHi: SqliteSchemaConfig;
};

export function loadPersisted(): Partial<PersistedState> {
  try {
    localStorage.removeItem("bvc:layout");
    const pages = JSON.parse(
      localStorage.getItem(K_PAGES) ?? "null",
    ) as VersePage[] | null;
    const cardLayoutRaw = JSON.parse(
      localStorage.getItem(K_CARD_LAYOUT) ?? "null",
    );
    const cardLayout = isValidLayout(cardLayoutRaw)
      ? cloneLayout(cardLayoutRaw)
      : undefined;
    const typography = JSON.parse(
      localStorage.getItem(K_TYPO) ?? "null",
    ) as TypographySpec | null;
    const schemaEn = JSON.parse(
      localStorage.getItem(K_SCHEMA_EN) ?? "null",
    ) as SqliteSchemaConfig | null;
    const schemaHi = JSON.parse(
      localStorage.getItem(K_SCHEMA_HI) ?? "null",
    ) as SqliteSchemaConfig | null;
    return {
      pages: pages ?? undefined,
      cardLayout,
      typography: typography ?? undefined,
      schemaEn: schemaEn ?? undefined,
      schemaHi: schemaHi ?? undefined,
    };
  } catch {
    return {};
  }
}

export function savePersisted(state: PersistedState): void {
  localStorage.setItem(K_PAGES, JSON.stringify(state.pages));
  localStorage.setItem(K_CARD_LAYOUT, JSON.stringify(state.cardLayout));
  localStorage.setItem(K_TYPO, JSON.stringify(state.typography));
  localStorage.setItem(K_SCHEMA_EN, JSON.stringify(state.schemaEn));
  localStorage.setItem(K_SCHEMA_HI, JSON.stringify(state.schemaHi));
}

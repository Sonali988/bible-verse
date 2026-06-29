export const BACKGROUND_SLOT_COUNT = 4;

export type BackgroundSlots = {
  images: (string | null)[];
  selectedIndex: number;
};

export function defaultBackgroundSlots(): BackgroundSlots {
  return {
    images: Array.from({ length: BACKGROUND_SLOT_COUNT }, () => null),
    selectedIndex: 0,
  };
}

export function normalizeBackgroundSlots(
  raw: unknown,
  legacyBg: string | null = null,
): BackgroundSlots {
  const base = defaultBackgroundSlots();
  if (raw && typeof raw === "object") {
    const r = raw as { images?: unknown; selectedIndex?: unknown };
    if (Array.isArray(r.images)) {
      for (let i = 0; i < BACKGROUND_SLOT_COUNT; i++) {
        const v = r.images[i];
        base.images[i] =
          typeof v === "string" && v.trim().length > 0 ? v : null;
      }
    }
    if (typeof r.selectedIndex === "number" && Number.isFinite(r.selectedIndex)) {
      base.selectedIndex = Math.min(
        BACKGROUND_SLOT_COUNT - 1,
        Math.max(0, Math.floor(r.selectedIndex)),
      );
    }
  }
  if (legacyBg?.trim() && !base.images.some((img) => img)) {
    base.images[0] = legacyBg;
    base.selectedIndex = 0;
  }
  if (!base.images[base.selectedIndex]) {
    const first = base.images.findIndex((img) => img);
    if (first >= 0) base.selectedIndex = first;
  }
  return base;
}

export function selectedBackgroundUrl(slots: BackgroundSlots): string | null {
  const url = slots.images[slots.selectedIndex];
  return url && url.trim().length > 0 ? url : null;
}

import type { BackgroundSlots } from "./backgroundSlots";
import { BACKGROUND_SLOT_COUNT } from "./backgroundSlots";
import type { PersistedState } from "./storage";

export type SharedStatePayload = PersistedState & {
  updatedAt: number;
};

const API = "/api/state";
const BG_API = "/api/background";

export function remoteStorageEnabled(): boolean {
  const flag = import.meta.env.VITE_REMOTE_STORAGE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

function writeHeaders(): HeadersInit {
  const secret = import.meta.env.VITE_BVC_WRITE_SECRET;
  return secret ? { "X-Bvc-Secret": secret } : {};
}

/** Shared state must not include base64 images (causes HTTP 413 on Vercel). */
function stateWithoutBackgroundImages(state: PersistedState): PersistedState {
  return {
    ...state,
    backgrounds: {
      selectedIndex: state.backgrounds.selectedIndex,
      images: Array.from({ length: BACKGROUND_SLOT_COUNT }, () => null),
    },
  };
}

export async function fetchSharedBackgrounds(): Promise<(string | null)[]> {
  const images = Array.from(
    { length: BACKGROUND_SLOT_COUNT },
    () => null as string | null,
  );
  await Promise.all(
    images.map(async (_, slot) => {
      const res = await fetch(`${BG_API}?slot=${slot}`, { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { dataUrl?: unknown };
      if (typeof body.dataUrl === "string" && body.dataUrl.trim()) {
        images[slot] = body.dataUrl;
      }
    }),
  );
  return images;
}

export async function saveSharedBackgroundSlots(
  slots: BackgroundSlots,
): Promise<void> {
  await Promise.all(
    slots.images.map(async (dataUrl, slot) => {
      if (dataUrl?.trim()) {
        const res = await fetch(`${BG_API}?slot=${slot}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...writeHeaders(),
          },
          body: JSON.stringify({ dataUrl }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            err?.error ?? `Failed to save background ${slot + 1} (${res.status})`,
          );
        }
        return;
      }
      const res = await fetch(`${BG_API}?slot=${slot}`, {
        method: "DELETE",
        headers: { ...writeHeaders() },
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to clear background ${slot + 1} (${res.status})`);
      }
    }),
  );
}

export async function fetchSharedState(): Promise<SharedStatePayload | null> {
  const res = await fetch(API, { cache: "no-store" });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      err?.error ?? `Failed to load shared state (${res.status})`,
    );
  }
  const data = (await res.json()) as SharedStatePayload | null;
  return data;
}

export async function saveSharedState(
  state: PersistedState,
  updatedAt?: number,
): Promise<number> {
  const payload: SharedStatePayload = {
    ...stateWithoutBackgroundImages(state),
    updatedAt: updatedAt ?? Date.now(),
  };
  const res = await fetch(API, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...writeHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `Failed to save shared state (${res.status})`);
  }
  const body = (await res.json()) as { updatedAt?: number };
  return body.updatedAt ?? payload.updatedAt;
}

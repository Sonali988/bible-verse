import type { PersistedState } from "./storage";

export type SharedStatePayload = PersistedState & {
  updatedAt: number;
};

const API = "/api/state";

export function remoteStorageEnabled(): boolean {
  return import.meta.env.VITE_REMOTE_STORAGE === "true";
}

function writeHeaders(): HeadersInit {
  const secret = import.meta.env.VITE_BVC_WRITE_SECRET;
  return secret ? { "X-Bvc-Secret": secret } : {};
}

export async function fetchSharedState(): Promise<SharedStatePayload | null> {
  const res = await fetch(API, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load shared state (${res.status})`);
  }
  const data = (await res.json()) as SharedStatePayload | null;
  return data;
}

export async function saveSharedState(
  state: PersistedState,
  updatedAt?: number,
): Promise<number> {
  const payload: SharedStatePayload = {
    ...state,
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

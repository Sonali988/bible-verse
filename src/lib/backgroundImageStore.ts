import { BACKGROUND_SLOT_COUNT } from "./backgroundSlots";

const DB_NAME = "bvc-background-images";
const STORE = "slots";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
  });
}

export async function loadBackgroundImagesFromIdb(): Promise<(string | null)[]> {
  const images = Array.from({ length: BACKGROUND_SLOT_COUNT }, () => null as string | null);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      let pending = BACKGROUND_SLOT_COUNT;
      for (let i = 0; i < BACKGROUND_SLOT_COUNT; i++) {
        const req = store.get(i);
        req.onsuccess = () => {
          if (typeof req.result === "string" && req.result.trim()) {
            images[i] = req.result;
          }
          pending -= 1;
          if (pending === 0) resolve();
        };
        req.onerror = () => reject(req.error);
      }
    });
    db.close();
  } catch (e) {
    console.warn("Could not load background images from IndexedDB", e);
  }
  return images;
}

export async function saveBackgroundImagesToIdb(
  images: (string | null)[],
): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(STORE);
      for (let i = 0; i < BACKGROUND_SLOT_COUNT; i++) {
        const url = images[i];
        if (url?.trim()) store.put(url, i);
        else store.delete(i);
      }
    });
    db.close();
    return true;
  } catch (e) {
    console.warn("Could not save background images to IndexedDB", e);
    return false;
  }
}

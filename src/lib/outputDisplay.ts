import { LIVE_OUTPUT_PATH } from "./livePresent";

const K_OUTPUT_SCREEN_LABEL = "bvc:outputScreenLabel";
const OUTPUT_WINDOW_NAME = "bvc-live-output";

export type OutputScreenChoice = {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isCurrent: boolean;
};

let cachedDetails: ScreenDetails | null = null;
let outputWin: Window | null = null;

export function windowManagementSupported(): boolean {
  return typeof window !== "undefined" && typeof window.getScreenDetails === "function";
}

export function loadPreferredOutputLabel(): string | null {
  try {
    const raw = localStorage.getItem(K_OUTPUT_SCREEN_LABEL);
    return raw?.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function savePreferredOutputLabel(label: string): void {
  try {
    localStorage.setItem(K_OUTPUT_SCREEN_LABEL, label);
  } catch {
    /* ignore */
  }
}

function screenId(s: {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}): string {
  return `${s.label}|${s.left},${s.top},${s.width}x${s.height}`;
}

function mapScreens(details: ScreenDetails): OutputScreenChoice[] {
  return details.screens.map((s) => {
    const label = s.label?.trim() || `${s.width}×${s.height}`;
    const isCurrent =
      s === details.currentScreen ||
      (s.left === details.currentScreen.left && s.top === details.currentScreen.top);
    return {
      id: screenId({ label, left: s.left, top: s.top, width: s.width, height: s.height }),
      label,
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
      isPrimary: s.isPrimary,
      isCurrent,
    };
  });
}

export async function refreshScreenDetails(): Promise<OutputScreenChoice[] | null> {
  if (!windowManagementSupported()) return null;
  try {
    cachedDetails = await window.getScreenDetails!();
    return mapScreens(cachedDetails);
  } catch {
    cachedDetails = null;
    return null;
  }
}

export async function listOutputScreens(): Promise<OutputScreenChoice[] | null> {
  return refreshScreenDetails();
}

export function pickDefaultOutputScreen(
  screens: OutputScreenChoice[],
  preferredLabel: string | null,
): OutputScreenChoice | null {
  if (screens.length === 0) return null;
  const extended =
    screens.find((s) => !s.isCurrent) ?? screens.find((s) => !s.isPrimary);
  if (preferredLabel) {
    const match = screens.find((s) => s.label === preferredLabel && !s.isCurrent);
    if (match) return match;
  }
  return extended ?? screens[0];
}

/** Place a popup just past the current monitor — typical laptop | HDMI-to-ATEM layout. */
export function guessExtendedScreen(): OutputScreenChoice {
  const scr = window.screen as Screen & { availLeft?: number; availTop?: number };
  const availLeft = Math.round(scr.availLeft ?? 0);
  const availTop = Math.round(scr.availTop ?? 0);
  return {
    id: "guess-extended-right",
    label: "Extended display",
    left: availLeft + Math.round(scr.availWidth || scr.width),
    top: availTop,
    width: Math.round(scr.width),
    height: Math.round(scr.height),
    isPrimary: false,
    isCurrent: false,
  };
}

export function outputWindowUrl(screen?: OutputScreenChoice | null): string {
  const base = `${window.location.origin}${LIVE_OUTPUT_PATH}`;
  if (!screen) return `${base}?ext=1`;
  const q = new URLSearchParams({
    ext: "1",
    left: String(Math.round(screen.left)),
    top: String(Math.round(screen.top)),
    w: String(Math.round(screen.width)),
    h: String(Math.round(screen.height)),
  });
  return `${base}?${q.toString()}`;
}

function applyWindowBounds(win: Window, screen: OutputScreenChoice): void {
  const left = Math.round(screen.left);
  const top = Math.round(screen.top);
  const width = Math.round(screen.width);
  const height = Math.round(screen.height);
  try {
    win.moveTo(left, top);
    win.resizeTo(width, height);
  } catch {
    /* placement blocked */
  }
}

function tryChildFullscreen(win: Window): void {
  try {
    const el = win.document?.documentElement;
    if (!el || win.document.fullscreenElement) return;
    void el.requestFullscreen({ navigationUI: "hide" });
  } catch {
    /* no gesture or not ready */
  }
}

/**
 * Open (or reuse) the live output window on the ATEM / extended display.
 * Must run directly from a click — do not await anything after getScreenDetails
 * before calling this.
 */
export function placeLiveOutputWindow(screen: OutputScreenChoice): Window | null {
  const left = Math.round(screen.left);
  const top = Math.round(screen.top);
  const width = Math.round(screen.width);
  const height = Math.round(screen.height);
  const url = outputWindowUrl(screen);
  const features = `popup=yes,left=${left},top=${top},width=${width},height=${height}`;

  let win: Window | null = null;
  try {
    win = window.open(url, OUTPUT_WINDOW_NAME, features);
  } catch {
    win = null;
  }
  if (!win) {
    try {
      win = window.open(url, `${OUTPUT_WINDOW_NAME}-${Date.now()}`, features);
    } catch {
      win = null;
    }
  }
  if (!win) return null;

  outputWin = win;
  const apply = () => {
    if (win.closed) return;
    applyWindowBounds(win, screen);
    tryChildFullscreen(win);
  };
  apply();
  for (const ms of [0, 50, 100, 250, 500, 1000, 2000]) {
    window.setTimeout(apply, ms);
  }
  return win;
}

export function closeLiveOutputWindow(): void {
  try {
    if (outputWin && !outputWin.closed) outputWin.close();
  } catch {
    /* ignore */
  }
  outputWin = null;
}

export async function startAtemOutput(
  preferredScreenId?: string | null,
): Promise<{
  ok: boolean;
  screen: OutputScreenChoice | null;
  screens: OutputScreenChoice[];
  error?: string;
}> {
  const listed = await refreshScreenDetails();
  const preferred = loadPreferredOutputLabel();
  let screen: OutputScreenChoice | null = null;

  if (preferredScreenId && listed) {
    screen = listed.find((s) => s.id === preferredScreenId) ?? null;
  }
  if (!screen && listed) {
    screen = pickDefaultOutputScreen(listed, preferred);
  }

  if (screen?.isCurrent) {
    const other = listed?.find((s) => !s.isCurrent) ?? null;
    screen = other ?? screen;
  }

  if (!screen || screen.isCurrent) {
    screen = guessExtendedScreen();
  }

  savePreferredOutputLabel(screen.label);
  const win = placeLiveOutputWindow(screen);
  if (!win) {
    return {
      ok: false,
      screen,
      screens: listed ?? [],
      error:
        "The browser blocked the output window. Allow pop-ups for this site, then click Start output again.",
    };
  }

  const multi = (listed?.length ?? 0) >= 2;
  return {
    ok: true,
    screen,
    screens: listed ?? [screen],
    error: multi
      ? undefined
      : "Opened on the extended display. If ATEM is still black, allow “window management” / “place windows on other screens” in Chrome, then Start output again.",
  };
}

export function parseOutputLockFromUrl(): OutputScreenChoice | null {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("ext") !== "1") return null;
    const left = Number(q.get("left"));
    const top = Number(q.get("top"));
    const width = Number(q.get("w"));
    const height = Number(q.get("h"));
    if (![left, top, width, height].every((n) => Number.isFinite(n)) || width < 2) {
      return null;
    }
    return {
      id: "url-lock",
      label: "ATEM output",
      left,
      top,
      width,
      height,
      isPrimary: false,
      isCurrent: false,
    };
  } catch {
    return null;
  }
}

/** Run inside the output window so it covers the HDMI display ATEM is capturing. */
export async function lockThisWindowToAtemDisplay(): Promise<void> {
  const hinted = parseOutputLockFromUrl();
  if (hinted) {
    applyWindowBounds(window, hinted);
  }

  if (!windowManagementSupported()) {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* needs gesture */
    }
    return;
  }

  try {
    const details = await window.getScreenDetails!();
    cachedDetails = details;
    const hintedMatch = hinted
      ? details.screens.find(
          (s) =>
            Math.abs(s.left - hinted.left) < 80 && Math.abs(s.top - hinted.top) < 80,
        )
      : null;
    const extended =
      hintedMatch ??
      details.screens.find((s) => s !== details.currentScreen) ??
      details.screens.find((s) => !s.isPrimary) ??
      details.currentScreen;

    applyWindowBounds(window, {
      id: "lock",
      label: extended.label || "output",
      left: extended.left,
      top: extended.top,
      width: extended.width,
      height: extended.height,
      isPrimary: extended.isPrimary,
      isCurrent: false,
    });

    try {
      await document.documentElement.requestFullscreen({
        screen: extended,
        navigationUI: "hide",
      });
    } catch {
      try {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
      } catch {
        /* still a sized popup covering the HDMI */
      }
    }
  } catch {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      /* ignore */
    }
  }
}

export function openLiveOutputWindow(screen?: OutputScreenChoice | null): Window | null {
  return placeLiveOutputWindow(screen ?? guessExtendedScreen());
}

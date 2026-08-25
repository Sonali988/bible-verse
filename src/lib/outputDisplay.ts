import { LIVE_OUTPUT_PATH } from "./livePresent";

const K_OUTPUT_SCREEN_LABEL = "bvc:outputScreenLabel";

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

export async function listOutputScreens(): Promise<OutputScreenChoice[] | null> {
  if (!windowManagementSupported()) return null;
  try {
    const details = await window.getScreenDetails!();
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
  } catch {
    return null;
  }
}

export function pickDefaultOutputScreen(
  screens: OutputScreenChoice[],
  preferredLabel: string | null,
): OutputScreenChoice | null {
  if (screens.length === 0) return null;
  if (preferredLabel) {
    const match = screens.find((s) => s.label === preferredLabel);
    if (match) return match;
  }
  return (
    screens.find((s) => !s.isCurrent) ??
    screens.find((s) => !s.isPrimary) ??
    screens[0]
  );
}

export async function findScreenDetailed(
  choice: OutputScreenChoice,
): Promise<ScreenDetailed | null> {
  if (!windowManagementSupported()) return null;
  try {
    const details = await window.getScreenDetails!();
    return (
      details.screens.find((s) => s.label === choice.label) ??
      details.screens.find(
        (s) =>
          s.left === choice.left &&
          s.top === choice.top &&
          s.width === choice.width &&
          s.height === choice.height,
      ) ??
      null
    );
  } catch {
    return null;
  }
}

export function openLiveOutputWindow(screen?: OutputScreenChoice | null): Window | null {
  const url = `${window.location.origin}${LIVE_OUTPUT_PATH}`;
  const features = screen
    ? `popup=yes,left=${Math.round(screen.left)},top=${Math.round(screen.top)},width=${Math.round(screen.width)},height=${Math.round(screen.height)}`
    : "popup=yes";
  const win = window.open(url, "bvc-live-output", features);
  if (win && screen) {
    try {
      win.moveTo(Math.round(screen.left), Math.round(screen.top));
      win.resizeTo(Math.round(screen.width), Math.round(screen.height));
    } catch {
      /* popup placement blocked */
    }
  }
  return win;
}

export type StartOutputResult = "fullscreen" | "window" | "failed";

/** Put the stage element fullscreen on the chosen display, or open a positioned output window. */
export async function startStageOutput(
  stageEl: HTMLElement,
  screen: OutputScreenChoice | null,
): Promise<StartOutputResult> {
  if (screen && !screen.isCurrent) {
    const detailed = await findScreenDetailed(screen);
    if (detailed) {
      try {
        await stageEl.requestFullscreen({
          screen: detailed,
          navigationUI: "hide",
        });
        return "fullscreen";
      } catch {
        /* fall through to window */
      }
    }
  }
  const win = openLiveOutputWindow(screen);
  return win ? "window" : "failed";
}

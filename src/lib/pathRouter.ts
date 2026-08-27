import { useCallback, useEffect, useState } from "react";

/** Normalize pathname (no trailing slash except root). */
export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export function getPathname(): string {
  return normalizePath(window.location.pathname);
}

export function navigate(to: string, opts?: { replace?: boolean }): void {
  const path = normalizePath(to);
  if (path === getPathname()) return;
  if (opts?.replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePathname(): string {
  const [path, setPath] = useState(getPathname);
  useEffect(() => {
    const sync = () => setPath(getPathname());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return path;
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => {
    navigate(to, opts);
  }, []);
}

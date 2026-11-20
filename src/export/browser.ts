/**
 * Safari, and every browser on iOS, use WebKit.
 * Desktop Chrome and Edge include "Safari" in the UA and are excluded.
 */
export function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (!/AppleWebKit/i.test(ua)) return false;
  return !/Chrome|Chromium|Edg\/|OPR\//i.test(ua);
}

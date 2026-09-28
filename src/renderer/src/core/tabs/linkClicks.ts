/**
 * The browser's "open this link in a new tab" gestures, for in-app links.
 *
 * Every tab runs over its own memory history, so an in-app `<a>` carries an
 * app-relative `href` ("/elektro/…"). A modified click on it would otherwise
 * fall to Chromium, which tries a new WINDOW — denied by the main process — and
 * nothing happens. `linkClickIntent` reads the gesture instead:
 *
 *  - ⌘-click (macOS) / Ctrl-click, and middle-click → a new tab in the
 *    background, as in a browser;
 *  - anything with Shift is NOT claimed: Shift-click and Shift+Ctrl-click are
 *    the smart models' selection gestures (`useSmartModel.handleClick`).
 *
 * Pure, so it is tested without a DOM event loop.
 */

export type LinkClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type AnchorLike = {
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  closest?: (selector: string) => unknown;
};

/** An app-relative path ("/x"), not a protocol-relative URL ("//x") or an external one. */
export const inAppPath = (anchor: AnchorLike): string | null => {
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  // An escape hatch for a link that must keep the default behaviour.
  if (anchor.closest?.("[data-tab-link='off']")) return null;
  return href;
};

/**
 * The in-app link under an event target, if any: the nearest enclosing
 * `<a href>` and where it goes. What the right-click menu and the click
 * gestures both start from.
 */
export const inAppLinkAt = (
  target: EventTarget | null,
): { anchor: Element; to: string } | null => {
  const anchor = (target as Element | null)?.closest?.("a[href]");
  if (!anchor) return null;
  const to = inAppPath(anchor);
  return to ? { anchor, to } : null;
};

export const linkClickIntent = (
  event: LinkClickLike,
  anchor: AnchorLike,
): { to: string; background: true } | null => {
  if (event.shiftKey || event.altKey) return null;
  const middle = event.button === 1;
  const modified = event.button === 0 && (event.metaKey || event.ctrlKey);
  if (!middle && !modified) return null;
  const to = inAppPath(anchor);
  return to ? { to, background: true } : null;
};

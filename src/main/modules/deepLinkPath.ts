/**
 * The app path an `orkestrator://` link points at, with exactly one leading
 * slash.
 *
 * `hostname` + `pathname` is the whole path however the URL parser split it,
 * and where the split falls depends on the link's shape:
 *
 *   orkestrator://mikro/x   → host "mikro", path "/x"
 *   orkestrator:///mikro/x  → host "",      path "/mikro/x"
 *
 * Joining naively gave "//mikro/x" for the second — a route that matches
 * nothing. Leading slashes are collapsed so both give `/mikro/x`.
 *
 * Its own module, and pure, because `WindowManager` imports `electron` and is
 * therefore untestable outside the app.
 */
export const deepLinkPath = (url: Pick<URL, "hostname" | "pathname" | "search">): string =>
  "/" + (url.hostname + url.pathname).replace(/^\/+/, "") + url.search;

/** Longer than any link the app or kontrol builds; a badge is a few hundred characters. */
export const MAX_DEEP_LINK_LENGTH = 4096;

/**
 * The URL of an `orkestrator://` link, or `null` when it is not one the app
 * should follow: another scheme (argv on Linux/Windows carries whatever the
 * desktop passed), unparseable, or absurdly long.
 */
export const parseDeepLink = (raw: string): URL | null => {
  if (raw.length > MAX_DEEP_LINK_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  return url.protocol === "orkestrator:" ? url : null;
};

/**
 * Drops a link that arrives again right after itself. Some browsers and
 * desktop launchers hand the same click over twice (`open-url` plus argv, or a
 * double-fired protocol handler), which opened the same page in two tabs.
 */
export const createDeepLinkDedupe = (windowMs = 1500, now: () => number = Date.now) => {
  let last: { url: string; at: number } | null = null;
  return (url: string): boolean => {
    const at = now();
    const repeat = !!last && last.url === url && at - last.at < windowMs;
    last = { url, at };
    return !repeat;
  };
};

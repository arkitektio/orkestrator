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

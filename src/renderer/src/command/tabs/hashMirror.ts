import { createPath, parsePath, type Path } from "react-router-dom";

/**
 * Keeping the window's URL hash in step with the active tab.
 *
 * Each tab's router is a memory history, which never touches
 * `window.location`. That is the point — it is what makes the histories
 * independent — but it means the URL bar would go stale, and a reload or a
 * deep link would have nothing to land on. So the active tab's location is
 * mirrored into the hash in the same `#/{baseName}{path}` shape the old
 * `HashRouter` used, and read back on boot.
 *
 * Pure: the provider decides WHEN to mirror; this only says WHAT the string is.
 */

const withLeadingSlash = (path: string) => (path.startsWith("/") ? path : `/${path}`);

/** The hash to write for a location, e.g. `#/orkestrator/mikro/x?y=1`. */
export const hashFor = (location: Partial<Path>, baseName: string): string => {
  const path = createPath({
    pathname: withLeadingSlash(location.pathname ?? "/"),
    search: location.search ?? "",
    hash: location.hash ?? "",
  });
  return `#${baseName ? `/${baseName}` : ""}${path}`;
};

/**
 * The app-relative path a hash points at, or `null` when it points nowhere
 * (empty, `#`, `#/`, or just the basename) — in which case boot restores tabs
 * from storage rather than opening one.
 */
export const readBootPath = (hash: string, baseName: string): string | null => {
  let path = hash.startsWith("#") ? hash.slice(1) : hash;

  if (baseName) {
    const prefix = `/${baseName}`;
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      path = path.slice(prefix.length);
    } else if (path !== "" && path !== "/") {
      // A hash that does not carry our basename is not ours to interpret.
      return null;
    }
  }

  if (path === "" || path === "/") {
    return null;
  }

  const parsed = parsePath(withLeadingSlash(path));
  return createPath({
    pathname: parsed.pathname ?? "/",
    search: parsed.search ?? "",
    hash: parsed.hash ?? "",
  });
};

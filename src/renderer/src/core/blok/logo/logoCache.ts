/**
 * Logo bloks, as the SVG they rendered to.
 *
 * A logo is drawn once by the blok renderer, against its demo state. The
 * `<svg>` it produced is serialized and kept here under the blok's id, with
 * the server's `Blok.hash` of what it renders. Every later showing with the
 * same hash places that SVG inline (`inlineDrawing`): a list of agents renders
 * no bloks, and fetches no trees. Inline, not an `<img>`: the palette is
 * `var(--logo-*)` of the page, and a hover plays the logo's animations.
 *
 * In IndexedDB, like the rail backdrop (`backdropStore.ts`), and mirrored in
 * memory so that a list showing one logo many times reads the store once. One
 * entry per blok: a new hash replaces the old drawing.
 */

import { createKeyedStore } from "../cache/keyedStore";

/**
 * Bumped when how a logo renders changes (the SVG components themselves), so
 * a drawing cached by an older Orkestrator is drawn again.
 */
export const LOGO_RENDERER_VERSION = 2;

type StoredLogo = { key: string; svg: string };

const isStoredLogo = (value: unknown): value is StoredLogo =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as StoredLogo).key === "string" &&
  typeof (value as StoredLogo).svg === "string";

const logos = createKeyedStore<string>({
  db: "orkestrator-logos",
  store: "svgs",
  version: LOGO_RENDERER_VERSION,
  isValue: (value): value is string => typeof value === "string",
  label: "logo",
  // Stored as `{ key, svg }` since before the store was shared.
  legacy: {
    read: (stored) => (isStoredLogo(stored) ? { key: stored.key, value: stored.svg } : null),
    write: (entry): StoredLogo => ({ key: entry.key, svg: entry.value }),
  },
});

/** What a drawing is cached under: what the blok renders, and which renderer drew it. */
export const logoCacheKey = logos.cacheKey;

/**
 * The SVG blok `blokId` rendered to, when it was rendered from what `hash`
 * describes; null when it never was, or has changed since. A store that
 * cannot be opened is a miss: the logo is drawn instead.
 */
export const loadLogo = (blokId: string, hash: string): Promise<string | null> => logos.load(blokId, hash);

/** Keeps `svg` as blok `blokId`'s drawing for `hash`, replacing whatever was kept for it. */
export const saveLogo = (blokId: string, hash: string, svg: string): Promise<void> => logos.save(blokId, hash, svg);

/** Forgets every drawing, in memory and stored. For tests, and a "clear caches" action. */
export const clearLogos = (): Promise<void> => logos.clear();

/**
 * The `<svg>` a logo blok drew, as text to keep: null when there is none, or
 * when a node in it failed (that drawing is not the logo, so it is not kept).
 */
export const serializeDrawing = (container: Element): string | null => {
  const svg = container.querySelector("svg[data-blok-svg]");
  if (!svg || svg.querySelector("[data-blok-error]")) return null;
  const copy = svg.cloneNode(true) as Element;
  // The serializer declares the SVG namespace itself; an `xmlns` attribute as well
  // would be a duplicate attribute, which no parser takes.
  copy.removeAttribute("xmlns");
  const text = new XMLSerializer().serializeToString(copy);
  return /^<svg[^>]*\sxmlns="/.test(text) ? text : text.replace("<svg", `<svg xmlns="${SVG_NAMESPACE}"`);
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** What a logo blok can draw (`bloks/logo`), and nothing else is placed in the page. */
const DRAWN_ELEMENTS = new Set([
  "svg",
  "title",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "g",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
]);

/** Attributes that may hold a `url(#id)` into the drawing. */
const REFERENCING_ATTRIBUTES = ["fill", "stroke", "clip-path"];

/**
 * A kept drawing as markup to place inline, its ids moved to `prefix` so two
 * copies on one page never share a gradient. Null when it is not a drawing a
 * logo blok makes: something that is not one of its elements, a handler, or
 * a link, none of which the renderer ever writes.
 */
export const inlineDrawing = (svg: string, prefix: string): string | null => {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;
  if (parsed.querySelector("parsererror") || root.localName !== "svg" || root.namespaceURI !== SVG_NAMESPACE) {
    return null;
  }
  const drawnAs = root.getAttribute("data-blok-prefix");
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    if (!DRAWN_ELEMENTS.has(element.localName.toLowerCase()) || element.namespaceURI !== SVG_NAMESPACE) return null;
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name.endsWith("href")) return null;
    }
    if (!drawnAs) continue;
    const id = element.getAttribute("id");
    if (id?.startsWith(`${drawnAs}-`)) element.setAttribute("id", prefix + id.slice(drawnAs.length));
    for (const name of REFERENCING_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value?.includes(`#${drawnAs}-`)) element.setAttribute(name, value.split(`#${drawnAs}-`).join(`#${prefix}-`));
    }
  }
  root.setAttribute("data-blok-prefix", prefix);
  return new XMLSerializer().serializeToString(root);
};

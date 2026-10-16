/**
 * A blok's drawing as markup to keep: what it rendered, cloned, its canvases
 * baked into images, and cleaned of everything that could act.
 *
 * Kept as the DOM, not as pixels: the snapshot is styled by the page's own
 * classes and `var(--…)` colours, so it follows the theme and stays sharp at
 * any size. Only a canvas (a 3D scene) is baked, as the picture it painted.
 *
 * Off the main thread where it can be: canvases encode with `toBlob`
 * (asynchronous, encoded off-thread), and the cleaning runs once, before the
 * snapshot is stored, so showing a kept preview is a string replacement.
 */

import { whenIdle } from "./queue";

export type BlokSnapshot = { html: string; width: number; height: number };

/**
 * Stands for a showing's own id prefix in kept markup: every id a snapshot
 * declares, and every reference to one, starts with it. `placeSnapshot`
 * replaces it, so two previews on one page never share a gradient or a clip.
 */
export const SNAPSHOT_ID_TOKEN = "__blokpreview__";

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the canvas."));
    reader.readAsDataURL(blob);
  });

/** What a canvas shows, as a data URL; null when it cannot be read (empty, tainted, or no encoder). */
const encodeCanvas = (canvas: HTMLCanvasElement): Promise<string | null> =>
  new Promise((resolve) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(null);
          blobToDataUrl(blob).then(resolve, () => resolve(null));
        },
        "image/webp",
        0.85,
      );
    } catch {
      resolve(null);
    }
  });

/** Writes what a form control shows (a property, never in the DOM) into its attributes. */
const freezeControls = (live: Element, copy: Element) => {
  const liveControls = live.querySelectorAll("input, textarea, select");
  const copiedControls = copy.querySelectorAll("input, textarea, select");
  liveControls.forEach((control, index) => {
    const target = copiedControls[index];
    if (!target) return;
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox" || control.type === "radio") {
        target.toggleAttribute("checked", control.checked);
      } else {
        target.setAttribute("value", control.value);
      }
    } else if (control instanceof HTMLTextAreaElement) {
      target.textContent = control.value;
    } else if (control instanceof HTMLSelectElement) {
      Array.from(target.querySelectorAll("option")).forEach((option, optionIndex) =>
        option.toggleAttribute("selected", optionIndex === control.selectedIndex),
      );
    }
  });
};

/**
 * What `container` drew, as markup to keep; null when it drew nothing, or a
 * node in it failed (that drawing is not what the blok looks like, so it is
 * not kept). Clones synchronously (the canvases are read in the same task, so
 * they show this frame), then waits for their encoding.
 */
export const captureSnapshot = async (container: HTMLElement): Promise<BlokSnapshot | null> => {
  if (!container.firstElementChild || container.querySelector("[data-blok-error]")) return null;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const copy = container.cloneNode(true) as HTMLElement;
  freezeControls(container, copy);

  const liveCanvases = Array.from(container.querySelectorAll("canvas"));
  const copiedCanvases = Array.from(copy.querySelectorAll("canvas"));
  const encoded = liveCanvases.map(encodeCanvas);
  const sources = await Promise.all(encoded);
  copiedCanvases.forEach((canvas, index) => {
    const live = liveCanvases[index];
    const image = document.createElement("img");
    const source = sources[index];
    if (source) image.setAttribute("src", source);
    image.setAttribute("alt", "");
    image.className = canvas.className;
    const style = canvas.getAttribute("style");
    if (style) image.setAttribute("style", style);
    if (live) {
      image.style.width = `${live.clientWidth}px`;
      image.style.height = `${live.clientHeight}px`;
    }
    canvas.replaceWith(image);
  });

  // An image an asset resolved to lives as long as this window (a blob: URL): kept as data.
  await Promise.all(
    Array.from(copy.querySelectorAll("img")).map(async (image) => {
      const source = image.getAttribute("src");
      if (!source?.startsWith("blob:")) return;
      const data = await fetch(source)
        .then((response) => response.blob())
        .then(blobToDataUrl)
        .catch(() => null);
      if (data) image.setAttribute("src", data);
    }),
  );

  // Cleaning parses and walks the whole drawing: in an idle period.
  await whenIdle();
  const html = sanitizeSnapshot(copy.innerHTML);
  return html ? { html, width, height } : null;
};

/** Elements that run, load or embed something: never part of a kept drawing. */
const DROPPED_ELEMENTS = new Set([
  "script",
  "noscript",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "link",
  "meta",
  "base",
  "style",
  "template",
  "portal",
  "audio",
  "video",
  "source",
  "track",
  // SVG animation elements can rewrite attributes (an href) after cleaning.
  "set",
  "animate",
  "animatemotion",
  "animatetransform",
]);

/** Attributes that navigate, submit or load: dropped outright. */
const DROPPED_ATTRIBUTES = new Set(["action", "formaction", "srcset", "ping", "background", "poster", "data", "autofocus"]);

const SAFE_IMAGE_SOURCE = /^(data:image\/(png|jpeg|webp|gif|avif);|https?:)/i;
const URL_REFERENCE = /url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g;

/**
 * `html` with nothing left that can act: no scripts, handlers, links or
 * embeds, images only from data or http(s), and every id (and every
 * `url(#…)` / `href="#…"` reference to one) moved under `SNAPSHOT_ID_TOKEN`.
 * Null when nothing is left.
 */
export const sanitizeSnapshot = (html: string): string | null => {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = parsed.body;

  for (const element of Array.from(body.querySelectorAll("*"))) {
    if (DROPPED_ELEMENTS.has(element.localName.toLowerCase())) element.remove();
  }

  const elements = Array.from(body.querySelectorAll("*"));
  const ids = new Map<string, string>();
  elements.forEach((element) => {
    const id = element.getAttribute("id");
    if (id && !ids.has(id)) ids.set(id, `${SNAPSHOT_ID_TOKEN}-${ids.size}`);
  });
  const rename = (id: string) => ids.get(id);

  for (const element of elements) {
    const tag = element.localName.toLowerCase();
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith("on") || DROPPED_ATTRIBUTES.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "href" || name === "xlink:href") {
        const target = value.startsWith("#") ? rename(value.slice(1)) : undefined;
        const image = tag === "image" && SAFE_IMAGE_SOURCE.test(value);
        if (target) element.setAttribute(attribute.name, `#${target}`);
        else if (!image) element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "src") {
        if (!SAFE_IMAGE_SOURCE.test(value.trim())) element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "style" && /javascript:|expression\(|@import/i.test(value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "id") {
        const target = rename(value);
        if (target) element.setAttribute("id", target);
        continue;
      }
      if (value.includes("url(")) {
        element.setAttribute(
          attribute.name,
          value.replace(URL_REFERENCE, (whole, _quote, id: string) => {
            const target = rename(id);
            return target ? `url(#${target})` : whole;
          }),
        );
      }
    }
  }

  const cleaned = body.innerHTML.trim();
  return cleaned.length > 0 ? cleaned : null;
};

/** Kept markup, ready to place inline under `prefix`. A string replacement: cheap enough for every card. */
export const placeSnapshot = (html: string, prefix: string): string => html.split(SNAPSHOT_ID_TOKEN).join(prefix);

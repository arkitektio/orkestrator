import { DragPreview } from "@/core/dnd/engine";

/**
 * What a drag of several cards looks like: a stack, the card that was grabbed
 * on top. Built as plain DOM at the moment the drag begins — the browser
 * takes one picture of it and it is removed again, so there is nothing here
 * for React to own.
 */

/** Cards shown, however many are in hand; the badge has the real number. */
export const STACK_MAX_LAYERS = 3;
/** How far each card sits right of, and below, the one above it. */
export const STACK_OFFSET_PX = 6;
/** A card larger than this is shown smaller: a poster-sized drag image hides where it is going. */
export const STACK_MAX_SIDE_PX = 260;

/** Marks that belong to the card in the page, not to its picture. */
const STRIPPED_ATTRIBUTES = [
  "id",
  "draggable",
  "data-smart",
  "data-drag-source",
  "data-drop-target",
  "data-over",
  "data-dragging",
  "data-isdropping",
  "data-selectable",
  // The selection ring, and the index badge drawn from these in `::after`.
  "data-selected",
  "data-selected-index",
  "data-bselected",
  "data-bselected-index",
];

/** A copy of `node` as it looks now, pinned to the size it has in the page. */
const imprintOf = (node: HTMLElement, width: number, height: number) => {
  const imprint = node.cloneNode(true) as HTMLElement;

  for (const element of [imprint, ...imprint.querySelectorAll<HTMLElement>("*")]) {
    for (const attribute of STRIPPED_ATTRIBUTES) {
      element.removeAttribute(attribute);
    }
  }

  // A cloned canvas is blank: paint what the original shows.
  const painted = node.querySelectorAll("canvas");
  imprint.querySelectorAll("canvas").forEach((canvas, index) => {
    const original = painted[index];
    if (!original || original.width === 0 || original.height === 0) return;
    try {
      canvas.getContext("2d")?.drawImage(original, 0, 0);
    } catch {
      // A tainted or lost canvas stays blank; the rest of the card is there.
    }
  });

  // Out of its grid and its `@container`, the clone would size itself anew.
  Object.assign(imprint.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    margin: "0",
    boxSizing: "border-box",
  });
  return imprint;
};

/**
 * The drag image for `count` cards, `node` being the one that was grabbed.
 * `null` for a single card: the browser's own picture of it is already right.
 */
export const buildStackPreview = (
  node: HTMLElement,
  count: number,
  grab: { x: number; y: number },
): DragPreview | null => {
  if (count < 2) {
    return null;
  }

  const doc = node.ownerDocument;
  const { width, height } = node.getBoundingClientRect();
  const under = Math.min(count, STACK_MAX_LAYERS) - 1;
  const spread = under * STACK_OFFSET_PX;
  const scale = Math.min(1, STACK_MAX_SIDE_PX / Math.max(width, height, 1));

  // The stack's whole extent is this element's own box: the browser
  // photographs the element it is handed, and what spills out of it is not
  // reliably in the picture.
  const stack = doc.createElement("div");
  stack.setAttribute("data-drag-stack", String(count));
  Object.assign(stack.style, {
    position: "relative",
    width: `${width + spread}px`,
    height: `${height + spread}px`,
    // `zoom`, not a transform: it changes the layout size, which is what the
    // picture is taken of.
    zoom: String(scale),
  });

  // Furthest first, so each card paints over the one below it.
  for (let depth = under; depth >= 1; depth -= 1) {
    const card = doc.createElement("div");
    card.setAttribute("data-drag-stack-card", "");
    card.className = "rounded-md border bg-card shadow-md";
    Object.assign(card.style, {
      position: "absolute",
      top: `${depth * STACK_OFFSET_PX}px`,
      left: `${depth * STACK_OFFSET_PX}px`,
      width: `${width}px`,
      height: `${height}px`,
      boxSizing: "border-box",
    });
    stack.appendChild(card);
  }

  stack.appendChild(imprintOf(node, width, height));

  const badge = doc.createElement("div");
  badge.setAttribute("data-drag-stack-count", "");
  badge.className =
    "flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground shadow";
  Object.assign(badge.style, {
    position: "absolute",
    // In the grabbed card's own corner, clear of the cards under it.
    top: "4px",
    right: `${spread + 4}px`,
  });
  badge.textContent = String(count);
  stack.appendChild(badge);

  return { element: stack, x: grab.x * scale, y: grab.y * scale };
};

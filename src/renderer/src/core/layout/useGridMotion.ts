import { useLayoutEffect, useRef } from "react";

/** Where a card sat in its grid, in the grid's own coordinates. */
export type GridBox = { x: number; y: number; width: number; height: number };

export type GridMotionPlan<T> = {
  /** Cards that are still here but sit somewhere else: slide from `dx, dy`. */
  moved: { item: T; dx: number; dy: number }[];
  /** Cards that were here last time and are gone: fade out where they were. */
  removed: { item: T; box: GridBox }[];
};

/** At most this many cards fade out at once; a whole page swapping just swaps. */
export const MAX_GHOSTS = 24;

const DURATION_MS = 240;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const GHOST_ATTRIBUTE = "data-grid-ghost";

/**
 * What changed between two measurements of a grid. Pure, so the rule is
 * testable without a layout engine: a card present in both that moved by a
 * pixel or more slides, a card only in `previous` leaves, and a card only in
 * `current` is not ours (it enters with the CSS `grid-enter` animation).
 */
export const planGridMotion = <T>(previous: Map<T, GridBox>, current: Map<T, GridBox>): GridMotionPlan<T> => {
  const moved: GridMotionPlan<T>["moved"] = [];
  const removed: GridMotionPlan<T>["removed"] = [];
  for (const [item, box] of current) {
    const before = previous.get(item);
    if (!before) continue;
    const dx = before.x - box.x;
    const dy = before.y - box.y;
    if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) moved.push({ item, dx, dy });
  }
  for (const [item, box] of previous) {
    if (!current.has(item)) removed.push({ item, box });
  }
  return { moved, removed: removed.length > MAX_GHOSTS ? [] : removed };
};

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Layout positions, which transforms (a slide in flight) and scrolling do not move. */
const measure = (grid: HTMLElement) => {
  const boxes = new Map<HTMLElement, GridBox>();
  for (const child of grid.children) {
    if (!(child instanceof HTMLElement) || child.hasAttribute(GHOST_ATTRIBUTE)) continue;
    boxes.set(child, { x: child.offsetLeft, y: child.offsetTop, width: child.offsetWidth, height: child.offsetHeight });
  }
  return boxes;
};

/** A removed card's stand-in: a dead copy at its old place, gone when it has faded. */
const fadeOut = (grid: HTMLElement, card: HTMLElement, box: GridBox) => {
  const ghost = card.cloneNode(true) as HTMLElement;
  ghost.setAttribute(GHOST_ATTRIBUTE, "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("id");
  ghost.inert = true;
  Object.assign(ghost.style, {
    position: "absolute",
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: "0",
    pointerEvents: "none",
    // Not the entrance animation `grid-enter` gives every child.
    animation: "none",
  });
  grid.appendChild(ghost);
  const animation = ghost.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.96)" },
    ],
    { duration: DURATION_MS, easing: EASING, fill: "forwards" },
  );
  const remove = () => ghost.remove();
  animation.onfinish = remove;
  animation.oncancel = remove;
};

/**
 * Slide and exit animations for a grid of cards, to go with the CSS entrance
 * (`grid-enter` in index.css).
 *
 * The grid is measured in a layout effect, i.e. only when it re-renders — which
 * is when its cards can have been added, removed or reordered. A card that
 * moved slides from where it was (FLIP, one Web Animation per card); a card
 * that left fades out as a clone at its old place.
 *
 * What this deliberately does not have: an observer, a timer or a listener.
 * `@formkit/auto-animate` did this job with a poll and an IntersectionObserver
 * per card that outlived the page and kept it in memory. Here the only state is
 * a ref, so it goes when the grid does, and a running animation ends by itself
 * within `DURATION_MS`.
 *
 * A change of the grid's width (window resize, a sidebar opening, a new column
 * count) moves every card without anything having been reordered, so that
 * re-measures without animating. The grid must be positioned (`relative`) —
 * the measurements and the clones are in its coordinates.
 */
export const useGridMotion = <T extends HTMLElement>() => {
  const gridRef = useRef<T>(null);
  const last = useRef<{ width: number; boxes: Map<HTMLElement, GridBox> } | null>(null);

  // No dependency list: the children are the only thing that changes here, and
  // they change by re-rendering this component.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || typeof grid.animate !== "function") return;

    const boxes = measure(grid);
    const width = grid.clientWidth;
    const before = last.current;
    last.current = { width, boxes };
    if (!before || before.width !== width || prefersReducedMotion()) return;

    const { moved, removed } = planGridMotion(before.boxes, boxes);
    for (const { item, dx, dy } of moved) {
      item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration: DURATION_MS,
        easing: EASING,
      });
    }
    for (const { item, box } of removed) fadeOut(grid, item, box);
  });

  return gridRef;
};

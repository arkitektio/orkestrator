import { Structure } from "@/core/types";

/**
 * DOM node → structure, for the delegated smart surface.
 *
 * Every `SmartModel` card used to carry its own Radix context-menu root (~15
 * component instances and a capture-phase document listener per card). Now a
 * single `SmartSurface` listens once and needs to answer "which structure is
 * this element part of?" — the `data-*` attributes on the node only carry the
 * id, but the action menu needs
 * the full fragment the card was rendered with, so `registerNode` records it
 * here. A `WeakMap` keyed on the element: an unmounted card drops out with
 * its node, nothing to leak.
 */
const structures = new WeakMap<HTMLElement, Structure>();

/** Marker attribute written on every registered node. */
export const SMART_NODE_ATTRIBUTE = "data-smart";

export const registerSmartNode = (node: HTMLElement, structure: Structure) => {
  structures.set(node, structure);
  node.setAttribute(SMART_NODE_ATTRIBUTE, "true");
};

export const unregisterSmartNode = (node: HTMLElement) => {
  structures.delete(node);
  node.removeAttribute(SMART_NODE_ATTRIBUTE);
};

export type SmartHit = { node: HTMLElement; structure: Structure };

/**
 * The nearest registered smart card around an event target, walking up past
 * unregistered `[data-smart]` ancestors (a card can nest a drop zone that is
 * selectable but carries no menu of its own).
 */
export const smartNodeAt = (target: EventTarget | null): SmartHit | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  let node = target.closest<HTMLElement>(`[${SMART_NODE_ATTRIBUTE}]`);
  while (node) {
    const structure = structures.get(node);
    if (structure) {
      return { node, structure };
    }
    node = node.parentElement?.closest<HTMLElement>(
      `[${SMART_NODE_ATTRIBUTE}]`,
    ) ?? null;
  }
  return null;
};

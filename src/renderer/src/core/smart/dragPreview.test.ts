// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { buildStackPreview, STACK_MAX_SIDE_PX, STACK_OFFSET_PX } from "./dragPreview";

/** A card in the page, with the box jsdom would not give it. */
const card = (width = 200, height = 100) => {
  const node = document.createElement("div");
  node.id = "card-12";
  node.setAttribute("draggable", "true");
  node.setAttribute("data-smart", "true");
  node.setAttribute("data-drop-target", "true");
  node.setAttribute("data-selected", "true");
  node.setAttribute("data-selected-index", "2");
  node.className = "group relative";
  node.innerHTML = `<a id="inner" href="/x"><span>cells</span></a>`;
  node.getBoundingClientRect = () => ({ top: 0, left: 0, width, height }) as DOMRect;
  document.body.appendChild(node);
  return node;
};

const GRAB = { x: 50, y: 20 };

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the picture of a drag", () => {
  it("is left to the browser for a single card", () => {
    expect(buildStackPreview(card(), 1, GRAB)).toBeNull();
  });

  it("stacks one card under the grabbed one for two", () => {
    const { element } = buildStackPreview(card(), 2, GRAB)!;
    expect(element.querySelectorAll("[data-drag-stack-card]")).toHaveLength(1);
  });

  it("stops at three cards, and says how many there really are", () => {
    for (const count of [3, 7]) {
      const { element } = buildStackPreview(card(), count, GRAB)!;
      expect(element.querySelectorAll("[data-drag-stack-card]")).toHaveLength(2);
      expect(element.querySelector("[data-drag-stack-count]")?.textContent).toBe(String(count));
    }
  });

  it("puts the grabbed card on top, as it looks, at the size it has", () => {
    const node = card(200, 100);
    const { element } = buildStackPreview(node, 3, GRAB)!;

    const layers = [...element.children] as HTMLElement[];
    const imprint = layers.at(-2)!; // under the badge only
    expect(imprint.className).toBe(node.className);
    expect(imprint.textContent).toBe("cells");
    expect(imprint.style.width).toBe("200px");
    expect(imprint.style.height).toBe("100px");
    // Painted last of the cards, so over them; the furthest card comes first.
    expect(layers[0].style.top).toBe(`${2 * STACK_OFFSET_PX}px`);
    expect(layers[1].style.top).toBe(`${STACK_OFFSET_PX}px`);
  });

  it("takes none of the card's marks into the picture", () => {
    const node = card();
    const { element } = buildStackPreview(node, 2, GRAB)!;
    document.body.appendChild(element);

    expect(document.querySelectorAll("#card-12")).toHaveLength(1);
    expect(document.querySelectorAll("#inner")).toHaveLength(1);
    expect(element.querySelector("[data-smart], [data-drop-target], [draggable]")).toBeNull();
    // No selection ring, no index badge, in the picture.
    expect(element.querySelector("[data-selected], [data-selected-index]")).toBeNull();
    // And the card itself is untouched.
    expect(node.getAttribute("data-selected")).toBe("true");
  });

  it("is as large as everything in it, so nothing depends on overflow", () => {
    const { element } = buildStackPreview(card(200, 100), 3, GRAB)!;
    expect(element.style.width).toBe(`${200 + 2 * STACK_OFFSET_PX}px`);
    expect(element.style.height).toBe(`${100 + 2 * STACK_OFFSET_PX}px`);
  });

  it("holds a small card where it was grabbed", () => {
    const preview = buildStackPreview(card(200, 100), 2, GRAB)!;
    expect(preview.element.style.zoom).toBe("1");
    expect(preview).toMatchObject(GRAB);
  });

  it("shows a large card smaller, and holds it at the same spot of the smaller picture", () => {
    const side = STACK_MAX_SIDE_PX * 2;
    const preview = buildStackPreview(card(side, side / 2), 2, GRAB)!;
    expect(preview.element.style.zoom).toBe("0.5");
    expect(preview).toMatchObject({ x: GRAB.x / 2, y: GRAB.y / 2 });
  });
});

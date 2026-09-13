// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  HOVER_OPEN_DELAY_MS,
  HOVER_WARM_OPEN_DELAY_MS,
  hoverOpenDelay,
  registerSmartNode,
  smartNodeAt,
  unregisterSmartNode,
} from "./nodeRegistry";

const structure = (id: string) => ({ identifier: "@test/thing", object: { id } });

describe("smartNodeAt", () => {
  it("resolves the registered card around a nested target", () => {
    const card = document.createElement("div");
    const inner = document.createElement("span");
    card.appendChild(inner);
    document.body.appendChild(card);
    registerSmartNode(card, structure("a"));

    expect(smartNodeAt(inner)?.structure.object.id).toBe("a");
    expect(smartNodeAt(document.body)).toBeNull();

    unregisterSmartNode(card);
    expect(smartNodeAt(inner)).toBeNull();
    card.remove();
  });

  it("walks past a marked but unregistered descendant to the registered card", () => {
    const card = document.createElement("div");
    const dropZone = document.createElement("div");
    const leaf = document.createElement("i");
    dropZone.appendChild(leaf);
    card.appendChild(dropZone);
    document.body.appendChild(card);
    registerSmartNode(card, structure("outer"));
    registerSmartNode(dropZone, structure("inner"));
    unregisterSmartNode(dropZone);
    dropZone.setAttribute("data-smart", "true");

    expect(smartNodeAt(leaf)?.structure.object.id).toBe("outer");
    card.remove();
  });
});

describe("hoverOpenDelay", () => {
  it("is slow on a cold group and fast while the group is warm", () => {
    expect(hoverOpenDelay(null, 1000)).toBe(HOVER_OPEN_DELAY_MS);
    expect(hoverOpenDelay(800, 1000)).toBe(HOVER_WARM_OPEN_DELAY_MS);
    expect(hoverOpenDelay(0, 1000)).toBe(HOVER_OPEN_DELAY_MS);
  });
});

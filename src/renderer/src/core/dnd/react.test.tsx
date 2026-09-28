// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDragSource, DragSession, installDndEngine } from "./engine";
import { useCanDrop } from "./react";
import { fireDrag } from "./testing";

const acceptsCards = (session: DragSession) =>
  session.origin === "internal" && session.kind === "card";

let renders = 0;
const Surface = () => {
  renders += 1;
  const canDrop = useCanDrop(acceptsCards);
  return <div data-can-drop={canDrop} />;
};

/** Start a drag of `kind` and let the engine publish it (a frame later). */
const lift = async (kind: string) => {
  const node = document.createElement("div");
  document.body.appendChild(node);
  createDragSource(() => ({ kind, getData: () => null })).attach(node);
  await act(async () => {
    fireDrag(node, "dragstart");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
  return () => act(() => void fireDrag(node, "dragend"));
};

let uninstall: () => void;
beforeEach(() => {
  renders = 0;
  uninstall = installDndEngine(document);
});
afterEach(() => {
  uninstall();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("useCanDrop", () => {
  it("leaves a surface alone for a drag it would not take", async () => {
    render(<Surface />);
    const before = renders;
    const end = await lift("tab");
    end();
    expect(renders).toBe(before);
  });

  it("re-renders as a drag it would take is lifted and let go", async () => {
    const { container } = render(<Surface />);
    const end = await lift("card");
    expect(container.firstElementChild?.getAttribute("data-can-drop")).toBe("true");
    end();
    expect(container.firstElementChild?.getAttribute("data-can-drop")).toBe("false");
  });
});

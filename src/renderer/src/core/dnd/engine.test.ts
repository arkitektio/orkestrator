// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDragSource,
  createDropTarget,
  DragSession,
  DropPayload,
  DropTargetConfig,
  getDragSession,
  installDndEngine,
} from "./engine";
import { dragOnto, dragOutOfWindow, FakeDataTransfer, fireDrag } from "./testing";

const el = (parent: Element = document.body, tag = "div") => {
  const node = document.createElement(tag);
  parent.appendChild(node);
  return node;
};

const source = (node: HTMLElement, data: unknown = "payload", kind = "thing") => {
  createDragSource(() => ({
    kind,
    getData: () => data,
    getExternalData: () => ({ "text/plain": String(data) }),
  })).attach(node);
  return node;
};

const target = (node: HTMLElement, config: Partial<DropTargetConfig> = {}) => {
  const onDrop = vi.fn<(payload: DropPayload) => void>();
  const handle = createDropTarget(() => ({
    accepts: (session: DragSession) =>
      session.origin === "internal" && session.kind === "thing",
    onDrop,
    ...config,
  }));
  handle.attach(node);
  return { node, handle, onDrop };
};

let uninstall: () => void;

beforeEach(() => {
  uninstall = installDndEngine(document);
});

afterEach(() => {
  uninstall();
  document.body.innerHTML = "";
});

describe("a drag between our own nodes", () => {
  it("hands the source's data to the target it is dropped on", () => {
    const from = source(el());
    const to = target(el());

    const event = dragOnto(from, to.node).drop();

    expect(event.defaultPrevented).toBe(true);
    expect(to.onDrop).toHaveBeenCalledTimes(1);
    expect(to.onDrop.mock.calls[0][0]).toMatchObject({
      origin: "internal",
      kind: "thing",
      data: "payload",
    });
  });

  it("writes the outside-facing data, replacing what a link inside brought along", () => {
    const from = source(el());
    const dataTransfer = new FakeDataTransfer({ data: { "text/uri-list": "https://a.link" } });

    fireDrag(from, "dragstart", { dataTransfer });

    expect(dataTransfer.getData("text/plain")).toBe("payload");
    expect(dataTransfer.getData("text/uri-list")).toBe("");
  });

  it("records the keys held as the drag began", () => {
    const from = source(el());
    const to = target(el());

    dragOnto(from, to.node, { ctrlKey: true }).drop();

    const payload = to.onDrop.mock.calls[0][0];
    expect(payload.origin === "internal" && payload.modifiers.ctrlKey).toBe(true);
  });

  it("starts from a link inside the source, but not from a field", () => {
    const from = source(el());
    const link = el(from, "a");
    const field = el(from, "input");
    const to = target(el());

    dragOnto(field, to.node).drop();
    expect(to.onDrop).not.toHaveBeenCalled();

    dragOnto(link, to.node).drop();
    expect(to.onDrop).toHaveBeenCalledTimes(1);
  });

  it("leaves a natively draggable element inside a source to itself", () => {
    const from = source(el());
    const foreign = el(from);
    foreign.setAttribute("draggable", "true");
    const to = target(el());

    dragOnto(foreign, to.node).drop();

    expect(to.onDrop).not.toHaveBeenCalled();
  });

  it("refuses a target that does not accept the kind", () => {
    const from = source(el(), "payload", "other");
    const to = target(el());

    const drag = dragOnto(from, to.node);

    expect(to.handle.isOver()).toBe(false);
    expect(drag.drop().defaultPrevented).toBe(false);
    expect(to.onDrop).not.toHaveBeenCalled();
  });

  it("marks the source only after the browser has taken the drag image", () => {
    vi.useFakeTimers();
    try {
      const from = source(el());
      fireDrag(from, "dragstart");
      expect(from.hasAttribute("data-dragging")).toBe(false);
      expect(getDragSession()).toBeNull();

      vi.advanceTimersToNextFrame();
      expect(from.getAttribute("data-dragging")).toBe("true");
      expect(document.documentElement.getAttribute("data-dnd-active")).toBe("thing");
      expect(getDragSession()).toMatchObject({ kind: "thing" });

      fireDrag(from, "dragend");
      expect(from.hasAttribute("data-dragging")).toBe(false);
      expect(document.documentElement.hasAttribute("data-dnd-active")).toBe(false);
      expect(getDragSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the source's own preview, and clears it away once the picture is taken", () => {
    vi.useFakeTimers();
    try {
      const chip = document.createElement("div");
      const from = el();
      createDragSource(() => ({
        kind: "thing",
        getData: () => ["a", "b"],
        preview: ({ data, node, grab }) => {
          expect(node).toBe(from);
          chip.textContent = `${(data as string[]).length} things`;
          return { element: chip, x: grab.x / 2, y: grab.y / 2 };
        },
      })).attach(from);
      const dataTransfer = new FakeDataTransfer();

      // jsdom lays nothing out: the node's box is at the origin, so the grab
      // point is the pointer's own position.
      fireDrag(from, "dragstart", { dataTransfer, clientX: 40, clientY: 10 });
      expect(dataTransfer.dragImage).toBe(chip);
      expect(dataTransfer.dragImageOffset).toEqual({ x: 20, y: 5 });
      expect(chip.textContent).toBe("2 things");
      expect(chip.isConnected).toBe(true);

      vi.advanceTimersToNextFrame();
      expect(chip.isConnected).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends the drag of a source that unmounted under it", () => {
    const from = source(el());
    const to = target(el());
    dragOnto(from, to.node);
    expect(to.handle.isOver()).toBe(true);

    from.remove();
    // Detached: the event no longer bubbles to the document.
    fireDrag(from, "dragend");

    expect(to.handle.isOver()).toBe(false);
  });

  it("gives up on a drag it never saw the end of, at the first free mouse move", () => {
    const from = source(el());
    const to = target(el());
    dragOnto(from, to.node);

    const move = new MouseEvent("mousemove", { bubbles: true, buttons: 0 });
    document.body.dispatchEvent(move);

    expect(to.handle.isOver()).toBe(false);
  });
});

describe("how a drag ended", () => {
  const endingSource = (node: HTMLElement) => {
    const onEnd = vi.fn();
    createDragSource(() => ({ kind: "thing", getData: () => "payload", onEnd })).attach(node);
    return onEnd;
  };

  it("tells the source a drag left the window and nobody took it", () => {
    const from = el();
    const onEnd = endingSource(from);

    dragOutOfWindow(from);

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith({ dropEffect: "none", leftWindow: true }, "payload");
  });

  it("forgets the leave once the drag comes back in", () => {
    const from = el();
    const onEnd = endingSource(from);
    const dataTransfer = new FakeDataTransfer();

    fireDrag(from, "dragstart", { dataTransfer });
    fireDrag(document.body, "dragleave", { dataTransfer, relatedTarget: null });
    fireDrag(document.body, "dragover", { dataTransfer });
    fireDrag(from, "dragend", { dataTransfer });

    expect(onEnd).toHaveBeenCalledWith({ dropEffect: "none", leftWindow: false }, "payload");
  });

  it("stays quiet when one of our targets took the drop", () => {
    const from = el();
    const onEnd = endingSource(from);
    const to = target(el());

    dragOnto(from, to.node).drop();

    expect(to.onDrop).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe("the hot path", () => {
  it("resolves an element once per drag, however often dragover fires on it", () => {
    const from = source(el());
    const accepts = vi.fn((session: DragSession) => session.origin === "internal");
    const to = target(el(), { accepts });
    const dataTransfer = new FakeDataTransfer();

    fireDrag(from, "dragstart", { dataTransfer });
    fireDrag(to.node, "dragenter", { dataTransfer });
    fireDrag(to.node, "dragover", { dataTransfer });
    fireDrag(to.node, "dragover", { dataTransfer });

    expect(accepts).toHaveBeenCalledTimes(1);
    expect(to.handle.isOver()).toBe(true);
  });

  it("sees a target that appears mid-drag under a resting pointer", () => {
    const from = source(el());
    const outer = el();
    const inner = el(outer);
    const dataTransfer = new FakeDataTransfer();

    fireDrag(from, "dragstart", { dataTransfer });
    fireDrag(inner, "dragover", { dataTransfer });
    const late = target(outer);
    fireDrag(inner, "dragover", { dataTransfer });

    expect(late.handle.isOver()).toBe(true);
  });

  it("listens for mouse moves only while a drag is running", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const from = source(el());
    const moveListeners = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === "mousemove").length;

    expect(moveListeners(add)).toBe(0);
    fireDrag(from, "dragstart");
    expect(moveListeners(add)).toBe(1);

    // A move with no button held: the drag ended without telling us.
    document.dispatchEvent(new MouseEvent("mousemove", { buttons: 0 }));
    expect(getDragSession()).toBeNull();
    expect(moveListeners(remove)).toBe(1);
  });
});

describe("nested targets", () => {
  it("lets the innermost accepting target claim, and keeps the outer silent", () => {
    const from = source(el());
    const outer = target(el());
    const inner = target(el(outer.node));
    const leaf = el(inner.node, "span");

    const drag = dragOnto(from, leaf);
    expect(inner.handle.isOver()).toBe(true);
    expect(inner.node.getAttribute("data-over")).toBe("true");
    expect(outer.handle.isOver()).toBe(false);

    drag.drop();
    expect(inner.onDrop).toHaveBeenCalledTimes(1);
    expect(outer.onDrop).not.toHaveBeenCalled();
  });

  it("falls through an inner target that does not accept", () => {
    const from = source(el());
    const outer = target(el());
    const inner = target(el(outer.node), { accepts: () => false });

    dragOnto(from, inner.node).drop();

    expect(outer.onDrop).toHaveBeenCalledTimes(1);
  });

  it("marks a hover-only target without letting it claim", () => {
    const from = source(el());
    const outer = target(el());
    const hover = target(el(outer.node), { hoverOnly: true });

    const drag = dragOnto(from, hover.node);
    expect(hover.handle.isOver()).toBe(true);
    expect(outer.handle.isOver()).toBe(true);

    drag.drop();
    expect(hover.onDrop).not.toHaveBeenCalled();
    expect(outer.onDrop).toHaveBeenCalledTimes(1);
  });

  it("lets a drag rest on a hover-only target, and delivers nothing dropped there", () => {
    const from = source(el());
    const hover = target(el(), { hoverOnly: true });
    const dataTransfer = new FakeDataTransfer();

    fireDrag(from, "dragstart", { dataTransfer });
    const over = fireDrag(hover.node, "dragover", { dataTransfer });
    // Accepted, or the cursor would say "not here" over a tab about to open.
    expect(over.defaultPrevented).toBe(true);
    expect(hover.handle.isOver()).toBe(true);

    fireDrag(hover.node, "drop", { dataTransfer });
    expect(hover.onDrop).not.toHaveBeenCalled();
    expect(hover.handle.isOver()).toBe(false);
  });

  it("moves the mark as the drag moves, notifying only the targets that changed", () => {
    const from = source(el());
    const a = target(el());
    const b = target(el());
    const onA = vi.fn();
    const onB = vi.fn();
    a.handle.subscribe(onA);
    b.handle.subscribe(onB);

    const drag = dragOnto(from, a.node);
    fireDrag(a.node, "dragover", { dataTransfer: drag.dataTransfer });
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();

    fireDrag(b.node, "dragover", { dataTransfer: drag.dataTransfer });
    expect(a.handle.isOver()).toBe(false);
    expect(b.handle.isOver()).toBe(true);
    expect(onA).toHaveBeenCalledTimes(2);
    expect(onB).toHaveBeenCalledTimes(1);
  });
});

describe("a drag from outside", () => {
  const acceptsText = (session: DragSession) =>
    session.origin === "external" && session.types.includes("text/plain");
  const acceptsFiles = (session: DragSession) =>
    session.origin === "external" && session.types.includes("Files");

  it("shows only its types while it hovers, and its data on the drop", () => {
    const seen: DragSession[] = [];
    const to = target(el(), {
      accepts: (session) => {
        seen.push(session);
        return acceptsText(session);
      },
    });
    const dataTransfer = new FakeDataTransfer({ data: { "text/plain": "hello" } });

    const over = fireDrag(to.node, "dragover", { dataTransfer });
    expect(over.defaultPrevented).toBe(true);
    expect(seen[0]).toEqual({ origin: "external", types: ["text/plain"] });

    fireDrag(to.node, "drop", { dataTransfer });
    expect(to.onDrop.mock.calls[0][0]).toMatchObject({
      origin: "external",
      data: { "text/plain": "hello" },
    });
  });

  it("hands over the original File objects", () => {
    const to = target(el(), { accepts: acceptsFiles });
    const file = new File(["x"], "x.txt");
    const dataTransfer = new FakeDataTransfer({ files: [file] });

    fireDrag(to.node, "dragover", { dataTransfer });
    fireDrag(to.node, "drop", { dataTransfer });

    const payload = to.onDrop.mock.calls[0][0];
    expect(payload.origin === "external" && payload.files[0]).toBe(file);
  });

  it("keeps a stray file from navigating the window", () => {
    const stray = el();
    const dataTransfer = new FakeDataTransfer({ files: [new File(["x"], "x.txt")] });

    const over = fireDrag(stray, "dragover", { dataTransfer });

    expect(over.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("none");
  });

  it("stays out of a drag somebody else is handling", () => {
    const foreign = el();
    foreign.addEventListener("dragover", (event) => {
      event.preventDefault();
      (event as DragEvent).dataTransfer!.dropEffect = "copy";
    });
    const dataTransfer = new FakeDataTransfer({ files: [new File(["x"], "x.txt")] });

    fireDrag(foreign, "dragover", { dataTransfer });

    expect(dataTransfer.dropEffect).toBe("copy");
  });

  it("forgets the drag when it leaves the window", () => {
    const to = target(el(), { accepts: acceptsText });
    const dataTransfer = new FakeDataTransfer({ data: { "text/plain": "hello" } });
    fireDrag(to.node, "dragover", { dataTransfer });
    expect(getDragSession()).not.toBeNull();

    fireDrag(to.node, "dragleave", { dataTransfer, relatedTarget: null });

    expect(to.handle.isOver()).toBe(false);
    expect(getDragSession()).toBeNull();
  });

  it("keeps the mark across a leave that only crosses into a child", () => {
    const to = target(el(), { accepts: acceptsText });
    const child = el(to.node);
    const dataTransfer = new FakeDataTransfer({ data: { "text/plain": "hello" } });
    fireDrag(to.node, "dragover", { dataTransfer });

    fireDrag(to.node, "dragleave", { dataTransfer, relatedTarget: child });

    expect(to.handle.isOver()).toBe(true);
  });
});

describe("registration", () => {
  it("marks and unmarks the nodes it is given", async () => {
    const node = el();
    const drag = createDragSource(() => ({ kind: "thing", getData: () => null }));
    const drop = createDropTarget(() => ({ accepts: () => true }));

    drag.attach(node);
    drop.attach(node);
    expect(node.getAttribute("draggable")).toBe("true");
    expect(node.hasAttribute("data-drag-source")).toBe(true);
    expect(node.hasAttribute("data-drop-target")).toBe(true);

    drag.attach(null);
    drop.attach(null);
    await Promise.resolve();
    expect(node.hasAttribute("draggable")).toBe(false);
    expect(node.hasAttribute("data-drag-source")).toBe(false);
    expect(node.hasAttribute("data-drop-target")).toBe(false);
  });

  it("drops the mark of a target that unmounts while hovered", async () => {
    const from = source(el());
    const to = target(el());
    dragOnto(from, to.node);

    to.handle.attach(null);
    await Promise.resolve();

    expect(to.handle.isOver()).toBe(false);
    expect(to.node.hasAttribute("data-over")).toBe(false);
  });

  it("keeps the mark through a ref that is only being re-attached", async () => {
    // What React does when a ref callback changes identity between renders.
    const from = source(el());
    const to = target(el());
    const listener = vi.fn();
    dragOnto(from, to.node);
    to.handle.subscribe(listener);

    to.handle.attach(null);
    to.handle.attach(to.node);
    await Promise.resolve();

    expect(to.handle.isOver()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it("reads the config when the drag happens, not when the node was attached", () => {
    let data = "first";
    const from = el();
    createDragSource(() => ({ kind: "thing", getData: () => data })).attach(from);
    const to = target(el());

    data = "second";
    dragOnto(from, to.node).drop();

    expect(to.onDrop.mock.calls[0][0]).toMatchObject({ data: "second" });
  });
});

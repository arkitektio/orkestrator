/**
 * Drag and drop on the platform's own HTML5 DnD, delegated.
 *
 * We only run in Chromium (Electron), so the reasons to put a library between
 * us and the native API — browser quirks, touch — do not apply, while the
 * native API is the only one that can take a file from the OS, carry a card
 * into a popout window, or sit next to another native drag system (dockview).
 * It also leaves pointer events alone, so the scene canvas, the flow editor
 * and marquee selection never see a drag.
 *
 * The shape follows `providers/smart/nodeRegistry.ts`: nodes are recorded in a
 * `WeakMap` and marked with an attribute, and ONE set of document listeners
 * resolves them from the event target. A page of several hundred cards costs
 * no listeners and, when a drag starts, no renders — the only nodes touched
 * are the source and whatever the pointer is over.
 *
 * Nesting: the innermost target that accepts the drag claims it. It alone is
 * marked `data-over` and receives the drop; the targets around it stay silent.
 * A `hoverOnly` target never claims (it is marked, and a drop on it goes
 * nowhere), which is what a spring-loaded tab or link wants.
 */

import type {
  DragSession,
  DragSourceConfig,
  DragSourceHandle,
  DropPayload,
  DropTargetConfig,
  DropTargetHandle,
  InternalDragSession,
} from "./types";

export type * from "./types";

export const DRAG_SOURCE_ATTRIBUTE = "data-drag-source";
export const DROP_TARGET_ATTRIBUTE = "data-drop-target";
/** On the source node, for the length of its drag. */
export const DRAGGING_ATTRIBUTE = "data-dragging";
/** On the target that would take the drop, and on hovered `hoverOnly` targets. */
export const OVER_ATTRIBUTE = "data-over";
/** On the root element while a drag is in this window; the value is its kind. */
export const ACTIVE_ATTRIBUTE = "data-dnd-active";

const FILES_TYPE = "Files";

type SourceRecord = { getConfig: () => DragSourceConfig };

type TargetRecord = {
  getConfig: () => DropTargetConfig;
  over: boolean;
  listeners: Set<() => void>;
};

const sources = new WeakMap<HTMLElement, SourceRecord>();
const targets = new WeakMap<HTMLElement, TargetRecord>();

/**
 * The drag as the event handlers see it: set the instant it begins. For one of
 * our own, also the source's config (for its `onEnd`) and whether the pointer
 * last went out of this window. One record, so an ending clears all of it.
 */
type ActiveDrag = {
  session: DragSession;
  config?: DragSourceConfig;
  leftWindow: boolean;
};
let active: ActiveDrag | null = null;
/**
 * The drag as subscribers see it. It trails `session` by a frame at the start
 * of an internal drag: Chromium takes the drag image after `dragstart`, and
 * cancels the drag outright if the source moves under it, so nothing may
 * restyle or re-lay-out the page until that has happened.
 */
let published: DragSession | null = null;
let overNodes: HTMLElement[] = [];
let root: HTMLElement | null = null;
/**
 * Bumped whenever a drop target attaches or detaches: what the resolution
 * cache is keyed on, besides the event target and the session.
 */
let targetsVersion = 0;
const sessionListeners = new Set<() => void>();

const defer = (fn: () => void) => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(fn);
  } else {
    setTimeout(fn, 0);
  }
};

const notify = (listeners: Set<() => void>) => {
  for (const listener of [...listeners]) {
    listener();
  }
};

export const getDragSession = (): DragSession | null => published;

export const subscribeDragSession = (listener: () => void) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

export const createDragSource = (
  getConfig: () => DragSourceConfig,
): DragSourceHandle => {
  const record: SourceRecord = { getConfig };
  let current: HTMLElement | null = null;

  return {
    attach: (node) => {
      if (current && current !== node) {
        sources.delete(current);
        current.removeAttribute(DRAG_SOURCE_ATTRIBUTE);
        current.removeAttribute("draggable");
      }
      current = node;
      if (node) {
        sources.set(node, record);
        node.setAttribute(DRAG_SOURCE_ATTRIBUTE, "true");
        node.setAttribute("draggable", "true");
      }
    },
  };
};

export const createDropTarget = (
  getConfig: () => DropTargetConfig,
): DropTargetHandle => {
  const record: TargetRecord = { getConfig, over: false, listeners: new Set() };
  let current: HTMLElement | null = null;
  let leaving = false;

  const detach = () => {
    leaving = false;
    const node = current;
    if (!node) return;
    current = null;
    targets.delete(node);
    targetsVersion += 1;
    node.removeAttribute(DROP_TARGET_ATTRIBUTE);
    if (record.over) {
      overNodes = overNodes.filter((n) => n !== node);
      node.removeAttribute(OVER_ATTRIBUTE);
      record.over = false;
      notify(record.listeners);
    }
  };

  return {
    attach: (node) => {
      if (!node) {
        // React re-attaches a ref whenever the callback's identity changes:
        // `ref(null)` then `ref(node)`, in one commit. Hovering re-renders the
        // component, so a target behind an inline ref would lose its mark to
        // the very render the mark caused. Wait and see if the node is back.
        if (current && !leaving) {
          leaving = true;
          queueMicrotask(() => {
            if (leaving) detach();
          });
        }
        return;
      }
      if (node === current) {
        leaving = false;
        return;
      }
      detach();
      current = node;
      targets.set(node, record);
      targetsVersion += 1;
      node.setAttribute(DROP_TARGET_ATTRIBUTE, "true");
    },
    subscribe: (listener) => {
      record.listeners.add(listener);
      return () => {
        record.listeners.delete(listener);
      };
    },
    isOver: () => record.over,
  };
};

const elementOf = (target: EventTarget | null): Element | null => {
  if (!target || typeof (target as Node).nodeType !== "number") {
    return null;
  }
  const node = target as Node;
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
};

const isEditable = (element: Element) =>
  !!element.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");

const setOver = (next: HTMLElement[]) => {
  const previous = overNodes;
  if (
    previous.length === next.length &&
    previous.every((node, index) => node === next[index])
  ) {
    return;
  }
  overNodes = next;

  for (const node of previous) {
    if (next.includes(node)) continue;
    node.removeAttribute(OVER_ATTRIBUTE);
    const record = targets.get(node);
    if (record?.over) {
      record.over = false;
      notify(record.listeners);
    }
  }
  for (const node of next) {
    if (previous.includes(node)) continue;
    node.setAttribute(OVER_ATTRIBUTE, "true");
    const record = targets.get(node);
    if (record && !record.over) {
      record.over = true;
      notify(record.listeners);
    }
  }
};

type Resolution = {
  claimant: { node: HTMLElement; config: DropTargetConfig } | null;
  over: HTMLElement[];
};

/**
 * The last resolution, and what it was for. `dragover` fires every few dozen
 * milliseconds even while the pointer rests, and `dragenter` goes through the
 * same handler just before it: the same element, the same drag and the same
 * targets resolve the same way, so the walk — and every `accepts` on it —
 * runs once per element the drag enters, not once per event.
 */
let cached: {
  element: Element | null;
  session: DragSession;
  version: number;
  resolution: Resolution;
} | null = null;

const resolve = (target: EventTarget | null, current: DragSession): Resolution => {
  const element = elementOf(target);
  if (
    cached &&
    cached.element === element &&
    cached.session === current &&
    cached.version === targetsVersion
  ) {
    return cached.resolution;
  }
  const resolution = walk(element, current);
  cached = { element, session: current, version: targetsVersion, resolution };
  return resolution;
};

/** Walk outwards from the element; innermost accepting target claims. */
const walk = (element: Element | null, current: DragSession): Resolution => {
  const selector = `[${DROP_TARGET_ATTRIBUTE}]`;
  let claimant: Resolution["claimant"] = null;
  const hovered: HTMLElement[] = [];

  let node = element?.closest<HTMLElement>(selector) ?? null;
  while (node) {
    const config = targets.get(node)?.getConfig();
    if (config && config.accepts(current)) {
      if (config.hoverOnly) {
        hovered.push(node);
      } else if (!claimant) {
        claimant = { node, config };
      }
    }
    node = node.parentElement?.closest<HTMLElement>(selector) ?? null;
  }

  return { claimant, over: claimant ? [claimant.node, ...hovered] : hovered };
};

const publish = () => {
  const session = active?.session ?? null;
  published = session;
  if (root) {
    if (session) {
      root.setAttribute(
        ACTIVE_ATTRIBUTE,
        session.origin === "internal" ? session.kind : "external",
      );
    } else {
      root.removeAttribute(ACTIVE_ATTRIBUTE);
    }
  }
  notify(sessionListeners);
};

/**
 * Start the running drag. The stale-session check (`onMouseMove`) listens only
 * while there is a drag to go stale: mouse events never reach it mid-drag, so
 * at rest it would only run on every move of the app for nothing.
 */
const beginSession = (next: ActiveDrag) => {
  if (!active) root?.ownerDocument.addEventListener("mousemove", onMouseMove);
  active = next;
};

/**
 * `event` is the `dragend` when that is what ended it — the one ending that
 * tells the source where its drag went. Both the source and the document
 * listen for it; the first to run takes the drag, so `onEnd` fires once.
 */
const endSession = (event?: Event) => {
  if (!active && !published && overNodes.length === 0) {
    return;
  }
  const ended = active;
  const internal = ended?.session.origin === "internal" ? ended.session : null;
  if (internal) {
    internal.source.removeAttribute(DRAGGING_ATTRIBUTE);
    internal.source.removeEventListener("dragend", endSession);
  }
  if (ended) root?.ownerDocument.removeEventListener("mousemove", onMouseMove);
  active = null;
  cached = null;
  setOver([]);
  publish();

  if (internal && ended?.config?.onEnd && event?.type === "dragend") {
    const dropEffect = (event as DragEvent).dataTransfer?.dropEffect ?? "none";
    ended.config.onEnd({ dropEffect, leftWindow: ended.leftWindow }, internal.data);
  }
};

const sameTypes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((type, index) => type === b[index]);

/** The session for an event that is not ours to have started. */
const ensureSession = (event: DragEvent): DragSession => {
  const session = active?.session;
  if (session?.origin === "internal") {
    return session;
  }
  const types = Array.from(event.dataTransfer?.types ?? []);
  if (!session || !sameTypes(session.types, types)) {
    beginSession({ session: { origin: "external", types }, leftWindow: false });
    publish();
  }
  return active!.session;
};

/**
 * Files nobody here wants: let go, the browser would navigate the window to
 * them — unless somebody outside the engine has already claimed the event.
 */
const preventFileNavigation = (event: DragEvent, current: DragSession) => {
  if (
    current.origin === "external" &&
    current.types.includes(FILES_TYPE) &&
    !event.defaultPrevented
  ) {
    event.preventDefault();
    if (event.type === "dragover" && event.dataTransfer) {
      event.dataTransfer.dropEffect = "none";
    }
  }
};

const onDragStart = (event: DragEvent) => {
  const origin = elementOf(event.target);
  if (!origin || isEditable(origin)) {
    return;
  }
  // The element the browser is dragging. A natively draggable element inside
  // one of our sources (a dockview tab, a hand-rolled list) is its own drag.
  // Links and images are draggable without the attribute, and those we take.
  const dragged = origin.closest<HTMLElement>("[draggable='true']");
  const record = dragged ? sources.get(dragged) : undefined;
  if (!dragged || !record) {
    return;
  }

  const config = record.getConfig();
  if (config.canDrag && !config.canDrag()) {
    event.preventDefault();
    return;
  }

  const data = config.getData();
  const transfer = event.dataTransfer;
  if (transfer) {
    // A link inside the card brings its own url; ours replaces it.
    transfer.clearData();
    for (const [type, value] of Object.entries(config.getExternalData?.() ?? {})) {
      transfer.setData(type, value);
    }
    transfer.effectAllowed = "all";
    const rect = dragged.getBoundingClientRect();
    const grab = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const preview = config.preview?.({ data, node: dragged, grab });
    if (preview) {
      // It has to be in the document, and rendered, to be photographed; off
      // to the side is rendered enough.
      const { element } = preview;
      element.style.position = "fixed";
      element.style.top = "0";
      element.style.left = "-10000px";
      element.style.pointerEvents = "none";
      dragged.ownerDocument.body.appendChild(element);
      transfer.setDragImage(element, preview.x, preview.y);
      defer(() => element.remove());
    } else if (origin !== dragged && typeof transfer.setDragImage === "function") {
      // Started on a link or an image: show the card, not the url bubble.
      transfer.setDragImage(dragged, grab.x, grab.y);
    }
  }

  const started: InternalDragSession = {
    origin: "internal",
    kind: config.kind,
    data,
    modifiers: {
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    },
    source: dragged,
  };
  beginSession({ session: started, config, leftWindow: false });
  // A source that unmounts mid-drag (its list refetched) is detached by the
  // time `dragend` fires, so the event never reaches the document.
  dragged.addEventListener("dragend", endSession);

  defer(() => {
    if (active?.session !== started) return;
    dragged.setAttribute(DRAGGING_ATTRIBUTE, "true");
    publish();
  });
};

const onDragOver = (event: DragEvent) => {
  const current = ensureSession(event);
  // Back in the window, if it had left.
  active!.leftWindow = false;

  const { claimant, over } = resolve(event.target, current);
  setOver(over);

  if (claimant) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = current.origin === "internal" ? "move" : "copy";
    }
    claimant.config.onMove?.({ clientX: event.clientX, clientY: event.clientY }, current);
    return;
  }

  if (over.length > 0) {
    // Only hover-only targets: nothing will take the drop, but resting here
    // is the point (it is about to open a tab), so the cursor must not say no.
    event.preventDefault();
    return;
  }

  // Nobody wants it.
  preventFileNavigation(event, current);
};

const onDragLeave = (event: DragEvent) => {
  // Chromium names the element being entered; none means the drag has left
  // the window (or was cancelled over it).
  if (event.relatedTarget) return;

  // Our own drag may come back; somebody else's is over as far as we can
  // ever know.
  if (active?.session.origin === "external") {
    endSession();
  } else {
    if (active) active.leftWindow = true;
    setOver([]);
  }
};

const readPayload = (current: DragSession, transfer: DataTransfer | null): DropPayload => {
  if (current.origin === "internal") {
    return current;
  }
  const data: Record<string, string> = {};
  for (const type of current.types) {
    if (type === FILES_TYPE) continue;
    const value = transfer?.getData(type);
    if (value) data[type] = value;
  }
  return { ...current, data, files: Array.from(transfer?.files ?? []) };
};

const onDrop = (event: DragEvent) => {
  const current = ensureSession(event);

  const { claimant } = resolve(event.target, current);
  if (!claimant) {
    preventFileNavigation(event, current);
    endSession();
    return;
  }

  event.preventDefault();
  const payload = readPayload(current, event.dataTransfer);
  endSession();
  claimant.config.onDrop?.(payload, { clientX: event.clientX, clientY: event.clientY });
};

// Mouse events are suppressed for the length of a native drag, so a move with
// no button held means whatever drag we think is running has ended without
// telling us (cancelled with Escape over another window, say).
function onMouseMove(event: MouseEvent) {
  if (active && event.buttons === 0) {
    endSession();
  }
}

let installs = 0;

/** Listen on `doc`. Idempotent; returns the matching uninstall. */
export const installDndEngine = (doc: Document = document) => {
  installs += 1;
  if (installs === 1) {
    root = doc.documentElement;
    doc.addEventListener("dragstart", onDragStart);
    doc.addEventListener("dragenter", onDragOver);
    doc.addEventListener("dragover", onDragOver);
    doc.addEventListener("dragleave", onDragLeave);
    doc.addEventListener("drop", onDrop);
    doc.addEventListener("dragend", endSession);
  }

  let installed = true;
  return () => {
    if (!installed) return;
    installed = false;
    installs -= 1;
    if (installs > 0) return;
    endSession();
    doc.removeEventListener("dragstart", onDragStart);
    doc.removeEventListener("dragenter", onDragOver);
    doc.removeEventListener("dragover", onDragOver);
    doc.removeEventListener("dragleave", onDragLeave);
    doc.removeEventListener("drop", onDrop);
    doc.removeEventListener("dragend", endSession);
    root = null;
  };
};

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

export type DragModifiers = {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

/** A drag that began on one of our own sources, in this window. */
export type InternalDragSession = {
  origin: "internal";
  kind: string;
  data: unknown;
  /** The keys held when the drag began. */
  modifiers: DragModifiers;
  source: HTMLElement;
};

/**
 * A drag that began anywhere else: the OS, another app, another window of
 * ours, or a natively draggable element we do not manage. Only the `types`
 * are known while it hovers — the browser withholds the data until the drop.
 */
export type ExternalDragSession = {
  origin: "external";
  types: readonly string[];
};

export type DragSession = InternalDragSession | ExternalDragSession;

export type ExternalDropPayload = ExternalDragSession & {
  /** Every string entry of the `dataTransfer`, by type. */
  data: Record<string, string>;
  /** The original `File` objects, so `window.api.getFilePath` works on them. */
  files: File[];
};

export type DropPayload = InternalDragSession | ExternalDropPayload;

export type DragSourceConfig = {
  kind: string;
  getData: () => unknown;
  /**
   * What the drag looks like from outside this window: `dataTransfer` entries
   * by type. Another window of ours reads these back on drop.
   */
  getExternalData?: () => Record<string, string>;
  canDrag?: () => boolean;
  /**
   * What follows the pointer, in place of a picture of the node itself: a
   * stack for a drag of several things, say. A plain element, built for the
   * occasion; the browser takes a picture of it and it is gone a frame later.
   * `null` leaves the browser's own picture of the node.
   */
  preview?: (context: DragPreviewContext) => DragPreview | null;
};

export type DragPreviewContext = {
  data: unknown;
  /** The node being dragged. */
  node: HTMLElement;
  /** Where in the node the pointer took hold, from its top left. */
  grab: { x: number; y: number };
};

export type DragPreview = {
  element: HTMLElement;
  /** Where in `element` the pointer holds it, from its top left. */
  x: number;
  y: number;
};

/** Where the pointer is, in viewport coordinates. */
export type DragPoint = { clientX: number; clientY: number };

export type DropTargetConfig = {
  accepts: (session: DragSession) => boolean;
  onDrop?: (payload: DropPayload, point: DragPoint) => void;
  /**
   * The drag moved while this target held the claim. For a target that cares
   * where on itself the drop would land (a sortable row); fires often.
   */
  onMove?: (point: DragPoint, session: DragSession) => void;
  /** Marked while hovered, but never claims the drop. */
  hoverOnly?: boolean;
};

export type DragSourceHandle = {
  /** A stable ref callback. */
  attach: (node: HTMLElement | null) => void;
};

export type DropTargetHandle = {
  /** A stable ref callback. */
  attach: (node: HTMLElement | null) => void;
  subscribe: (listener: () => void) => () => void;
  isOver: () => boolean;
};

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

/** The drag as the event handlers see it: set the instant it begins. */
let session: DragSession | null = null;
/**
 * The drag as subscribers see it. It trails `session` by a frame at the start
 * of an internal drag: Chromium takes the drag image after `dragstart`, and
 * cancels the drag outright if the source moves under it, so nothing may
 * restyle or re-lay-out the page until that has happened.
 */
let published: DragSession | null = null;
let overNodes: HTMLElement[] = [];
let root: HTMLElement | null = null;
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

/** Walk outwards from the event target; innermost accepting target claims. */
const resolve = (target: EventTarget | null, current: DragSession): Resolution => {
  const selector = `[${DROP_TARGET_ATTRIBUTE}]`;
  let claimant: Resolution["claimant"] = null;
  const hovered: HTMLElement[] = [];

  let node = elementOf(target)?.closest<HTMLElement>(selector) ?? null;
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

const endSession = () => {
  if (!session && !published && overNodes.length === 0) {
    return;
  }
  if (session?.origin === "internal") {
    session.source.removeAttribute(DRAGGING_ATTRIBUTE);
    session.source.removeEventListener("dragend", endSession);
  }
  session = null;
  setOver([]);
  publish();
};

const sameTypes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((type, index) => type === b[index]);

/** The session for an event that is not ours to have started. */
const ensureSession = (event: DragEvent): DragSession | null => {
  if (session?.origin === "internal") {
    return session;
  }
  const types = Array.from(event.dataTransfer?.types ?? []);
  if (!session || !sameTypes(session.types, types)) {
    session = { origin: "external", types };
    publish();
  }
  return session;
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
  session = started;
  // A source that unmounts mid-drag (its list refetched) is detached by the
  // time `dragend` fires, so the event never reaches the document.
  dragged.addEventListener("dragend", endSession);

  defer(() => {
    if (session !== started) return;
    dragged.setAttribute(DRAGGING_ATTRIBUTE, "true");
    publish();
  });
};

const onDragOver = (event: DragEvent) => {
  const current = ensureSession(event);
  if (!current) return;

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

  // Nobody wants it. A file let go here would navigate the window to it —
  // unless somebody outside the engine has already claimed the event.
  if (
    current.origin === "external" &&
    current.types.includes(FILES_TYPE) &&
    !event.defaultPrevented
  ) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "none";
    }
  }
};

const onDragLeave = (event: DragEvent) => {
  // Chromium names the element being entered; none means the drag has left
  // the window (or was cancelled over it).
  if (event.relatedTarget) return;

  // Our own drag may come back; somebody else's is over as far as we can
  // ever know.
  if (session?.origin === "external") {
    endSession();
  } else {
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
  if (!current) return;

  const { claimant } = resolve(event.target, current);
  if (!claimant) {
    if (
      current.origin === "external" &&
      current.types.includes(FILES_TYPE) &&
      !event.defaultPrevented
    ) {
      event.preventDefault();
    }
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
const onMouseMove = (event: MouseEvent) => {
  if (session && event.buttons === 0) {
    endSession();
  }
};

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
    doc.addEventListener("mousemove", onMouseMove);
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
    doc.removeEventListener("mousemove", onMouseMove);
    root = null;
  };
};

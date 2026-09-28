/**
 * The engine's public shapes. Kept apart from the runtime in `engine.ts`,
 * which re-exports them, so importing a type never means reading the engine.
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
  /**
   * The drag ended without a drop in this window: let go somewhere else
   * (another window, another app, the desktop) or cancelled. Not called for a
   * drop one of our targets took — that target's `onDrop` is the ending.
   */
  onEnd?: (info: DragEndInfo, data: unknown) => void;
};

export type DragEndInfo = {
  /**
   * What the place it was let go said: `"none"` when nothing took it —
   * cancelled, or dropped where nobody wanted it.
   */
  dropEffect: DataTransfer["dropEffect"];
  /** Whether the pointer was outside this window when the drag ended. */
  leftWindow: boolean;
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

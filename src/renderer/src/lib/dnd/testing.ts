/**
 * Drive the dnd engine from a test. jsdom has neither `DragEvent` nor
 * `DataTransfer`, and the engine asks for neither by name: a plain bubbling
 * event carrying a `dataTransfer` is all it reads.
 */

export class FakeDataTransfer {
  effectAllowed = "uninitialized";
  dropEffect = "none";
  files: File[] = [];
  private entries = new Map<string, string>();

  constructor(init: { data?: Record<string, string>; files?: File[] } = {}) {
    for (const [type, value] of Object.entries(init.data ?? {})) {
      this.entries.set(type, value);
    }
    this.files = init.files ?? [];
  }

  get types(): string[] {
    return [...this.entries.keys(), ...(this.files.length > 0 ? ["Files"] : [])];
  }

  setData(type: string, value: string) {
    this.entries.set(type, value);
  }

  getData(type: string) {
    return this.entries.get(type) ?? "";
  }

  clearData() {
    this.entries.clear();
  }

  dragImage: Element | null = null;
  dragImageOffset: { x: number; y: number } | null = null;

  setDragImage(image: Element, x: number, y: number) {
    this.dragImage = image;
    this.dragImageOffset = { x, y };
  }
}

export type DragEventType =
  | "dragstart"
  | "dragenter"
  | "dragover"
  | "dragleave"
  | "drop"
  | "dragend";

export type FireDragInit = {
  dataTransfer?: FakeDataTransfer;
  relatedTarget?: EventTarget | null;
  ctrlKey?: boolean;
  clientX?: number;
  clientY?: number;
};

/** Dispatch one drag event on `node`; returns the event, to inspect `defaultPrevented`. */
export const fireDrag = (
  node: EventTarget,
  type: DragEventType,
  init: FireDragInit = {},
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    dataTransfer: { value: init.dataTransfer ?? new FakeDataTransfer() },
    relatedTarget: { value: init.relatedTarget ?? null },
    ctrlKey: { value: init.ctrlKey ?? false },
    shiftKey: { value: false },
    altKey: { value: false },
    metaKey: { value: false },
    clientX: { value: init.clientX ?? 0 },
    clientY: { value: init.clientY ?? 0 },
  });
  node.dispatchEvent(event);
  return event;
};

/**
 * A whole drag from `source`, resting on `target`. The one `dataTransfer`
 * travels with it, as in the browser. Returns the ways it can end.
 */
export const dragOnto = (source: Element, target: Element, init: FireDragInit = {}) => {
  const dataTransfer = init.dataTransfer ?? new FakeDataTransfer();
  fireDrag(source, "dragstart", { ...init, dataTransfer });
  fireDrag(target, "dragover", { ...init, dataTransfer });
  return {
    dataTransfer,
    drop: () => {
      const event = fireDrag(target, "drop", { ...init, dataTransfer });
      fireDrag(source, "dragend", { ...init, dataTransfer });
      return event;
    },
    cancel: () => fireDrag(source, "dragend", { ...init, dataTransfer }),
  };
};

/**
 * Put dictated text where the caret is.
 *
 * One primitive for every target — the palette's cmdk input, a port form
 * field, the chat box, a contenteditable — because they are all the same
 * case: an element that owns a caret and whose React state listens to the
 * `input` event. `execCommand("insertText")` is what a paste does, so it
 * goes through the browser's own editing path: React's value tracker sees it
 * and `onChange` fires, undo works, and contenteditables place it in the
 * right node. The fallback for the day Chromium removes it splices the value
 * through the native setter and dispatches `input` by hand.
 */

const EDITABLE_INPUT_TYPES = new Set(["text", "search", "url", "email", "tel", "password", "number", ""]);

export const isEditableElement = (element: Element | null | undefined): element is HTMLElement => {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLTextAreaElement) return !element.disabled && !element.readOnly;
  if (element instanceof HTMLInputElement) {
    return !element.disabled && !element.readOnly && EDITABLE_INPUT_TYPES.has(element.type);
  }
  // jsdom leaves `isContentEditable` undefined; the attribute is the fallback.
  return element.isContentEditable === true || element.getAttribute("contenteditable") === "true";
};

const isTextControl = (element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement =>
  element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;

/**
 * Whether a space is needed before `text`: the caret sits right after a
 * non-space character. Unknown (contenteditable) → assume it is.
 */
const needsLeadingSpace = (element: HTMLElement): boolean => {
  if (isTextControl(element)) {
    const at = element.selectionStart ?? element.value.length;
    if (at === 0) return false;
    return !/\s/.test(element.value.charAt(at - 1));
  }
  const selection = element.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return element.textContent?.trim().length !== 0;
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    const before = (node.textContent ?? "").slice(0, range.startOffset);
    return before.length > 0 && !/\s$/.test(before);
  }
  return (element.textContent ?? "").trim().length > 0;
};

const spliceThroughSetter = (element: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const next = element.value.slice(0, start) + text + element.value.slice(end);
  // React tracks `value` on the instance; the prototype setter bypasses it so
  // the following `input` event is seen as a real change.
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, next);
  else element.value = next;
  const caret = start + text.length;
  try {
    element.setSelectionRange(caret, caret);
  } catch {
    // Some input types refuse selection ranges.
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * Insert `text` at the caret of `element`, with a separating space when the
 * caret follows a word. Focuses the element first. Returns false when the
 * element cannot take text.
 */
export const insertText = (element: HTMLElement, text: string): boolean => {
  if (!isEditableElement(element) || !text) return false;
  const doc = element.ownerDocument;
  if (doc.activeElement !== element) element.focus();

  const payload = (needsLeadingSpace(element) ? " " : "") + text;

  let inserted = false;
  try {
    inserted = typeof doc.execCommand === "function" && doc.execCommand("insertText", false, payload);
  } catch {
    inserted = false;
  }
  if (inserted) return true;

  if (isTextControl(element)) {
    spliceThroughSetter(element, payload);
    return true;
  }

  const selection = doc.getSelection();
  if (!selection) return false;
  if (selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
    const range = doc.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = doc.createTextNode(payload);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
};

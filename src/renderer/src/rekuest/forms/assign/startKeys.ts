/**
 * What starts a run from the assign form's keyboard. A browser submits a form when Enter is
 * pressed in one of its fields; here that would start the action while someone is still filling
 * it in. Only the form's own button starts it, and Ctrl/Cmd+Enter, which is that button's
 * shortcut (and keeps the dialog open). A field of a port blok keeps every Enter of its own (bsx).
 */

/** Input types a browser activates on Enter, as a click: those are buttons, not fields. */
const ACTIVATED = new Set(["submit", "button", "image", "reset"]);

/** Whether `event`, an Enter in the form, would start the run only because a field was focused. */
export const submitsOnlyByAccident = (event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  target: EventTarget | null;
  nativeEvent?: { isComposing?: boolean };
}): boolean =>
  event.key === "Enter" &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.nativeEvent?.isComposing &&
  event.target instanceof HTMLInputElement &&
  !ACTIVATED.has(event.target.type);

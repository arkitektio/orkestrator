import { useSyncExternalStore } from "react";

/**
 * Process-wide tracker for the keyboard modifier state (ctrl / shift / alt /
 * meta).
 *
 * `usePerformAction` used to attach five `window` listeners per action row to
 * know which modifiers were held when an action fired. Every rendered row paid
 * for its own listeners even though the answer is global. This module
 * subscribes to `window` exactly once, on first use, and keeps the current
 * state in a module variable so any number of consumers can read it for free
 * via `getModifierState()`, or render from it via `useModifierState()`.
 */
export type ModifierState = {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

type Listener = () => void;

const NONE: ModifierState = Object.freeze({
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
});

let current: ModifierState = NONE;
let attached = false;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

const isSame = (a: ModifierState, b: ModifierState) =>
  a.ctrlKey === b.ctrlKey &&
  a.shiftKey === b.shiftKey &&
  a.altKey === b.altKey &&
  a.metaKey === b.metaKey;

const set = (next: ModifierState) => {
  if (isSame(current, next)) {
    return;
  }
  current = next;
  emit();
};

const updateFromEvent = (event: KeyboardEvent | MouseEvent) => {
  set({
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  });
};

const reset = () => set(NONE);

// Capture phase so a handler further down that stops propagation cannot hide
// a modifier change from us; passive since we never preventDefault.
const LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

const attach = () => {
  if (attached || typeof window === "undefined") {
    return;
  }
  attached = true;
  window.addEventListener("keydown", updateFromEvent, LISTENER_OPTIONS);
  window.addEventListener("keyup", updateFromEvent, LISTENER_OPTIONS);
  window.addEventListener("mousedown", updateFromEvent, LISTENER_OPTIONS);
  window.addEventListener("mouseup", updateFromEvent, LISTENER_OPTIONS);
  window.addEventListener("blur", reset);
};

/**
 * Tear the window listeners down and forget the current state. Only needed by
 * tests; the app keeps the single subscription alive for its whole lifetime.
 */
export const detachModifierTracker = () => {
  if (attached && typeof window !== "undefined") {
    window.removeEventListener("keydown", updateFromEvent, LISTENER_OPTIONS);
    window.removeEventListener("keyup", updateFromEvent, LISTENER_OPTIONS);
    window.removeEventListener("mousedown", updateFromEvent, LISTENER_OPTIONS);
    window.removeEventListener("mouseup", updateFromEvent, LISTENER_OPTIONS);
    window.removeEventListener("blur", reset);
  }
  attached = false;
  current = NONE;
};

/** The modifiers currently held, as of the last key / mouse event. */
export const getModifierState = (): ModifierState => {
  attach();
  return current;
};

const subscribe = (listener: Listener) => {
  attach();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => current;
const getServerSnapshot = () => NONE;

/** Render from the live modifier state (re-renders only when it changes). */
export const useModifierState = (): ModifierState =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

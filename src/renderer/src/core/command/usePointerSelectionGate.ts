import { useCallback, useRef, useState } from "react";

/**
 * Keeps the mouse from fighting the arrow keys.
 *
 * cmdk selects the row under the pointer on every `pointermove`. Chromium
 * also fires one when content SCROLLS under a resting cursor — and arrowing
 * down scrolls the list (`scrollIntoView`) — so with the mouse parked over the
 * palette, each arrow press moved the selection and the next synthetic move
 * snapped it straight back to the row under the cursor.
 *
 * So: a navigation key hands selection to the keyboard (pointer selection
 * off), and only a REAL mouse movement — the cursor's position changed, which
 * a scroll-induced event never does — hands it back.
 */
export const usePointerSelectionGate = () => {
  const [keyboard, setKeyboard] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (isNavigationKey(event)) setKeyboard(true);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const previous = last.current;
    last.current = { x: event.clientX, y: event.clientY };
    if (hasMoved(previous, last.current)) setKeyboard(false);
  }, []);

  return { disablePointerSelection: keyboard, onKeyDown, onPointerMove };
};

/** The keys cmdk moves the selection with (incl. its ⌃N/⌃P and ⌃J/⌃K binds). */
export const isNavigationKey = (event: {
  key: string;
  ctrlKey?: boolean;
}): boolean => {
  switch (event.key) {
    case "ArrowDown":
    case "ArrowUp":
    case "Home":
    case "End":
    case "PageDown":
    case "PageUp":
      return true;
    case "n":
    case "p":
    case "j":
    case "k":
      return event.ctrlKey === true;
    default:
      return false;
  }
};

/** A real move changes the position; a scroll-induced one repeats it. */
export const hasMoved = (
  previous: { x: number; y: number } | null,
  next: { x: number; y: number },
): boolean => previous !== null && (previous.x !== next.x || previous.y !== next.y);

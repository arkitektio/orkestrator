import React from "react";

/**
 * Keeps the first item highlighted while the results settle, so Enter runs
 * the top match.
 *
 * cmdk only picks the first item on the keystroke itself, but the sections
 * fetch their items asynchronously, so its pick lands on the stale list and
 * sticks. Until the user moves the highlight themselves (arrow keys /
 * pointer), every change in `signal` re-selects the first item. The signal is
 * the menu's section summary (revision + count) and the filter — one re-pin
 * per landed section, where a subtree `MutationObserver` used to fire on
 * every attribute change.
 */
export const useFirstItemSelection = (signal: readonly unknown[]) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const pinned = React.useRef(true);

  const selectFirst = React.useCallback(() => {
    const first = rootRef.current?.querySelector(
      '[cmdk-item=""]:not([aria-disabled="true"])',
    );
    const next = first?.getAttribute("data-value") ?? "";
    setValue((current) => (current === next ? current : next));
  }, []);

  // Layout effect: the sections report in layout effects too, so this runs in
  // the commit that put the new rows in the DOM.
  React.useLayoutEffect(() => {
    if (pinned.current) selectFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, signal);

  const repin = React.useCallback(() => {
    pinned.current = true;
    selectFirst();
  }, [selectFirst]);

  const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
      pinned.current = false;
    }
  }, []);

  const onPointerMove = React.useCallback(() => {
    pinned.current = false;
  }, []);

  return { rootRef, inputRef, value, setValue, repin, onKeyDown, onPointerMove };
};

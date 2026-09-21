/**
 * Number keys for shortcuts, through one window listener.
 *
 * Every shortcut row used to install its own `keydown` listener; a menu with a
 * dozen shortcuts dispatched every keystroke to a dozen handlers. One map, one
 * listener, installed while anything is bound. The last bind for a key wins.
 *
 * As before, a digit typed into the search input also fires the shortcut —
 * a `target instanceof HTMLInputElement` guard here would change that.
 */

const binds = new Map<string, () => void>();
let listening = false;

const onKeyDown = (event: KeyboardEvent) => {
  const run = binds.get(event.key);
  if (!run) return;
  event.preventDefault();
  run();
};

export const bindShortcutKey = (key: string, run: () => void): (() => void) => {
  binds.set(key, run);
  if (!listening) {
    window.addEventListener("keydown", onKeyDown);
    listening = true;
  }
  return () => {
    if (binds.get(key) === run) binds.delete(key);
    if (binds.size === 0 && listening) {
      window.removeEventListener("keydown", onKeyDown);
      listening = false;
    }
  };
};

/** For tests. */
export const boundShortcutKeys = () => [...binds.keys()];

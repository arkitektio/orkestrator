/**
 * "A login finished": the callback page (in a tab) tells a dialog that is
 * still waiting on the same `state`, so the dialog can close. In-window
 * only; nothing is stored.
 */
type Listener = (state: string, account: { id: string; emailAddress: string }) => void;

const listeners = new Set<Listener>();

export const onOAuthLinked = (listener: Listener) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export const announceOAuthLinked: Listener = (state, account) => {
  for (const listener of listeners) listener(state, account);
};

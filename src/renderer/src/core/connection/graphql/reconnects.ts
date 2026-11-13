/**
 * A service's subscription socket came back.
 *
 * A subscription only carries what is published while its socket is up: after a
 * drop (the network, a sleep, a socket closed to take a new token) graphql-ws
 * subscribes again, and whatever happened in between was never sent. The
 * service builder says so here, keyed by the client the socket belongs to; it
 * refetches that client's active queries itself, and a module that keeps state
 * outside the cache (rekuest's locally tracked tasks) catches up through
 * `onSocketReconnect`.
 */
type Listener = () => void;

const listeners = new WeakMap<object, Set<Listener>>();

/** Hear when `client`'s subscription socket reconnects. Returns the unsubscribe. */
export const onSocketReconnect = (client: object, listener: Listener): (() => void) => {
  let set = listeners.get(client);
  if (!set) {
    set = new Set();
    listeners.set(client, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
  };
};

/** The builder's side: `client`'s socket reconnected. A listener that throws does not stop the others. */
export const emitSocketReconnect = (client: object) => {
  for (const listener of [...(listeners.get(client) ?? [])]) {
    try {
      listener();
    } catch (e) {
      console.warn("[arkitekt] a socket reconnect listener failed:", e);
    }
  }
};

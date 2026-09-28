/**
 * Stable scalar identities for immutable store objects.
 *
 * The stores replace objects immutably (zustand + immer), so "did this thing
 * change" is an identity question — but an identity cannot sit in a React
 * dependency array or a string key without re-rendering per array churn.
 * `identityOf` turns an object reference into a stable small integer: same
 * object → same number, new object → new number. That lets a selector return
 * a JOINED STRING over the identities of exactly the objects it cares about
 * (P9c/P17: subscribe to scalars, never objects), with the arrays themselves
 * read via `getState()` inside the memo the key guards.
 *
 * Generalized from `BrickVolumeLayer`'s `layerIdentityOf`, which pioneered
 * the pattern for merge-group membership keys.
 */

const identities = new WeakMap<object, number>();
let nextIdentity = 1;

/** A stable integer for `obj`'s identity; 0 for null/undefined. */
export const identityOf = (obj: object | null | undefined): number => {
  if (obj == null) return 0;
  let id = identities.get(obj);
  if (id === undefined) {
    id = nextIdentity++;
    identities.set(obj, id);
  }
  return id;
};

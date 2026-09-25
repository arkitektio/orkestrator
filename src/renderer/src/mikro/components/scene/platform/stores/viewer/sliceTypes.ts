/**
 * What a slice sees of the store.
 *
 * A slice shares ONE store and ONE `set` with every other slice, so a write
 * from any of them is exactly as atomic as it was when this was a single
 * object literal. These types are narrowed to the slice's own members on
 * purpose: no platform slice reads across a boundary today (only two `get()`
 * calls exist in the whole store, both within their own slice), and typing
 * them narrowly keeps it that way — widening one is then a visible decision
 * rather than an accident.
 */
export type SliceSet<S> = (
  partial: Partial<S> | ((state: S) => Partial<S>),
) => void;
export type SliceGet<S> = () => S;

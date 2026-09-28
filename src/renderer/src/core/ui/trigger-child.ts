import { Children, isValidElement, type ReactNode } from "react";

const BUTTON_LIKE = Symbol.for("orkestrator.buttonLike");

/**
 * Declare that a component draws a `<button>` and hands its props and ref on
 * to it, so a trigger wrapping it can take it over (`asChild`) instead of
 * drawing a `<button>` of its own around it.
 */
export const markButtonLike = <T extends object>(component: T): T => {
  (component as Record<symbol, unknown>)[BUTTON_LIKE] = true;
  return component;
};

/**
 * `asChild` for a trigger wrapper: what the caller said, or — when it said
 * nothing — whether the only child already is a button. A trigger drawn around
 * a `<Button>` would nest one button in another.
 *
 * Only marked components (and a plain `<button>`) count. `asChild` over a
 * component that drops its props would leave the trigger unable to open.
 */
export const resolveTriggerAsChild = (
  asChild: boolean | undefined,
  children: ReactNode,
): boolean => {
  if (asChild !== undefined) return asChild;
  if (Children.count(children) !== 1 || !isValidElement(children)) return false;
  const type: unknown = children.type;
  if (type === "button") return true;
  return (
    (typeof type === "function" || (typeof type === "object" && type !== null)) &&
    (type as Record<symbol, unknown>)[BUTTON_LIKE] === true
  );
};

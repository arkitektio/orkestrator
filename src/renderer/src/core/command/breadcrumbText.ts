import { isValidElement } from "react";

/**
 * The plain text of a breadcrumb, or `undefined` if it has none.
 *
 * `use-react-router-breadcrumbs` never hands back a bare string: with no route
 * config it wraps the humanised path segment in a `<span>`, and a route's own
 * crumb is whatever component it declared (an entity's name, still loading).
 * The chrome wants text — the pill's trail, a tab's label — so this takes a
 * string as it is, unwraps the library's default span, and gives up on
 * anything else rather than render a component where text belongs.
 */
export const breadcrumbText = (crumb: unknown): string | undefined => {
  if (typeof crumb === "string") return crumb || undefined;
  if (isValidElement<{ children?: unknown }>(crumb)) {
    const child = crumb.props.children;
    if (typeof child === "string") return child || undefined;
  }
  return undefined;
};

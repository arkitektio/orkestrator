import { Children, Fragment, cloneElement, isValidElement, type ReactNode } from "react";

/**
 * Depth-first flatten of arrays and fragments down to plain elements.
 *
 * `Children.toArray` keys each level on its own (`.0`, `.1`, …), so two
 * fragments would both hand back a `.0`. An element lifted out of a fragment
 * gets the fragment's key as a prefix to stay unique among its new siblings.
 */
export const flattenChildren = (children: ReactNode, prefix = ""): ReactNode[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [child];
    if (child.type === Fragment) {
      return flattenChildren(
        (child.props as { children?: ReactNode }).children,
        `${prefix}${child.key}/`,
      );
    }
    return prefix ? [cloneElement(child, { key: `${prefix}${child.key}` })] : [child];
  });

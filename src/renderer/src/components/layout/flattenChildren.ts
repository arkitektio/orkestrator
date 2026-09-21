import { Children, Fragment, isValidElement, type ReactNode } from "react";

/** Depth-first flatten of arrays and fragments down to plain elements. */
export const flattenChildren = (children: ReactNode): ReactNode[] =>
  Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment
      ? flattenChildren((child.props as { children?: ReactNode }).children)
      : [child],
  );

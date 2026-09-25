import type React from "react";

import { smartMenuWrappers } from "../hostRegistries";
import type { SmartMenuWrapperProps } from "./section";

/**
 * Every module's menu wrapper around the menu or palette (outermost first),
 * e.g. rekuest's "Run on" submenu. Modules register them as `menuWrappers`.
 */
export const SmartMenuWrappers = ({ context, returnFocusTo, children }: SmartMenuWrapperProps) =>
  smartMenuWrappers().reduceRight<React.ReactNode>(
    (inner, Wrapper) => (
      <Wrapper context={context} returnFocusTo={returnFocusTo}>
        {inner}
      </Wrapper>
    ),
    children,
  ) as React.ReactElement;

import React, { Children, useCallback } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSelectionContainer, Box } from "@air/react-drag-to-select";

export type IResponsiveGridProps = {
  children?: React.ReactNode;
  className?: string;
};

const ResponsiveList: React.FC<IResponsiveGridProps> = ({
  children,
  className,
}) => {
  const [parent] = useAutoAnimate<HTMLDivElement>(/* optional config */);

  return (
    <div
      className={className || "pt-2 pb-2 pr-2 flex flex-col gap-4"}
      data-enableselect="true"
      ref={parent}
    >
      {children}
    </div>
  );
};

export { ResponsiveList };

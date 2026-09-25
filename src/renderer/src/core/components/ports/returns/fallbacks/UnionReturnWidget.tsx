import { NotImplementedYet } from "@/core/layout/fallbacks/NotImplemented";
import { ReturnWidgetProps } from "@/core/lib/ports/types";
import React from "react";

const UnionReturnWidget: React.FC<ReturnWidgetProps> = () => {
  return (
    <div className="text-foreground">
      <NotImplementedYet />
    </div>
  );
};

export { UnionReturnWidget };

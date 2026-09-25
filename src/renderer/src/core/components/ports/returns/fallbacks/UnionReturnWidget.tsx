import { NotImplementedYet } from "@/core/app/components/fallbacks/NotImplemted";
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

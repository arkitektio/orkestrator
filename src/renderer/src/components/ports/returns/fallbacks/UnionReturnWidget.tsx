import { NotImplementedYet } from "@/app/components/fallbacks/NotImplemted";
import { ReturnWidgetProps } from "@/lib/ports/types";
import React from "react";

const UnionReturnWidget: React.FC<ReturnWidgetProps> = () => {
  return (
    <div className="text-foreground">
      <NotImplementedYet />
    </div>
  );
};

export { UnionReturnWidget };

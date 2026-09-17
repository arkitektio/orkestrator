import { NotImplementedYet } from "@/app/components/fallbacks/NotImplemted";
import { ReturnWidgetProps } from "@/rekuest/widgets/types";
import React from "react";

const UnionReturnWidget: React.FC<ReturnWidgetProps> = () => {
  return (
    <div className="text-foreground">
      <NotImplementedYet />
    </div>
  );
};

export { UnionReturnWidget };

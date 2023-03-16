import React, { Children, useCallback, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSelectionContainer, Box } from "@air/react-drag-to-select";
import { SmartModelProps } from "../../rekuest/selection/SmartModel";
import { notEmpty } from "../../floating/utils";
import { useModelSelector } from "../../rekuest/selection/context";
import { Identifier } from "../../rekuest/postman/mater/mater-context";

export type IResponsiveGridProps = {
  children?: React.ReactNode;
};

const ResponsiveContainerGrid: React.FC<IResponsiveGridProps> = ({
  children,
}) => {
  const [parent] = useAutoAnimate<HTMLDivElement>(/* optional config */);
  const { registerSelectables, unregisterSelectables } = useModelSelector();

  useEffect(() => {
    if (parent.current) {
      const selectables = Array.from<HTMLElement>(
        parent.current.children as unknown as HTMLElement[]
      )
        .map((item) => {
          if (!item.dataset.identifier || !item.dataset.object) {
            return null;
          }
          return {
            selectable: {
              identifier: item.dataset.identifier as Identifier,
              object: item.dataset.object,
            },
            item: item,
          };
        })
        .filter(notEmpty);

      registerSelectables(selectables);

      return () => {
        unregisterSelectables(selectables);
      };
    }
  }, [children]);

  return (
    <div
      className="grid @lg:grid-cols-2 @xl-grid-cols-3 @2xl:grid-cols-4  @3xl:grid-cols-5   @5xl:grid-cols-6 gap-4"
      data-enableselect="true"
      ref={parent}
    >
      {children}
    </div>
  );
};

export { ResponsiveContainerGrid };

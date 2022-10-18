import React, { Children, useCallback, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSelectionContainer, Box } from "@air/react-drag-to-select";
import { SmartModelProps } from "../../arkitekt/selection/SmartModel";
import { notEmpty } from "../../floating/utils";
import { Identifier } from "../../arkitekt/api/scalars";
import { useModelSelector } from "../../arkitekt/selection/context";

export type IResponsiveGridProps = {
  children?: React.ReactNode;
};

const ResponsiveGrid: React.FC<IResponsiveGridProps> = ({ children }) => {
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
      className="pt-2 pb-2 pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 xl:grid-cols-6 gap-4"
      ref={parent}
      onMouseMove={(e) => {
        if (parent.current) {
          const selectables = Array.from<HTMLElement>(
            parent.current.children as unknown as HTMLElement[]
          );

          for (const card of selectables) {
            const rect = card.getBoundingClientRect(),
              x = e.clientX - rect.left,
              y = e.clientY - rect.top;

            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
          }
        }
      }}
    >
      {children}
    </div>
  );
};

export { ResponsiveGrid };

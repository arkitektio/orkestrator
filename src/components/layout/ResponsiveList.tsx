import React, { Children, useCallback, useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSelectionContainer, Box } from "@air/react-drag-to-select";
import { notEmpty } from "../../floating/utils";
import { useModelSelector } from "../../rekuest/selection/context";
import { Identifier } from "../../rekuest/api/scalars";

export type IResponsiveGridProps = {
  children?: React.ReactNode;
  className?: string;
};

const ResponsiveList: React.FC<IResponsiveGridProps> = ({
  children,
  className,
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
      className={className || "pt-2 pb-2 pr-2 flex flex-col gap-4"}
      data-enableselect="true"
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

export { ResponsiveList };

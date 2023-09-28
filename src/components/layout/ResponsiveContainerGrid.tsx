import { useAutoAnimate } from "@formkit/auto-animate/react";
import React, { useEffect } from "react";
import { notEmpty } from "../../floating/utils";
import { Identifier } from "../../rekuest/providers/mater/mater-context";
import { useModelSelector } from "../../rekuest/selection/context";

export type FittingResponsiveGridProps = {
  children?: React.ReactNode;
  fitLength?: number;
};

export const FittingResponsiveContainerGrid: React.FC<
  FittingResponsiveGridProps
> = ({ children, fitLength }) => {
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
              id: item.dataset.object,
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

  let lg_size = fitLength && fitLength < 2 ? fitLength : 2;
  let xl_size = fitLength && fitLength < 3 ? fitLength : 3;
  let xxl_size = fitLength && fitLength < 4 ? fitLength : 4;
  let xxxl_size = fitLength && fitLength < 5 ? fitLength : 5;
  let xxxxl_size = fitLength && fitLength < 6 ? fitLength : 6;

  return (
    <div
      className={`grid @lg:grid-cols-${lg_size} @xl-grid-cols-${xl_size} @2xl:grid-cols-${xxl_size}  @3xl:grid-cols-${xxxl_size}   @5xl:grid-cols-${xxxxl_size} gap-4`}
      data-enableselect="true"
      ref={parent}
    >
      {children}
    </div>
  );
};

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
              id: item.dataset.object,
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

  let lg_size = 2;
  let xl_size = 3;
  let xxl_size = 4;
  let xxxl_size = 5;
  let xxxxl_size = 6;

  return (
    <div
      className={`grid @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4  @3xl:grid-cols-5 @4xl:grid-cols-6 gap-4`}
      data-enableselect="true"
      ref={parent}
    >
      {children}
    </div>
  );
};

export { ResponsiveContainerGrid };

import { cn } from "@/core/util/utils";
import React from "react";
import { useGridMotion } from "./useGridMotion";

export type FittingResponsiveGridProps = {
  children?: React.ReactNode;
  fitLength?: number;
  /**
   * When set, the grid picks a column ladder (`COLUMN_LADDERS`) whose steps
   * keep every card at least this wide, and wraps itself in an `@container` so
   * the steps answer to the grid's **own** width — a grid that only occupies
   * part of a wider layout column packs the columns that space fits.
   *
   * The column count follows the width and nothing else: two items on a wide
   * page take two of four columns, they do not stretch across the row (which
   * `repeat(auto-fit, …)` did). Larger values yield fewer, wider columns — use
   * a small value for lists of scalars and a larger one for complex items.
   */
  minItemWidth?: number;
  className?: string;
};

/**
 * Static column ladders, one per card width, since Tailwind cannot build
 * `@container` classes from a runtime number. Each step is the first container
 * breakpoint at which one more column still leaves every card (gap-4 between)
 * at least `minWidth` wide: n columns need n·min + (n−1)·16 px.
 */
const COLUMN_LADDERS: { minWidth: number; className: string }[] = [
  {
    minWidth: 200,
    className:
      "@md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6",
  },
  {
    minWidth: 240,
    className: "@lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5",
  },
  {
    minWidth: 260,
    className: "@xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4",
  },
  {
    minWidth: 320,
    className: "@2xl:grid-cols-2 @5xl:grid-cols-3",
  },
];

/** The densest ladder whose cards are still at least `minItemWidth` wide. */
const ladderFor = (minItemWidth: number) =>
  (
    COLUMN_LADDERS.find((ladder) => ladder.minWidth >= minItemWidth) ??
    COLUMN_LADDERS[COLUMN_LADDERS.length - 1]
  ).className;

export const ContainerGrid: React.FC<FittingResponsiveGridProps> = ({
  children,
  minItemWidth,
  className,
}) => {
  // Cards enter with `grid-enter` (index.css, CSS only), and slide or fade out
  // through `useGridMotion`, which measures on render and holds nothing else.
  // Deliberately not `@formkit/auto-animate`, which used to do all three here
  // and leaked every page that held a grid: it gives the grid and each card a
  // 2s poll and an IntersectionObserver that capture the element, and its
  // teardown misses the ones started after unmount, so a page left within ~2s
  // stayed in memory, detached, for the life of the window.
  const grid = useGridMotion<HTMLDivElement>();
  if (minItemWidth) {
    return (
      <div className="@container w-full">
        <div
          className={cn("grid-enter relative grid grid-cols-1 gap-4", ladderFor(minItemWidth), className)}
          data-enableselect="true"
          ref={grid}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(`grid-enter relative grid @lg:grid-cols-2 @xl:grid-cols-2 @2xl:grid-cols-4  @3xl:grid-cols-6  @5xl:grid-cols-6 @6xl:grid-cols-8 @7xl:grid-cols-10 @7xl:grid-cols-10 gap-4 `, className)}
      data-enableselect="true"
      ref={grid}
    >
      {children}
    </div>
  );
};

export type IResponsiveGridProps = {
  children?: React.ReactNode;
  className?: string;
};

const ResponsiveContainerGrid: React.FC<IResponsiveGridProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        `grid @lg:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-4  @3xl:grid-cols-5 @4xl:grid-cols-6 @5xl:grid-cols-8  @6xl:grid-cols-10 gap-2`,
        className,
      )}
      data-enableselect="true"
    >
      {children}
    </div>
  );
};

export { ResponsiveContainerGrid };

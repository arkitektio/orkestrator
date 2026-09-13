import { cn } from "@/lib/utils";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import React from "react";

export type FittingResponsiveGridProps = {
  children?: React.ReactNode;
  fitLength?: number;
  /**
   * When set, the grid lays its items out with
   * `repeat(auto-fit, minmax(min(100%, <minItemWidth>px), 1fr))`.
   *
   * This makes the grid responsive to its **own** measured width (rather than
   * to the nearest `@container` ancestor), so a grid that only occupies part of
   * a wider layout column packs the right number of items into the space it
   * actually has. Larger values yield fewer, wider columns — use a small value
   * for lists of scalars and a larger one for lists of complex items.
   */
  minItemWidth?: number;
  className?: string;
};

export const ContainerGrid: React.FC<FittingResponsiveGridProps> = ({
  children,
  minItemWidth,
  className,
}) => {
  // Attach auto-animate exactly once per grid element. It observes child
  // mutations itself; re-calling `autoAnimate()` on every render (the previous
  // `[children]` effect) re-walked every child and stacked observers/intervals.
  const [parent] = useAutoAnimate<HTMLDivElement>({
    // Animation duration in milliseconds (default: 250)
    duration: 240,
    // Easing for motion (default: 'ease-in-out')
    easing: "ease-in-out",
    // When true, this will enable animations even if the user has indicated
    // they don’t want them via prefers-reduced-motion.
    disrespectUserMotionPreference: false,
  });

  if (minItemWidth) {
    return (
      <div
        className={cn("grid gap-4", className)}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}px), 1fr))`,
        }}
        data-enableselect="true"
        ref={parent}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(`grid @lg:grid-cols-2 @xl:grid-cols-2 @2xl:grid-cols-4  @3xl:grid-cols-6  @5xl:grid-cols-6 @6xl:grid-cols-8 @7xl:grid-cols-10 @7xl:grid-cols-10 gap-4 `, className)}
      data-enableselect="true"
      ref={parent}
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

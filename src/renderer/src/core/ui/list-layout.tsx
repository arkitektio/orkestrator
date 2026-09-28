import { cn } from "@/core/util/utils";
import React from "react";
import { ContainerGrid } from "../layout/ContainerGrid";

/**
 * The main container for the list view.
 * Sets up a vertical flex column that takes up full height.
 */
const Root = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col w-full gap-2", className)}
    {...props}
  />
));
Root.displayName = "ListLayout.Root";

/**
 * The top bar containing the Title and Actions.
 * Handles responsive wrapping automatically.
 */
interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: React.ReactNode;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ className, children, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-1 ml-1 font-bold",
        className
      )}
      {...props}
    >
      <div className="flex flex-col space-x-0 ">
        <h3 className="font-light leading-none tracking-tight text-md">
          {children}
        </h3>
      </div>
      {actions && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
);
Header.displayName = "ListLayout.Header";

/**
 * The grid container for list items.
 * Responsive: 1 col mobile -> 2 cols tablet -> 3 cols laptop -> 4 cols desktop.
 *
 * `minItemWidth` opts out of that ladder in favour of `auto-fit`/`minmax`, for
 * lists whose cards need room (a picture, several rows of metadata) and would be
 * unreadable in the default ten-column pack.
 */
const Grid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { minItemWidth?: number }
>(({ className, ...props }, _ref) => (
  <ContainerGrid
    className={cn(
      className
    )}
    {...props}
  />
));
Grid.displayName = "ListLayout.Grid";

/**
 * The footer area, typically used for Pagination.
 * Pushed to the bottom of the container via mt-auto.
 */
const Footer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end py-1 mt-auto", className)}
    {...props}
  />
));
Footer.displayName = "ListLayout.Footer";

export { Footer, Grid, Header, Root };

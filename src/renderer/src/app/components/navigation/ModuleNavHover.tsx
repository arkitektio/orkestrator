import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import React, { Suspense } from "react";

import { MODULE_NAV } from "./moduleNavRegistry";

/**
 * A module's own navigation, on hover over its icon.
 *
 * These links used to sit permanently in the rail (and before that, in a
 * resizable pane of their own beside the page). Both were a standing cost for
 * something you need for a moment: the rail's vertical run is worth more to the
 * pinned routes below, and the links you actually revisit end up pinned anyway.
 *
 * The pane is mounted only while the card is open — `HoverCardContent` does not
 * render its children until then — which matters because a module's pane runs
 * that module's queries on mount. `ready` gates it further: the Apollo client
 * for a service only exists once that service is ready.
 */
export const ModuleNavHover = ({
  moduleKey,
  ready,
  children,
}: {
  moduleKey: string;
  ready: boolean;
  children: React.ReactNode;
}) => {
  const Nav = ready ? MODULE_NAV[moduleKey] : undefined;

  if (!Nav) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={260} closeDelay={160}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-60 max-h-[70vh] overflow-y-auto p-1"
      >
        {/* Null while the module's chunk loads, so the card does not flash an
            empty box at its full height and then reflow. */}
        <Suspense fallback={null}>
          <Nav />
        </Suspense>
      </HoverCardContent>
    </HoverCard>
  );
};

export default ModuleNavHover;

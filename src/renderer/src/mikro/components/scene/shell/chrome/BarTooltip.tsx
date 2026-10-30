import type { ReactElement, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";

/**
 * The hover tooltip of a control-bar button. Opens upward: the bar sits on the
 * bottom edge of the canvas. Wraps the button itself (or its `PopoverTrigger`),
 * and renders no element of its own, so a `ButtonGroup` still sees its buttons.
 */
export const BarTooltip = ({ label, children }: { label: ReactNode; children: ReactElement }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="top" sideOffset={6} className="max-w-64">
      {label}
    </TooltipContent>
  </Tooltip>
);

import { NAV_SPRING_DELAY_MS } from "@/components/ui/link";
import { useSpringLoaded } from "@/lib/dnd/react";
import { cn } from "@/lib/utils";
import { acceptsSmartDrag } from "@/providers/smart/dragPayload";
import React from "react";
import {
  NavLink,
  useNavigate
} from "react-router-dom";

export type PaneLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
};

export const PaneLink = (props: PaneLinkProps) => {
  const navigate = useNavigate();

  const { ref, isOver } = useSpringLoaded({
    accepts: acceptsSmartDrag,
    delayMs: NAV_SPRING_DELAY_MS,
    onFire: () => navigate(props.to),
  });

  return (
    <div ref={ref} className={isOver ? "animate-pulse" : undefined}>
      <NavLink to={props.to}>
        {({ isActive }) => (
          <div className={cn(props.className, isActive ? "text-primary " : "text-foreground")}>
            {props.children}
          </div>
        )}
      </NavLink>
    </div>
  );
};







export const SidePaneGroup: React.FunctionComponent<{
  title: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, children, action }) => {
  return (
    <div className="mb-6">
      <div className="text-muted-foreground text-xs font-semibold uppercase mb-4 flex items-center justify-between">
        {title}
        <div className="my-auto">{action}</div>
      </div>
      <div className="flex flex-col items-start gap-4 rounded-lg ml-2 text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

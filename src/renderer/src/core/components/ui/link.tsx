import { useSpringLoaded } from "@/core/lib/dnd/react";
import { acceptsSmartDrag } from "@/core/providers/smart/dragPayload";
import {
  LinkProps,
  NavLink,
  NavLinkProps,
  Link as RouterLink,
  useNavigate,
} from "react-router-dom";

export const Link = ({ to, children }: LinkProps) => {
  return <RouterLink to={to}>{children}</RouterLink>;
};

/**
 * How long a drag rests on a navigation link before it is followed. A full
 * second: the navigation replaces the page under the drag.
 */
export const NAV_SPRING_DELAY_MS = 1000;

/** A link that a drag resting on it follows, so the drop can land on its page. */
export const DroppableNavLink = (props: NavLinkProps) => {
  const navigate = useNavigate();

  const { ref, isOver } = useSpringLoaded({
    accepts: acceptsSmartDrag,
    delayMs: NAV_SPRING_DELAY_MS,
    onFire: () => navigate(props.to),
  });

  return (
    <div ref={ref} className={isOver ? "animate-pulse" : undefined}>
      <NavLink {...props} />
    </div>
  );
};

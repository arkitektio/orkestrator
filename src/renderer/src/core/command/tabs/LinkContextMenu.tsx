import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/core/components/ui/context-menu";
import { Columns2, ExternalLink } from "lucide-react";
import React from "react";

import { inAppLinkAt } from "./linkClicks";
import { useTabActions } from "./TabsProvider";

/**
 * The two ways to open a link somewhere other than here, as menu rows.
 *
 * For plain links only: a smart card gets the same two as LOCAL ACTIONS
 * (`app/localactions.tsx`), which is what puts them in its menu and its
 * ObjectButton alike. A new tab opens in the BACKGROUND, as a browser's "Open
 * link in new tab" does; "to the side" shows it beside this page and keeps
 * the focus here.
 */
export const LinkMenuItems = ({ to, label }: { to: string; label?: string }) => {
  const { open, openBeside } = useTabActions();
  return (
    <>
      <ContextMenuItem onSelect={() => open(to, { label, background: true, evict: true })}>
        <ExternalLink className="h-3.5 w-3.5" />
        Open in new tab
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => openBeside(to, { label, evict: true })}>
        <Columns2 className="h-3.5 w-3.5" />
        Open to the side
      </ContextMenuItem>
    </>
  );
};

/**
 * A right-click menu for every in-app link that has no menu of its own.
 *
 * One Radix root for the whole app, driven from a `contextmenu` listener —
 * the same shape as `SmartSurface`, and for the same reason: wrapping every
 * link in a menu would be a menu per link. Listens at the BUBBLE phase on
 * `window`, last of all, and takes only an event nobody else has claimed: a
 * smart card, a rail row, anything with a menu of its own prevents the
 * default first, and keeps its menu. A link with `data-tab-link="off"` is
 * not an in-app link (`inAppPath`) and is left alone too.
 */
export const LinkContextMenu = () => {
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const [target, setTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const link = inAppLinkAt(event.target);
      if (!link) return;
      const trigger = triggerRef.current;
      if (!trigger) return;

      event.preventDefault();
      setTarget(link.to);
      // Radix anchors the menu to the event's clientX/Y, not the trigger's
      // box, so a zero-size trigger anywhere will do.
      trigger.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
        }),
      );
    };
    window.addEventListener("contextmenu", onContextMenu);
    return () => window.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return (
    <ContextMenu modal={false} onOpenChange={(open) => !open && setTarget(null)}>
      <ContextMenuTrigger asChild>
        <span
          ref={triggerRef}
          aria-hidden
          data-link-menu-trigger
          style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0 }}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="dark:border-border">
        {target && <LinkMenuItems to={target} />}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default LinkContextMenu;

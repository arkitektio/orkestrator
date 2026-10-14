import { RekuestGuard } from "@/rekuest/api/hooks";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/core/ui/context-menu";
import React from "react";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { DirectImplementationAssignment } from "./actions";
import { RunOnApi, RunOnContext, RunOnTarget, rowAnchor } from "./runOnContext";

/**
 * The one "Run on" picker of a menu: a right-click on a Run row, and the
 * selection of a stateful action more than one agent could take (its state
 * lives on one of them, so the user says which — `AssignButton`).
 *
 * Every Run row used to carry its own Radix `ContextMenu` root — some fifteen
 * component instances and a capture-phase keydown listener per row, the very
 * cost `SmartSurface` removed per card. Now there is one root per menu, the
 * SmartSurface way: rows call `openFor` with the pointer position, the trigger
 * is a 0×0 span, and Radix anchors the content at the synthetic event's
 * clientX/Y. The picker mounts only while open, so its query stays on demand.
 *
 * Rendered around, not inside, `<Command>`: cmdk handles Enter for any React
 * descendant, portalled or not, so a picker inside it would also fire the
 * highlighted row.
 */
export const RunOnSubmenu = ({
  context,
  returnFocusTo,
  children,
}: {
  context: SmartContextProps;
  /** Where focus goes when the picker closes (the search input). */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) => {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [target, setTarget] = React.useState<RunOnTarget | null>(null);

  const api = React.useMemo<RunOnApi>(
    () => ({
      openFor: (next, at) => {
        const point = at ?? rowAnchor(next.action.id);
        setTarget(next);
        triggerRef.current?.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: point.clientX,
            clientY: point.clientY,
          }),
        );
      },
    }),
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) setTarget(null);
  }, []);

  return (
    <RunOnContext.Provider value={api}>
      {children}
      <ContextMenu modal={false} onOpenChange={handleOpenChange}>
        <ContextMenuTrigger asChild>
          <span
            ref={triggerRef}
            aria-hidden
            style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0 }}
          />
        </ContextMenuTrigger>
        <ContextMenuContent
          className="text-foreground border-border px-2 py-2 items-center"
          data-nonbreaker
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo?.current?.focus();
          }}
        >
          {target ? (
            <RekuestGuard fallback={<></>}>
              <DirectImplementationAssignment {...context} action={target.action} />
            </RekuestGuard>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
    </RunOnContext.Provider>
  );
};

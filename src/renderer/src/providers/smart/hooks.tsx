import { useDragSession, useDropTarget } from "@/lib/dnd/react";
import { Structure } from "@/types";

import { acceptsSmartDrag, resolveSmartDrop } from "./dragPayload";

/**
 * Take dropped structures. For a surface that does something of its own with
 * them (a chat composer, a folder, a scene) rather than offering the partner
 * actions — that is `SmartDropZone`.
 *
 * `canDrop` follows the drag in the air, so the component re-renders as any
 * drag starts and ends. Fine for the handful of surfaces that use this; a
 * card-sized thing should style itself with the `can-drop:` variant instead.
 */
export const useSmartDrop = (callback: (structures: Structure[]) => void) => {
  const { ref, isOver } = useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      const resolvedDrop = resolveSmartDrop(payload);

      if (resolvedDrop) {
        callback(resolvedDrop.partners);
      }
    },
  });
  const session = useDragSession();
  const canDrop = session !== null && acceptsSmartDrag(session);

  return [{ isOver, canDrop }, ref] as const;
};

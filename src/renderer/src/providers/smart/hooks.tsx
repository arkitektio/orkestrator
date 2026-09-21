import { DragSession } from "@/lib/dnd/engine";
import { useDragSession, useDropTarget } from "@/lib/dnd/react";
import { Structure } from "@/types";

import { acceptsSmartDrag, resolveSmartDrop } from "./dragPayload";

export type SmartDropOptions = {
  /**
   * An extra condition on top of "this is a smart drag": a surface that only
   * wants *some* structures. It also gates `canDrop`, so a drag it turns down
   * never paints the drop affordance.
   */
  accepts?: (session: DragSession) => boolean;
};

/**
 * Take dropped structures. For a surface that does something of its own with
 * them (a chat composer, a folder, a scene) rather than offering the partner
 * actions — that is `SmartDropZone`.
 *
 * `canDrop` follows the drag in the air, so the component re-renders as any
 * drag starts and ends. Fine for the handful of surfaces that use this; a
 * card-sized thing should style itself with the `can-drop:` variant instead.
 */
export const useSmartDrop = (
  callback: (structures: Structure[]) => void,
  options?: SmartDropOptions,
) => {
  const extraAccepts = options?.accepts;
  const accepts = (session: DragSession) =>
    acceptsSmartDrag(session) && (extraAccepts?.(session) ?? true);

  const { ref, isOver } = useDropTarget({
    accepts,
    onDrop: (payload) => {
      const resolvedDrop = resolveSmartDrop(payload);

      if (resolvedDrop) {
        callback(resolvedDrop.partners);
      }
    },
  });
  const session = useDragSession();
  const canDrop = session !== null && accepts(session);

  return [{ isOver, canDrop }, ref] as const;
};

import { DragSession } from "@/lib/dnd/engine";
import { useCanDrop, useDropTarget } from "@/lib/dnd/react";
import { Structure } from "@/types";

import { acceptsSmartDrag, resolveSmartDrop } from "./dragPayload";

export type SmartDropOptions = {
  /**
   * An extra condition on top of "this is a smart drag": a surface that only
   * wants *some* structures. Pass the same to `useSmartCanDrop`, so a drag it
   * turns down never paints the drop affordance.
   */
  accepts?: (session: DragSession) => boolean;
};

const smartAccepts =
  (extra?: (session: DragSession) => boolean) => (session: DragSession) =>
    acceptsSmartDrag(session) && (extra?.(session) ?? true);

/**
 * Take dropped structures. For a surface that does something of its own with
 * them (a chat composer, a folder, a scene) rather than offering the partner
 * actions — that is `SmartDropZone`.
 *
 * No `canDrop` here: following the drag in the air would re-render the
 * surface as every drag starts and ends. `isOver` already means "over, and
 * would take it"; a surface that changes shape as soon as a card is lifted
 * reads `useSmartCanDrop` as well.
 */
export const useSmartDrop = (
  callback: (structures: Structure[]) => void,
  options?: SmartDropOptions,
) => {
  const { ref, isOver } = useDropTarget({
    accepts: smartAccepts(options?.accepts),
    onDrop: (payload) => {
      const resolvedDrop = resolveSmartDrop(payload);

      if (resolvedDrop) {
        callback(resolvedDrop.partners);
      }
    },
  });

  return [{ isOver }, ref] as const;
};

/**
 * Whether a smart drag it would take is in the air, re-rendering only as that
 * flips — not for a tab reorder or a file from the desktop.
 */
export const useSmartCanDrop = (accepts?: (session: DragSession) => boolean) =>
  useCanDrop(smartAccepts(accepts));

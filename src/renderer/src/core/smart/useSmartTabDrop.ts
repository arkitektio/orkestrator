import { useTabActions } from "@/core/tabs/TabsProvider";
import { useCanDrop, useDropTarget } from "@/core/dnd/react";
import { toast } from "sonner";

import { acceptsSmartDrag, resolveSmartDrop } from "./dragPayload";
import { structureTabTargets } from "./tabTargets";

/** Where a dropped structure goes: a tab of its own, or one beside this page. */
export type SmartTabDropMode = "tab" | "beside";

/**
 * Whether what is in the air could be dropped as a tab.
 *
 * For the few surfaces that change shape while a drag is happening — the rail's
 * tab strip, the window's right edge — rather than merely lighting up under the
 * pointer, which is `data-over` (the `over:` variant) and costs no render. This
 * one re-renders its component when a drag starts and when it ends, which is
 * why it is a hook a handful of places call and not a variant on everything.
 */
export const useSmartDragActive = (): boolean => useCanDrop(acceptsSmartDrag);

/**
 * A drop target that opens what was dropped on it.
 *
 * The structures a smart drag carries are pages, so dropping a card on the tab
 * strip is "open this" and dropping it on the far right edge is "open this
 * beside what I am reading" — the two tab actions the context menu already has
 * (`app/localactions.tsx`), reached by aiming rather than by a menu.
 *
 * Several structures at once (a selection) open several tabs, the last one
 * focused, as "Open in new tab" does. Beside, there is one pane to fill, so
 * only the first goes.
 */
export const useSmartTabDrop = (mode: SmartTabDropMode) => {
  const { open, openBeside } = useTabActions();

  return useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      const resolved = resolveSmartDrop(payload);
      if (!resolved) {
        toast.error("Nothing droppable in that");
        return;
      }

      const targets = structureTabTargets(resolved.partners);
      if (targets.length === 0) {
        toast.error("Nothing here knows how to show that");
        return;
      }

      if (mode === "beside") {
        const [target] = targets;
        openBeside(target.to, { label: target.label, evict: true });
        return;
      }

      // `evict`: the drop was aimed, so at the tab cap it takes the place of
      // the stalest unpinned tab rather than silently doing nothing.
      targets.forEach(({ to, label }, index) =>
        open(to, { label, evict: true, background: index < targets.length - 1 }),
      );
    },
  });
};

import { useDragSessionSelector, useDropTarget } from "@/core/lib/dnd/react";
import { acceptsSmartDrag, resolveSmartDrop } from "@/core/providers/smart/dragPayload";
import { Identifier, Structure } from "@/core/types";

export type DropZoneProps = {
  accepts: Identifier[];
  className?: string;
  children?: React.ReactNode;
  compareWithList?: { id: string }[];
  overLabel: React.ReactNode;
  canDropLabel: React.ReactNode;
  onDrop: (items: Structure[]) => Promise<void>;
};

export const DropZone = ({
  className,
  accepts,
  onDrop,
  children,
  compareWithList,
  overLabel,
  canDropLabel,
}: DropZoneProps) => {
  // This zone only exists while something it could take is in the air, so it
  // reads the drag itself. Only drags from this window: one from outside keeps
  // its contents to itself until it is dropped.
  // Resolved once per drag, and only a smart drag re-renders it: the others
  // all resolve to `undefined`.
  const dragged = useDragSessionSelector((session) =>
    session?.origin === "internal" ? resolveSmartDrop(session)?.partners : undefined,
  );
  const containedIds = compareWithList?.map((c) => c.id) ?? [];
  const fresh = dragged?.filter((i) => !containedIds.includes(i.id));
  const allItemsContained = !!fresh && fresh.length === 0;
  const canDrop =
    !!fresh && (allItemsContained || accepts.includes(fresh.at(0)?.identifier || ""));

  const { ref, isOver } = useDropTarget({
    accepts: (s) => s.origin === "internal" && acceptsSmartDrag(s),
    onDrop: (payload) => {
      const resolvedDrop = resolveSmartDrop(payload);
      if (resolvedDrop) {
        void onDrop(resolvedDrop.partners);
      }
    },
  });

  return (
    <div className={`${!canDrop && "hidden"} ${className}`} ref={ref}>
      {allItemsContained && "All items already contained"}
      {isOver ? overLabel : canDropLabel}
      {children}
    </div>
  );
};

import { useState } from "react";

import { useDropTarget } from "@/core/dnd/react";
import { toast } from "@/core/notify";
import { acceptsSmartDrag, resolveSmartDrop } from "@/core/smart/dragPayload";
import type { Structure } from "@/core/types";
import { cn } from "@/core/util/utils";
import { useLovekit } from "@/lovekit/api/funcs";

import { addToCall } from "./addToCall";

/**
 * A surface of one call that takes what is dropped on it: the call turns to
 * that, on top of what it was about. The bespoke shortcut beside
 * the "Add to the call" local action (which a drop on a call's card offers);
 * both run `addToCall`. The innermost target takes a drop, so the page or
 * rail around this does not also answer it.
 */
export const CallDropTarget = ({
  call,
  className,
  testId,
  children,
}: {
  call: { id: string; title: string };
  className?: string;
  testId?: string;
  children: React.ReactNode;
}) => {
  const client = useLovekit();
  const [busy, setBusy] = useState(false);

  const add = async (dropped: Structure[]) => {
    setBusy(true);
    try {
      await addToCall(client, call, dropped);
      toast.success(`“${call.title}” is now talking about this`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add it to the call");
    } finally {
      setBusy(false);
    }
  };

  const { ref, isOver } = useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      const dropped = resolveSmartDrop(payload)?.partners;
      if (!dropped?.length) {
        toast.error("Nothing droppable in that");
        return;
      }
      void add(dropped);
    },
  });

  return (
    <div ref={ref} className={cn("relative", busy && "opacity-70", className)} data-testid={testId}>
      {children}
      {isOver && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 ring-2 ring-inset ring-primary/60"
          data-testid="call-drop-hint"
        >
          <span className="truncate px-2 text-xs font-medium">Drop to add to the call</span>
        </div>
      )}
    </div>
  );
};

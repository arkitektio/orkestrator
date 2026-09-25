import { Structure } from "@/types";
import { useFloating } from "@floating-ui/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useDropTarget } from "@/lib/dnd/react";
import { acceptsSmartDrag, resolveSmartDrop } from "./dragPayload";
import { SmartModelProps } from "./types";

const syncAttribute = (
  node: HTMLElement | null,
  name: string,
  value: string | null,
) => {
  if (!node) {
    return;
  }

  if (value === null) {
    if (node.hasAttribute(name)) {
      node.removeAttribute(name);
    }
    return;
  }

  if (node.getAttribute(name) !== value) {
    node.setAttribute(name, value);
  }
};

export type UseSmartDropZoneResult = {
  ref: (node: HTMLDivElement | null) => void;
  self: Structure;
  isOver: boolean;
  partners: Structure[];
  clearPartners: () => void;
  floatingRef: (node: HTMLDivElement | null) => void;
  floatingStyles: React.CSSProperties;
};

export const useSmartDropZone = ({
  identifier,
  object,
}: Pick<SmartModelProps, "identifier" | "object">): UseSmartDropZoneResult => {
  const self = React.useMemo<Structure>(
    () => ({ identifier, id: object.id }),
    // Keyed on the id (as in useSmartModel): a refetched fragment with the
    // same id must not invalidate the drop target.
    [identifier, object.id],
  );
  const [partners, setPartners] = useState<Structure[]>([]);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const { refs, floatingStyles } = useFloating({
    strategy: "fixed",
    transform: true,
    open: partners.length > 0,
    onOpenChange: (open) => {
      if (!open) {
        setPartners([]);
      }
    },
  });

  // A nested target inside this zone (a label card's own drop target, say)
  // claims the drop before it gets here — the engine gives a drop to the
  // innermost target only — so the partner panel never opens on top of an act
  // the inner target already offered.
  const { ref: drop, isOver } = useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      const resolvedDrop = resolveSmartDrop(payload);
      if (!resolvedDrop) {
        toast.error("Nothing droppable in that");
        return;
      }

      setPartners(resolvedDrop.partners);
    },
  });

  useEffect(() => {
    syncAttribute(nodeRef.current, "data-identifier", identifier);
    syncAttribute(nodeRef.current, "data-object", object.id);
  }, [identifier, object]);

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      drop(node);
      refs.setReference(node);

      if (!node) {
        return;
      }

      syncAttribute(node, "data-identifier", identifier);
      syncAttribute(node, "data-object", self.id);
    },
    [drop, identifier, self, refs],
  );

  useEffect(() => {
    if (partners.length === 0) {
      return;
    }

    const listener = {
      handleEvent: (event: Event) => {
        const target = event.target as HTMLElement;
        const partnerCard = target.closest(".partnercard");
        if (!partnerCard) {
          setPartners([]);
        }
      },
    };

    document.addEventListener("mousedown", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
    };
  }, [partners.length]);

  const clearPartners = React.useCallback(() => {
    setPartners([]);
  }, []);

  return {
    ref,
    self,
    isOver,
    partners,
    clearPartners,
    floatingRef: refs.setFloating,
    floatingStyles,
  };
};

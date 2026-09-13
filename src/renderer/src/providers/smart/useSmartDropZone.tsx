import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { Structure } from "@/types";
import { useFloating } from "@floating-ui/react";
import React, { useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";

import { useLatestRef } from "@/hooks/useLatestRef";
import { resolveSmartDrop } from "./dropUtils";
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
  canDrop: boolean;
  partners: Structure[];
  clearPartners: () => void;
  floatingRef: (node: HTMLDivElement | null) => void;
  floatingStyles: React.CSSProperties;
};

export const useSmartDropZone = ({
  identifier,
  object,
}: Pick<SmartModelProps, "identifier" | "object">): UseSmartDropZoneResult => {
  const self = React.useMemo(
    () => ({ identifier, object }),
    // Keyed on the id (as in useSmartModel): a refetched fragment with the
    // same id must not invalidate the drop target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [SMART_MODEL_DROP_TYPE, NativeTypes.TEXT, NativeTypes.URL],
      drop: (item: unknown, monitor) => {
        const resolvedDrop = resolveSmartDrop(item, monitor.getItemType());
        if (!resolvedDrop) {
          alert(`Drop unkonwn ${String(item)}`);
          return {};
        }

        setPartners(resolvedDrop.partners);
        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [],
  );

  useEffect(() => {
    syncAttribute(nodeRef.current, "data-over", isOver ? "true" : "false");
    syncAttribute(nodeRef.current, "data-can-drop", canDrop ? "true" : "false");
    syncAttribute(nodeRef.current, "data-identifier", identifier);
    syncAttribute(nodeRef.current, "data-object", object.id);
  }, [canDrop, identifier, isOver, object]);

  // Keep the ref callback stable across drag-state changes (see
  // useSmartModel): the effect above re-syncs the attributes after mount.
  const dndStateRef = useLatestRef({ isOver, canDrop });

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      drop(node);
      refs.setReference(node);

      if (!node) {
        return;
      }

      syncAttribute(node, "data-identifier", identifier);
      syncAttribute(node, "data-object", self.object.id);
      syncAttribute(node, "data-over", dndStateRef.current.isOver ? "true" : "false");
      syncAttribute(node, "data-can-drop", dndStateRef.current.canDrop ? "true" : "false");
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
    canDrop,
    partners,
    clearPartners,
    floatingRef: refs.setFloating,
    floatingStyles,
  };
};

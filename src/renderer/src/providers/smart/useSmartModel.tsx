import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { sameStructure, structure } from "@/lib/structure";
import { Structure } from "@/types";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { createSelector } from "reselect";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DropPayload } from "@/lib/dnd/engine";
import { useDragSource, useDropTarget } from "@/lib/dnd/react";
import { useSelectionStoreApi } from "../selection/SelectionContext";
import { SelectionState } from "../selection/store";
import { smartDropRegistryStore } from "./dropRegistry";
import { onSmartDragEnd } from "./dragOut";
import { buildStackPreview } from "./dragPreview";
import {
  acceptsSmartDrag,
  getMatchingActions,
  getSmartDragStructures,
  getSmartDropObjects,
  resolveSmartDrop,
  SmartDragItem,
  smartExternalData,
} from "./dropUtils";
import { registerSmartNode, unregisterSmartNode } from "./nodeRegistry";
import { SmartModelProps } from "./types";

// Module-level: `useFloating` deep-compares the middleware array on every
// render (down to `fn.toString()`), so a fresh literal per card per render was
// three closure stringifications per card per commit.
const PARTNER_PANEL_MIDDLEWARE = [offset(12), flip(), shift({ padding: 12 })];

type SmartModelSelectionSnapshot = {
  selection: Structure[];
  bselection: Structure[];
  selectedIndex: number;
  bselectedIndex: number;
};

const createSelectionSnapshotSelector = (self: Structure) =>
  createSelector(
    [
      (state: SelectionState) => state.selection,
      (state: SelectionState) => state.bselection,
    ],
    (selection, bselection): SmartModelSelectionSnapshot => ({
      selection,
      bselection,
      selectedIndex:
        selection.findIndex(
          (item) => sameStructure(item, self),
        ) + 1,
      bselectedIndex:
        bselection.findIndex(
          (item) => sameStructure(item, self),
        ) + 1,
    }),
  );

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

export type UseSmartModelResult = {
  ref: (node: HTMLDivElement | null) => void;
  floatingRef: (node: HTMLDivElement | null) => void;
  floatingStyles: React.CSSProperties;
  self: Structure;
  isOver: boolean;
  /** What was dropped on this card; empty when the partner panel is closed. */
  partners: Structure[];
  /** What the drop landed on: this card, or the selection it is part of. */
  dropObjects: Structure[];
  clearPartners: () => void;
  handleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
};

const NO_STRUCTURES: Structure[] = [];

type SmartDropState = { objects: Structure[]; partners: Structure[] };

export const useSmartModel = ({
  identifier,
  object,
}: Pick<SmartModelProps, "identifier" | "object">): UseSmartModelResult => {
  const selectionStore = useSelectionStoreApi();
  const label = typeof object.label === "string" ? object.label : typeof object.name === "string" ? object.name : undefined;
  const self = useMemo<Structure>(
    () => structure(identifier, object.id, { label }),
    [identifier, object.id, label], // Not on other fragment fields: they never leave the module
  );


  const nodeRef = useRef<HTMLDivElement | null>(null);
  const registeredNodeRef = useRef<HTMLDivElement | null>(null);
  const floatingNodeRef = useRef<HTMLDivElement | null>(null);
  const latestSelectionRef = useRef<Structure[]>(selectionStore.getState().selection);
  const latestBSelectionRef = useRef<Structure[]>(selectionStore.getState().bselection);
  const latestSnapshotRef = useRef({ selectedIndex: 0, bselectedIndex: 0 });
  // Both sides of the drop the partner panel is open for, as they were when
  // it landed — the selection may well change while the panel is up.
  const [smartDrop, setSmartDrop] = useState<SmartDropState | null>(null);
  const partners = smartDrop?.partners ?? NO_STRUCTURES;
  const { refs, floatingStyles } = useFloating({
    open: partners.length > 0,
    placement: "right-start",
    strategy: "fixed",
    transform: true,
    whileElementsMounted: autoUpdate,
    middleware: PARTNER_PANEL_MIDDLEWARE,
  });

  const dropHandler = React.useCallback(async (payload: DropPayload) => {
    const resolvedDrop = resolveSmartDrop(payload);

    if (!resolvedDrop) {
      // A drag from outside only shows its types while it hovers; this one
      // turned out not to hold a structure.
      toast.error("Nothing droppable in that");
      return;
    }

    const objects = getSmartDropObjects(
      selectionStore.getState().selection,
      self,
      resolvedDrop.partners,
    );
    if (!objects) {
      // Let go over a card that is part of what is being dragged.
      return;
    }

    syncAttribute(nodeRef.current, "data-isdropping", "true");

    if (!resolvedDrop.omitDefaultBehaviour) {
      try {
        const matchingActions = await getMatchingActions(objects, resolvedDrop.partners);
        const registration = smartDropRegistryStore
          .getState()
          .findMatchingRegistration({
            objects,
            partners: resolvedDrop.partners,
            matchingActions,
          });

        if (registration) {
          const handled = await registration.handler({
            objects,
            partners: resolvedDrop.partners,
            matchingActions,
          });

          if (handled !== false) {
            return;
          }
        }
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : String(error));
        return;
      } finally {
        syncAttribute(nodeRef.current, "data-isdropping", "false");
      }
    }


    syncAttribute(nodeRef.current, "data-isdropping", "false");

    setSmartDrop({ objects, partners: resolvedDrop.partners });
  }, [self, selectionStore]);

  // The engine marks the node itself — `data-over` while this card would take
  // the drop, `data-dragging` while it is the one in the air — so neither is
  // synced from here, and a drag starting elsewhere renders no card at all.
  const { ref: drop, isOver } = useDropTarget({
    accepts: acceptsSmartDrag,
    onDrop: (payload) => {
      void dropHandler(payload);
    },
  });

  // A drag that begins on a selected card carries the selection. Read when
  // the drag begins: a card does not re-render as the selection changes.
  const dragStructures = () =>
    getSmartDragStructures(selectionStore.getState().selection, self);

  const drag = useDragSource({
    kind: SMART_MODEL_DROP_TYPE,
    getData: (): SmartDragItem => ({ structures: dragStructures() }),
    // What another window of ours receives. Nothing else can take it.
    getExternalData: () => smartExternalData(dragStructures()),
    // Let go on the desktop: download it, or ask how to export it.
    onEnd: (info, data) => {
      void onSmartDragEnd(info, data);
    },
    // Several things in hand look like several things: a stack, this card on top.
    preview: ({ data, node, grab }) =>
      buildStackPreview(node, (data as SmartDragItem).structures.length, grab),
  });

  const syncSelectionState = React.useCallback(
    (node: HTMLDivElement | null, snapshot: SmartModelSelectionSnapshot) => {
      syncAttribute(
        node,
        "data-selected",
        snapshot.selectedIndex > 0 ? "true" : "false",
      );
      syncAttribute(
        node,
        "data-bselected",
        snapshot.bselectedIndex > 0 ? "true" : "false",
      );
      syncAttribute(
        node,
        "data-selected-index",
        snapshot.selectedIndex > 0 ? String(snapshot.selectedIndex) : null,
      );
      syncAttribute(
        node,
        "data-bselected-index",
        snapshot.bselectedIndex > 0 ? String(snapshot.bselectedIndex) : null,
      );
    },
    [],
  );

  useEffect(() => {
    const selector = createSelectionSnapshotSelector(self);

    const syncFromState = (state: SelectionState) => {
      const nextSnapshot = selector(state);

      latestSelectionRef.current = nextSnapshot.selection;
      latestBSelectionRef.current = nextSnapshot.bselection;

      if (
        latestSnapshotRef.current.selectedIndex === nextSnapshot.selectedIndex &&
        latestSnapshotRef.current.bselectedIndex === nextSnapshot.bselectedIndex
      ) {
        return;
      }

      latestSnapshotRef.current = {
        selectedIndex: nextSnapshot.selectedIndex,
        bselectedIndex: nextSnapshot.bselectedIndex,
      };

      syncSelectionState(nodeRef.current, nextSnapshot);
    };

    const initialSnapshot = selector(selectionStore.getState());
    latestSelectionRef.current = initialSnapshot.selection;
    latestBSelectionRef.current = initialSnapshot.bselection;
    latestSnapshotRef.current = {
      selectedIndex: initialSnapshot.selectedIndex,
      bselectedIndex: initialSnapshot.bselectedIndex,
    };
    syncSelectionState(nodeRef.current, initialSnapshot);

    return selectionStore.subscribe((state) => {
      syncFromState(state);
    });
  }, [selectionStore, self, syncSelectionState]);

  // The ref callback below must keep a stable identity for the lifetime of
  // the model: React detaches and re-attaches a ref whenever the callback
  // changes, and every re-attach re-registers the node with the selection
  // store and the dnd engine. `drag` and `drop` are stable for that reason.
  const registerNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      const previousNode = registeredNodeRef.current;

      if (previousNode && previousNode !== node) {
        unregisterSmartNode(previousNode);
        selectionStore.getState().unregisterSelectables([
          {
            structure: self,
            item: previousNode,
          },
        ]);
      }

      registeredNodeRef.current = node;
      nodeRef.current = node;

      if (!node) {
        drag(null);
        drop(null);
        refs.setReference(null);
        return;
      }

      drag(node);
      drop(node);
      refs.setReference(node);

      syncAttribute(node, "data-identifier", identifier);
      // Only the id: nothing parses this attribute (SelectionBox checks for its
      // presence), and serializing the whole fragment per card was expensive.
      syncAttribute(node, "data-object", self.id);
      syncAttribute(node, "data-selectable", "true");
      // The delegated context menu / hover card (`SmartSurface`) resolves the
      // card under the pointer through this registry.
      registerSmartNode(node, self);

      selectionStore.getState().registerSelectables([
        {
          structure: self,
          item: node,
        },
      ]);

      syncSelectionState(node, {
        selection: latestSelectionRef.current,
        bselection: latestBSelectionRef.current,
        selectedIndex: latestSnapshotRef.current.selectedIndex,
        bselectedIndex: latestSnapshotRef.current.bselectedIndex,
      });
    },
    [drag, drop, identifier, refs, selectionStore, self, syncSelectionState],
  );

  useEffect(() => {
    return () => {
      const node = registeredNodeRef.current;
      if (!node) {
        return;
      }

      unregisterSmartNode(node);
      selectionStore.getState().unregisterSelectables([
        {
          structure: self,
          item: node,
        },
      ]);
    };
  }, [selectionStore, self]);

  const clearPartners = React.useCallback(() => {
    setSmartDrop(null);
  }, []);

  const floatingRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      floatingNodeRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const isInsideFloating =
        floatingNodeRef.current?.contains(target) ?? false;
      const isInsideReference = nodeRef.current?.contains(target) ?? false;

      if (!isInsideFloating && !isInsideReference) {
        clearPartners();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearPartners();
      }
    };

    if (partners.length > 0) {
      document.addEventListener("pointerdown", handlePointerDownOutside, true);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [partners.length, clearPartners]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const { toggleSelection, toggleBSelection } = selectionStore.getState();

      if (event.shiftKey && !event.ctrlKey) {
        toggleSelection(self);
      }

      if (event.shiftKey && event.ctrlKey) {
        toggleBSelection(self);
      }
    },
    [selectionStore, self],
  );

  return {
    ref: registerNode,
    floatingRef,
    floatingStyles,
    self,
    isOver,
    partners,
    dropObjects: smartDrop?.objects ?? NO_STRUCTURES,
    clearPartners,
    handleClick,
  };
};

import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { Structure } from "@/types";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { createSelector } from "reselect";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DragSourceMonitor, DropTargetMonitor, useDrag, useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { toast } from "sonner";

import { useLatestRef } from "@/hooks/useLatestRef";
import { useSelectionStoreApi } from "../selection/SelectionContext";
import { SelectionState } from "../selection/store";
import { smartDropRegistryStore } from "./dropRegistry";
import { getMatchingActions, getSmartDropObjects, resolveSmartDrop } from "./dropUtils";
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
          (item) =>
            item.identifier === self.identifier && item.object === self.object,
        ) + 1,
      bselectedIndex:
        bselection.findIndex(
          (item) =>
            item.identifier === self.identifier && item.object === self.object,
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
  isDragging: boolean;
  canDrop: boolean;
  partners: Structure[];
  clearPartners: () => void;
  handleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  handleDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  getCurrentSelection: () => Structure[];
  getCurrentBSelection: () => Structure[];
};

export const useSmartModel = ({
  identifier,
  object,
}: Pick<SmartModelProps, "identifier" | "object">): UseSmartModelResult => {
  const selectionStore = useSelectionStoreApi();
  const self = useMemo(
    () => ({ identifier, object }),
    [identifier, object.id], // Only re-create if identifier or object id changes, not if other object attributes change
  );


  const nodeRef = useRef<HTMLDivElement | null>(null);
  const registeredNodeRef = useRef<HTMLDivElement | null>(null);
  const floatingNodeRef = useRef<HTMLDivElement | null>(null);
  const latestSelectionRef = useRef<Structure[]>(selectionStore.getState().selection);
  const latestBSelectionRef = useRef<Structure[]>(selectionStore.getState().bselection);
  const latestSnapshotRef = useRef({ selectedIndex: 0, bselectedIndex: 0 });
  const omitDefaultDropBehaviourRef = useRef(false);
  const [partners, setPartners] = useState<Structure[]>([]);
  const { refs, floatingStyles } = useFloating({
    open: partners.length > 0,
    placement: "right-start",
    strategy: "fixed",
    transform: true,
    whileElementsMounted: autoUpdate,
    middleware: PARTNER_PANEL_MIDDLEWARE,
  });

  const dropHandler = React.useCallback(async (
    item: unknown,
    monitor: DropTargetMonitor<unknown, unknown>,
  ) => {
    const resolvedDrop = resolveSmartDrop(item, monitor.getItemType());


    if (!resolvedDrop) {
      alert(`Drop unknown ${String(item)}`);
      return {};
    }

    syncAttribute(nodeRef.current, "data-isdropping", "true");

    if (!resolvedDrop.omitDefaultBehaviour) {
      const objects = getSmartDropObjects(selectionStore.getState().selection, self);


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
            return {};
          }
        }
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : String(error));
        return {};
      } finally {
        syncAttribute(nodeRef.current, "data-isdropping", "false");
      }
    }


    syncAttribute(nodeRef.current, "data-isdropping", "false");

    setPartners(resolvedDrop.partners);
    return {};
  }, [self, selectionStore]);

  const collectDrop = React.useCallback(
    (monitor: DropTargetMonitor<unknown, unknown>) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
    [],
  );

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: [SMART_MODEL_DROP_TYPE, NativeTypes.TEXT, NativeTypes.URL],
      drop: (item, monitor) => {
        void dropHandler(item, monitor);
        return {};
      },
      collect: collectDrop,
    }),
    [dropHandler, collectDrop],
  );

  const collectDrag = React.useCallback(
    (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    [],
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: SMART_MODEL_DROP_TYPE,
      item: () => ({
        structures: [self],
        omitDefaultBehaviour: omitDefaultDropBehaviourRef.current,
      }),
      collect: collectDrag,
    }),
    [self, collectDrag],
  );

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

  useEffect(() => {
    syncAttribute(nodeRef.current, "data-over", isOver ? "true" : "false");
    syncAttribute(
      nodeRef.current,
      "data-dragging",
      isDragging ? "true" : "false",
    );
    syncAttribute(nodeRef.current, "data-can-drop", canDrop ? "true" : "false");

  }, [isOver, isDragging, canDrop]);

  // The ref callback below must keep a stable identity for the lifetime of
  // the model: React detaches and re-attaches a ref whenever the callback
  // changes, and every re-attach re-registers the node with the selection
  // store and react-dnd. Drag state lives in a ref so that a drag starting
  // anywhere on the page (which flips `canDrop` on every card) does not churn
  // every card's registration. The effect above remains the source of truth
  // for those attributes after mount.
  const dndStateRef = useLatestRef({ isOver, isDragging, canDrop });

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
      syncAttribute(node, "data-object", self.object.id);
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
      const dnd = dndStateRef.current;
      syncAttribute(node, "data-over", dnd.isOver ? "true" : "false");
      syncAttribute(node, "data-dragging", dnd.isDragging ? "true" : "false");
      syncAttribute(node, "data-can-drop", dnd.canDrop ? "true" : "false");
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
    setPartners([]);
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

  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      omitDefaultDropBehaviourRef.current = event.ctrlKey;
      const data = JSON.stringify(self);
      event.dataTransfer.setData("text/plain", data);
      event.dataTransfer.setData(
        "text/uri-list",
        `arkitekt://${identifier}:${self.object.id}`,
      );
    },
    [identifier, self],
  );

  return {
    ref: registerNode,
    floatingRef,
    floatingStyles,
    self,
    isOver,
    isDragging,
    canDrop,
    partners,
    clearPartners,
    handleClick,
    handleDragStart,
    getCurrentSelection: () => latestSelectionRef.current,
    getCurrentBSelection: () => latestBSelectionRef.current,
  };
};

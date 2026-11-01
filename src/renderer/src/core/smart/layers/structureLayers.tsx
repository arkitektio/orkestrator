import { useSelectionStoreApi } from "@/core/dnd/selection/SelectionContext";
import { smartRegistry } from "@/core/smart/registry";
import type { Structure } from "@/core/types";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createStore, useStore } from "zustand";

/**
 * Layers over every datum in view: something a module draws ON the cards of
 * other modules, while a toggle is on. Nothing is mounted while it is off, so a
 * card pays nothing per render (the same reason `SmartSurface` holds the card
 * menu at the root rather than one per card).
 *
 * The toggle lives for the window's session, not in the settings: a persisted
 * "on" would read every card in view at boot, before anyone asked for it.
 */
type LayerToggle = { enabled: boolean; toggle: () => void; setEnabled: (enabled: boolean) => void };

export const structureLayerToggle = createStore<LayerToggle>((set) => ({
  enabled: false,
  toggle: () => set((state) => ({ enabled: !state.enabled })),
  setEnabled: (enabled) => set({ enabled }),
}));

export const useStructureLayersEnabled = () =>
  useStore(structureLayerToggle, (state) => state.enabled);

/** Marks a layer's own content, so a card drawn inside one does not get a layer too. */
export const LAYER_ATTRIBUTE = "data-structure-layer";

/** Cards just outside the viewport stay in, so a small scroll does not refetch. */
const VIEW_MARGIN = "100px";
/** A scroll settles before anything is read. */
const SETTLE_MS = 150;

export type InViewCard = { node: HTMLElement; structure: Structure };

const NOTHING: readonly InViewCard[] = [];

/**
 * The datum cards on screen right now, settled. Reads the cards the selection
 * store already knows (`selectables`), which only `useSmartModel` feeds; one
 * observer watches them all. A card hidden in a kept-alive tab does not
 * intersect, so another tab's cards are never read.
 */
export const useCardsInView = (settleMs: number = SETTLE_MS): readonly InViewCard[] => {
  const store = useSelectionStoreApi();
  const [cards, setCards] = useState<readonly InViewCard[]>(NOTHING);

  useEffect(() => {
    const tracked = new Map<HTMLElement, Structure>();
    const visible = new Set<HTMLElement>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        setCards(
          Array.from(visible, (node) => ({ node, structure: tracked.get(node)! })),
        );
      }, settleMs);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          if (entry.isIntersecting && tracked.has(node)) visible.add(node);
          else visible.delete(node);
        }
        schedule();
      },
      { rootMargin: VIEW_MARGIN },
    );

    const sync = (selectables: ReturnType<typeof store.getState>["selectables"]) => {
      const next = new Map<HTMLElement, Structure>();
      for (const { item, structure } of selectables) {
        if (!smartRegistry.isDatum(structure.identifier)) continue;
        if (item.closest(`[${LAYER_ATTRIBUTE}]`)) continue;
        next.set(item, structure);
      }
      let changed = false;
      for (const node of tracked.keys()) {
        if (next.has(node)) continue;
        observer.unobserve(node);
        tracked.delete(node);
        if (visible.delete(node)) changed = true;
      }
      for (const [node, structure] of next) {
        const known = tracked.get(node);
        if (!known) observer.observe(node);
        else if (known !== structure && visible.has(node)) changed = true;
        tracked.set(node, structure);
      }
      if (changed) schedule();
    };

    store.getState().flushSelectables();
    sync(store.getState().selectables);
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.selectables !== previous.selectables) sync(state.selectables);
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
      setCards(NOTHING);
    };
  }, [store, settleMs]);

  return cards;
};

const cardKey = (structure: Structure) => `${structure.identifier}:${structure.id}`;

const CardsContext = createContext<ReadonlyMap<string, readonly HTMLElement[]>>(new Map());

/**
 * What a layer draws on one structure's cards. One datum can be on screen twice,
 * so this renders once per card. Absolute at the card's lower left, because the
 * menu button and the selection badges sit on its right, and it takes no pointer
 * events: the card underneath stays the thing you click, drag and right-click.
 */
export const StructureSlot = ({
  structure,
  children,
}: {
  structure: Structure;
  children: React.ReactNode;
}) => {
  const nodes = useContext(CardsContext).get(cardKey(structure));
  if (!nodes) return null;
  return (
    <>
      {nodes.map((node, index) =>
        createPortal(
          <div
            {...{ [LAYER_ATTRIBUTE]: "true" }}
            className="pointer-events-none absolute bottom-1 left-1 z-20 flex max-w-[calc(100%-0.5rem)] flex-row flex-wrap gap-1"
          >
            {children}
          </div>,
          node,
          String(index),
        ),
      )}
    </>
  );
};

export type StructureLayerProps = {
  /** Each datum in view, once, however many cards show it: what a layer reads. */
  structures: readonly Structure[];
  Slot: typeof StructureSlot;
};

/**
 * Hands the settled cards in view to the layers below it. Mounted only while the
 * toggle is on, so the observer goes with it.
 */
export const StructureLayerHost = ({
  children,
}: {
  children: (props: StructureLayerProps) => React.ReactNode;
}) => {
  const cards = useCardsInView();

  const { nodes, structures } = useMemo(() => {
    const byKey = new Map<string, HTMLElement[]>();
    const distinct: Structure[] = [];
    for (const { node, structure } of cards) {
      const key = cardKey(structure);
      const known = byKey.get(key);
      if (known) known.push(node);
      else {
        byKey.set(key, [node]);
        distinct.push(structure);
      }
    }
    return { nodes: byKey, structures: distinct };
  }, [cards]);

  return (
    <CardsContext.Provider value={nodes}>
      {children({ structures, Slot: StructureSlot })}
    </CardsContext.Provider>
  );
};

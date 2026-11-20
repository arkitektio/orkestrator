import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/core/ui/context-menu";
import { Structure } from "@/core/types";
import { cn } from "@/core/util/utils";
import React from "react";
import { useSelectionStoreApi } from "../dnd/selection/SelectionContext";
import { SmartContext } from "./extensions/context";
import { useMenuChrome } from "./menuChrome";
import { useSmartPrefetcher } from "./extensions/prefetchContext";
import { smartNodeAt } from "./nodeRegistry";

/**
 * The one context menu for every smart card on the page (and the prefetch
 * that warms it).
 *
 * Cards register their node in `nodeRegistry`; this component listens on the
 * document, resolves the card under the pointer, and drives a single Radix
 * root for the menu. Per card that removes a Radix root (and its component
 * instances) and the capture-phase `keydown` listener every Radix `Menu`
 * installs on mount — a 60-card page used to dispatch each keystroke to 60 of
 * them. Mount once, inside the selection and dialog providers (the menu's
 * actions need both).
 */
export const SmartSurface = () => {
  const menuOpenRef = React.useRef(false);
  return (
    <>
      <SmartContextMenuSurface menuOpenRef={menuOpenRef} />
      <SmartPrefetchSurface menuOpenRef={menuOpenRef} />
    </>
  );
};

/* ------------------------------------------------------------------------ */
/* Prefetch                                                                 */
/* ------------------------------------------------------------------------ */

const HOVER_PREFETCH_DELAY_MS = 150;
const SELECTION_PREFETCH_DELAY_MS = 150;

/**
 * Warms the menu's two main queries before it opens: for the hovered card
 * (its own listener), and for the selection whenever it changes. With a selection
 * the menu is about the selection, so a hovered card is not prefetched then.
 */
const SmartPrefetchSurface = ({
  menuOpenRef,
}: {
  menuOpenRef: React.MutableRefObject<boolean>;
}) => {
  const prefetcher = useSmartPrefetcher();
  const selection = useSelectionStoreApi();

  React.useEffect(() => {
    if (!prefetcher) return;

    // Trailing-debounced: a marquee drag emits a selection per mousemove.
    let selectionTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = selection.subscribe((state, previous) => {
      if (state.selection === previous.selection && state.bselection === previous.bselection) {
        return;
      }
      if (selectionTimer) clearTimeout(selectionTimer);
      selectionTimer = setTimeout(() => {
        selectionTimer = null;
        const { selection: objects, bselection: partners } = selection.getState();
        if (objects.length > 0) prefetcher.prefetch({ objects, partners });
      }, SELECTION_PREFETCH_DELAY_MS);
    });

    let hovered: HTMLElement | null = null;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    const onPointerOver = (event: PointerEvent) => {
      if (menuOpenRef.current) return;
      const hit = smartNodeAt(event.target);
      if (!hit || hit.node === hovered) return;
      hovered = hit.node;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        hoverTimer = null;
        if (hovered !== hit.node || !hit.node.isConnected) return;
        if (selection.getState().selection.length > 0) return;
        prefetcher.prefetch({ objects: [hit.structure] });
      }, HOVER_PREFETCH_DELAY_MS);
    };
    const onPointerOut = (event: PointerEvent) => {
      if (!hovered) return;
      const next = event.relatedTarget;
      if (next instanceof Node && hovered.contains(next)) return;
      hovered = null;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
    };
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);

    return () => {
      unsubscribe();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      if (selectionTimer) clearTimeout(selectionTimer);
      if (hoverTimer) clearTimeout(hoverTimer);
    };
  }, [prefetcher, selection, menuOpenRef]);

  return null;
};

/* ------------------------------------------------------------------------ */
/* Context menu                                                             */
/* ------------------------------------------------------------------------ */

const SmartContextMenuSurface = ({
  menuOpenRef,
}: {
  menuOpenRef: React.MutableRefObject<boolean>;
}) => {
  const menuChrome = useMenuChrome();
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const targetRef = React.useRef<Structure | null>(null);
  // One content instance per right-click. Radix keeps the content mounted
  // through its close animation, so a right-click on another card while the
  // menu is open would reuse it: same position, same snapshotted target.
  const [opening, setOpening] = React.useState(0);

  React.useEffect(() => {
    // Radix's `ContextMenuTrigger` anchors its content to the event's
    // clientX/Y, not to the trigger's box — so the trigger can be a
    // zero-size span anywhere, and a right-click on any card is forwarded to
    // it as a fresh `contextmenu` event. Capture phase, so the card's own
    // React handlers (if any) still see the original event afterwards.
    const onContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const hit = smartNodeAt(event.target);
      if (!hit || hit.node.dataset.dragging === "true") return;
      const trigger = triggerRef.current;
      if (!trigger) return;

      event.preventDefault();
      targetRef.current = hit.structure;
      setOpening((current) => current + 1);
      trigger.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
        }),
      );
    };
    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      menuOpenRef.current = open;
      if (!open) targetRef.current = null;
    },
    [menuOpenRef],
  );

  return (
    <ContextMenu modal={false} onOpenChange={handleOpenChange}>
      <ContextMenuTrigger asChild>
        <span
          ref={triggerRef}
          aria-hidden
          style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0 }}
        />
      </ContextMenuTrigger>
      {/* `data-nonbreaker`: the menu is portalled out of the card, so without it
          SelectionBox's global mousedown handler would clear the selection the
          moment a row is pressed — an action on a multi-selection would then run
          against the single right-clicked item. */}
      <ContextMenuContent
        key={opening}
        className={cn("dark:border-border w-72 max-w-[90vw]", menuChrome)}
        data-nonbreaker
      >
        <SmartMenuContent targetRef={targetRef} />
      </ContextMenuContent>
    </ContextMenu>
  );
};

// The menu content only mounts while the context menu is open, so the selection
// it saw when it opened is the selection the user meant to act on. Snapshot it:
// anything that clears the selection while the menu is open (a stray mousedown,
// an item disappearing from a list) must not silently shrink an action's targets
// down to the single right-clicked structure.
const SmartMenuContent = ({
  targetRef,
}: {
  targetRef: React.MutableRefObject<Structure | null>;
}) => {
  const storeApi = useSelectionStoreApi();

  const [{ objects, partners }] = React.useState(() => {
    const self = targetRef.current;
    const { selection, bselection } = storeApi.getState();

    if (selection.length > 0) {
      return { objects: selection, partners: bselection };
    }
    return {
      objects: self ? [self] : [],
      partners: [] as Structure[],
    };
  });

  if (objects.length === 0) return null;
  return <SmartContext objects={objects} partners={partners} />;
};

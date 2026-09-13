import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useSettingsStore } from "@/providers/settings/SettingsContext";
import { Structure } from "@/types";
import React from "react";
import { useSelectionStoreApi } from "../selection/SelectionContext";
import { getSmartBuilderAdapters } from "./buildSmartAdapters";
import { SmartContext } from "./extensions/context";
import { hoverOpenDelay, smartNodeAt, SmartHit } from "./nodeRegistry";

/**
 * The one context menu and the one hover card for every smart card on the
 * page.
 *
 * Cards register their node in `nodeRegistry`; this component listens on the
 * document, resolves the card under the pointer, and drives a single Radix
 * root for each surface. Per card that removes two Radix roots (~15 component
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
      <SmartHoverSurface menuOpenRef={menuOpenRef} />
    </>
  );
};

/* ------------------------------------------------------------------------ */
/* Context menu                                                             */
/* ------------------------------------------------------------------------ */

const SmartContextMenuSurface = ({
  menuOpenRef,
}: {
  menuOpenRef: React.MutableRefObject<boolean>;
}) => {
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const targetRef = React.useRef<Structure | null>(null);

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
      <ContextMenuContent className="dark:border-gray-700 max-w-md" data-nonbreaker>
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

/* ------------------------------------------------------------------------ */
/* Hover card                                                               */
/* ------------------------------------------------------------------------ */

type HoverTarget = { structure: Structure; rect: DOMRect };

const SmartHoverSurface = ({
  menuOpenRef,
}: {
  menuOpenRef: React.MutableRefObject<boolean>;
}) => {
  // Hover cards are opt-out via the user settings (default on).
  const enabled = useSettingsStore(
    (state) => state.settings?.showHoverCards ?? true,
  );
  const [target, setTarget] = React.useState<HoverTarget | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const hoveredRef = React.useRef<SmartHit | null>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClosedAt = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const close = React.useCallback(() => {
    clearTimers();
    hoveredRef.current = null;
    setTarget((current) => {
      if (current) lastClosedAt.current = Date.now();
      return null;
    });
  }, [clearTimers]);

  React.useEffect(() => {
    if (!enabled) {
      close();
      return;
    }

    const hoverable = (hit: SmartHit) =>
      hit.node.dataset.hover === "true" &&
      hit.node.dataset.dragging !== "true" &&
      hit.node.dataset.partners !== "true" &&
      !menuOpenRef.current;

    const onPointerOver = (event: PointerEvent) => {
      const hit = smartNodeAt(event.target);
      if (!hit || !hoverable(hit)) return;
      if (hoveredRef.current?.node === hit.node) {
        // Moving within the card (or back from its content): keep it open.
        if (closeTimer.current) {
          clearTimeout(closeTimer.current);
          closeTimer.current = null;
        }
        return;
      }
      clearTimers();
      hoveredRef.current = hit;
      const delay = hoverOpenDelay(lastClosedAt.current, Date.now());
      openTimer.current = setTimeout(() => {
        openTimer.current = null;
        if (hoveredRef.current?.node !== hit.node || !hit.node.isConnected) {
          return;
        }
        setTarget({
          structure: hit.structure,
          rect: hit.node.getBoundingClientRect(),
        });
      }, delay);
    };

    const onPointerOut = (event: PointerEvent) => {
      const hovered = hoveredRef.current;
      if (!hovered) return;
      const next = event.relatedTarget;
      if (
        next instanceof Node &&
        (hovered.node.contains(next) || contentRef.current?.contains(next))
      ) {
        return;
      }
      if (openTimer.current) {
        // Left before it opened: nothing to close, just forget it.
        clearTimers();
        hoveredRef.current = null;
        return;
      }
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(close, 100);
    };

    // The anchor is a snapshot of the card's box; it would drift on scroll.
    const onScroll = () => {
      if (hoveredRef.current) close();
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("scroll", onScroll, true);
      clearTimers();
    };
  }, [enabled, close, clearTimers, menuOpenRef]);

  // Radix only ever asks us to close (Escape, outside pointer, leaving the
  // content); opening is ours.
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) close();
    },
    [close],
  );

  if (!enabled) return null;

  const rect = target?.rect;

  return (
    <HoverCard
      open={target !== null}
      onOpenChange={handleOpenChange}
      openDelay={0}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <span
          aria-hidden
          style={{
            position: "fixed",
            top: rect?.top ?? 0,
            left: rect?.left ?? 0,
            width: rect?.width ?? 0,
            height: rect?.height ?? 0,
            pointerEvents: "none",
          }}
        />
      </HoverCardTrigger>
      <HoverCardContent
        ref={contentRef}
        side="right"
        align="center"
        sideOffset={12}
        className="w-80 max-w-[min(90vw,20rem)] p-0 ring-0 border-0 bg-transparent overflow-visible shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient "frame" — the padding lets this gradient show as a border
            around the solid body. The shadow lives here (on the actual visible
            element) so it isn't lost on the transparent portal container. */}
        <div className="rounded-3xl bg-primary p-[1px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)]">
          <div className="rounded-3xl overflow-hidden bg-popover border border-primary/20">
            {target &&
              getSmartBuilderAdapters().renderHover({
                identifier: target.structure.identifier,
                object: target.structure.object,
              })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

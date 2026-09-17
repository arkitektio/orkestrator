import { useLatestRef } from "@/hooks/useLatestRef";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  createDragSource,
  createDropTarget,
  DragSession,
  DragSourceConfig,
  DropTargetConfig,
  getDragSession,
  installDndEngine,
  subscribeDragSession,
} from "./engine";

/** Mount once per window, at the root. */
export const useDndEngine = () => {
  useEffect(() => installDndEngine(document), []);
};

/**
 * Make a node draggable. The returned ref callback is stable for the life of
 * the component and the config is read when a drag begins, so it may close
 * over anything without re-registering the node.
 *
 * The engine marks the node `data-dragging` while it is dragged; there is no
 * `isDragging` state to render from, on purpose.
 */
export const useDragSource = (config: DragSourceConfig) => {
  const latest = useLatestRef(config);
  const handle = useMemo(() => createDragSource(() => latest.current), [latest]);
  return handle.attach;
};

/**
 * Make a node a drop target. `isOver` re-renders this component alone, and
 * only when the drag enters or leaves it; the node is also marked `data-over`.
 *
 * There is no `canDrop` here: it would re-render every target on the page at
 * the start of every drag. Style it from `:root[data-dnd-active]` (the
 * `can-drop:` variant), or read `useDragSession()` in the few components that
 * really change shape while something is in the air.
 */
export const useDropTarget = (config: DropTargetConfig) => {
  const latest = useLatestRef(config);
  const handle = useMemo(() => createDropTarget(() => latest.current), [latest]);
  const isOver = useSyncExternalStore(handle.subscribe, handle.isOver);
  return { ref: handle.attach, isOver };
};

/** The drag in the air over this window, if any. Re-renders as it starts and ends. */
export const useDragSession = (): DragSession | null =>
  useSyncExternalStore(subscribeDragSession, getDragSession);

/**
 * Spring-loading, as a file manager's folders: a drag that rests on the node
 * for `delayMs` fires `onFire`, so the drop can land somewhere that was not on
 * screen when the drag began. The node takes no drop of its own.
 */
export const useSpringLoaded = ({
  accepts,
  delayMs,
  onFire,
  enabled = true,
}: {
  accepts: (session: DragSession) => boolean;
  delayMs: number;
  onFire: () => void;
  enabled?: boolean;
}) => {
  const { ref, isOver } = useDropTarget({ accepts, hoverOnly: true });
  const fire = useLatestRef(onFire);

  useEffect(() => {
    if (!isOver || !enabled) return;
    const timer = window.setTimeout(() => fire.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, [isOver, enabled, delayMs, fire]);

  return { ref, isOver };
};

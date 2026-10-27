import { demoModel } from "@/core/blok/renderer/declarations";
import * as React from "react";
import { createPortal } from "react-dom";
import BlokRenderer from "@/core/blok/renderer/BlokRenderer";
import { normalizeBlokComponentTree } from "@/core/blok/renderer/runtime";
import type { UseLogoTree } from "@/core/blok/logo/CachedBlokLogo";
import { AsyncBoundary } from "@/core/ui/AsyncBoundary";
import { cn } from "@/core/util/utils";
import { loadPreview, markPreviewFailed, previewFailed, savePreview } from "./previewCache";
import { useSnapshotSlot } from "./queue";
import { captureSnapshot, placeSnapshot, type BlokSnapshot } from "./snapshot";
import { BlokReadyProvider, type BlokReadySignal } from "./snapshotMode";

/** How long a drawing must stay unchanged before it is kept. */
const SETTLE_MS = 300;
/**
 * A drawing that has not settled by then (a tree that never came, a model
 * still loading) is not kept. Generous: it only ever costs the one slot.
 */
const GIVE_UP_MS = 30_000;
/** The viewport a preview is drawn in. The card scales it down to its own width. */
const VIEWPORT = { width: 800, height: 500 };

/** Previews never act: whatever a blok binds to an agent is dropped. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * Fetches the tree (and demo state) of the blok `cacheId` names; called only
 * when no preview is kept for it, and only once its turn to be drawn came. A
 * hook, passed by the module that owns the blok: the same function on every render.
 */
export type UseBlokTree = UseLogoTree;

type HostProps = { children: React.ReactNode };

export type CachedBlokPreviewProps = {
  cacheId: string;
  hash: string;
  useTree: UseBlokTree;
  /** The module's providers a drawing needs (its scene and asset hosts). */
  Host?: React.ComponentType<HostProps>;
  /**
   * What else a drawing depends on besides the blok (the agents its files come
   * from). A drawing that failed is not tried again in this window for the
   * same binding; another may succeed, and what it keeps serves every binding.
   */
  binding?: string;
  /**
   * How the drawing meets the box: `width` scales it to the box's width and
   * crops the bottom (a box of the viewport's aspect, `aspect-[8/5]`); `cover`
   * fills the box, cropping what overflows (a card's background).
   */
  fit?: "width" | "cover";
  /** Shown while there is no preview: before the first drawing, and when one could not be kept. */
  fallback?: React.ReactNode;
  className?: string;
};

/**
 * A panel or scene blok, as a still preview: drawn once against its demo
 * state and kept (`previewCache.ts`), then placed as inert markup scaled to
 * the box. The box should have the viewport's aspect (`aspect-[8/5]`); a
 * taller drawing is cropped at the bottom.
 *
 * It never blocks the thread it shares with the app: a kept preview is read
 * from IndexedDB and placed with a string replacement; a first drawing waits
 * for the window's single preview slot, granted in an idle period, renders
 * offscreen as an interruptible transition, encodes its canvases
 * asynchronously and cleans its markup in another idle period. Boxes off
 * screen are not laid out (`content-visibility: auto`).
 */
export const CachedBlokPreview = (props: CachedBlokPreviewProps) => (
  <CachedPreview key={`${props.cacheId}:${props.hash}:${props.binding ?? ""}`} {...props} />
);

type Cached =
  | { status: "loading" }
  | { status: "hit"; snapshot: BlokSnapshot }
  | { status: "miss" }
  | { status: "failed" };

const CachedPreview = ({
  cacheId,
  hash,
  binding = "",
  useTree,
  Host,
  fit = "width",
  fallback,
  className,
}: CachedBlokPreviewProps) => {
  const [cached, setCached] = React.useState<Cached>({ status: "loading" });
  const prefix = `blokpreview${React.useId().replace(/[^A-Za-z0-9]/g, "")}`;

  React.useEffect(() => {
    let current = true;
    void loadPreview(cacheId, hash).then((snapshot) => {
      if (!current) return;
      if (snapshot) setCached({ status: "hit", snapshot });
      else setCached({ status: previewFailed(cacheId, hash, binding) ? "failed" : "miss" });
    });
    return () => {
      current = false;
    };
  }, [cacheId, hash, binding]);

  const done = React.useCallback(
    (snapshot: BlokSnapshot | null) => {
      if (!snapshot) {
        markPreviewFailed(cacheId, hash, binding);
        setCached({ status: "failed" });
        return;
      }
      setCached({ status: "hit", snapshot });
      void savePreview(cacheId, hash, snapshot);
    },
    [cacheId, hash, binding],
  );

  const box = cn("relative overflow-hidden [content-visibility:auto]", className);
  if (cached.status === "hit") {
    return <PlacedSnapshot snapshot={cached.snapshot} prefix={prefix} fit={fit} className={box} />;
  }
  return (
    <div className={box}>
      {cached.status !== "loading" && fallback}
      {cached.status === "miss" && (
        <FirstDrawing cacheId={cacheId} hash={hash} useTree={useTree} Host={Host} onDone={done} />
      )}
    </div>
  );
};

type Placement = { scale: number; left: number };

/** A kept preview, scaled from its viewport to the box. */
const PlacedSnapshot = ({
  snapshot,
  prefix,
  fit,
  className,
}: {
  snapshot: BlokSnapshot;
  prefix: string;
  fit: "width" | "cover";
  className: string;
}) => {
  const box = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<Placement | null>(null);
  const markup = React.useMemo(() => placeSnapshot(snapshot.html, prefix), [snapshot.html, prefix]);

  React.useLayoutEffect(() => {
    const element = box.current;
    if (!element || !snapshot.width) return;
    const measure = () => {
      const byWidth = element.clientWidth / snapshot.width;
      if (fit === "width" || !snapshot.height) return setPlacement({ scale: byWidth, left: 0 });
      // Covers the box, centred across, anchored at the top (where a blok starts).
      const scale = Math.max(byWidth, element.clientHeight / snapshot.height);
      setPlacement({ scale, left: (element.clientWidth - snapshot.width * scale) / 2 });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit, snapshot.width, snapshot.height]);

  return (
    <div ref={box} className={className} aria-hidden>
      <div
        inert
        className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
        style={{
          width: snapshot.width,
          height: snapshot.height,
          transform: `translateX(${placement?.left ?? 0}px) scale(${placement?.scale ?? 0})`,
          visibility: placement?.scale ? undefined : "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </div>
  );
};

/** Waits for the preview slot, then draws the blok offscreen once and hands back what it drew. */
const FirstDrawing = (props: {
  cacheId: string;
  hash: string;
  useTree: UseBlokTree;
  Host?: React.ComponentType<HostProps>;
  onDone: (snapshot: BlokSnapshot | null) => void;
}) => {
  const granted = useSnapshotSlot(true);
  // Mounted as a transition: React renders the drawing in slices, yielding to input.
  const [drawing, setDrawing] = React.useState(false);
  React.useEffect(() => {
    if (granted) React.startTransition(() => setDrawing(true));
  }, [granted]);
  return drawing ? createPortal(<Drawing {...props} />, document.body) : null;
};

const nextFrames = (count: number): Promise<void> =>
  new Promise((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
    step(count);
  });

const PassThrough = ({ children }: HostProps) => <>{children}</>;

const Failed = ({ onDone }: { onDone: (snapshot: null) => void }) => {
  React.useEffect(() => onDone(null), [onDone]);
  return null;
};

const Drawing = ({
  cacheId,
  hash,
  useTree,
  Host = PassThrough,
  onDone,
}: {
  cacheId: string;
  hash: string;
  useTree: UseBlokTree;
  Host?: React.ComponentType<HostProps>;
  onDone: (snapshot: BlokSnapshot | null) => void;
}) => {
  const tree = useTree(cacheId);
  const container = React.useRef<HTMLDivElement>(null);
  const [holding, setHolding] = React.useState(0);
  // What the blok's parts report through `useBlokReady`: holds, or a failure.
  const signal = React.useMemo<BlokReadySignal>(
    () => ({
      fail: () => onDone(null),
      hold: () => {
        setHolding((count) => count + 1);
        let released = false;
        return () => {
          if (released) return;
          released = true;
          setHolding((count) => count - 1);
        };
      },
    }),
    [onDone],
  );
  const roots = React.useMemo(
    () => normalizeBlokComponentTree((tree?.componentTree as unknown[] | null) ?? null).roots,
    [tree?.componentTree],
  );
  // A blok that changed since its list was fetched is not kept under the old hash.
  // A preview shows the blok's demo: every read answered by it, nothing pending.
  const demoState = React.useMemo(() => (tree ? demoModel(roots, tree) : {}), [roots, tree]);
  const stale = !!tree && tree.hash !== hash;
  const empty = !!tree && roots.length === 0;
  // `undefined` is still coming; `null` will not come (failed, or no such blok).
  const missing = tree === null;

  React.useEffect(() => {
    if (stale || empty || missing) onDone(null);
  }, [stale, empty, missing, onDone]);

  React.useEffect(() => {
    const timer = setTimeout(() => onDone(null), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  React.useEffect(() => {
    const element = container.current;
    if (!element || !tree || stale || empty || holding > 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const keep = () => void capture().catch(() => !cancelled && onDone(null));
    const capture = async () => {
      observer.disconnect();
      // Every part reported ready: let a canvas paint what that changed.
      await nextFrames(2);
      await document.fonts?.ready;
      await Promise.all(
        Array.from(element.querySelectorAll("img")).map((image) => image.decode().catch(() => undefined)),
      );
      if (cancelled) return;
      const snapshot = await captureSnapshot(element);
      if (!cancelled) onDone(snapshot);
    };
    // Kept once nothing has changed for a moment: props resolve over a few renders.
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(keep, SETTLE_MS);
    });
    observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });
    timer = setTimeout(keep, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [tree, stale, empty, holding, onDone]);

  return (
    <div
      ref={container}
      aria-hidden
      inert
      // Offscreen, not hidden: a canvas must still paint to be read.
      style={{
        position: "fixed",
        left: -20_000,
        top: 0,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
        contain: "strict",
        pointerEvents: "none",
      }}
    >
      {tree && roots.length > 0 && !stale && (
        <AsyncBoundary loadingFallback={null} errorFallback={() => <Failed onDone={onDone} />}>
          <BlokReadyProvider value={signal}>
            <Host>
              <BlokRenderer
                surfaceId={`preview-${cacheId}`}
                uiComponents={roots}
                initialState={demoState}
                chrome="none"
                refuseAction={REFUSE_EVERY_ACTION}
              />
            </Host>
          </BlokReadyProvider>
        </AsyncBoundary>
      )}
    </div>
  );
};

export default CachedBlokPreview;

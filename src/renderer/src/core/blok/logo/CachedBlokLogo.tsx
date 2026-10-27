import type { BlokDeclarations } from "@/core/blok/renderer/declarations";
import * as React from "react";
import BlokRenderer from "@/core/blok/renderer/BlokRenderer";
import { normalizeBlokComponentTree } from "@/core/blok/renderer/runtime";
import { cn } from "@/core/util/utils";
import { logoDataModel } from "./demo";
import { inlineDrawing, loadLogo, saveLogo, serializeDrawing } from "./logoCache";

/** How long a first drawing must stay unchanged before it is kept. */
const SETTLE_MS = 150;

/** Logos never act: whatever a logo blok binds to an agent is dropped. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * What a logo is drawn from: its tree (the wire spelling, a list of roots) and
 * the demo it shows (v2 `demo`: `{deps, args, task, queries}`, see `demo.ts`).
 */
/** What a kept drawing is made from: its tree, what it declares beside it (`demo` above all), and its hash. */
export type LogoTree = BlokDeclarations & { componentTree?: unknown; hash: string };

/**
 * Fetches the tree of the logo `cacheId` names; called only when no drawing is
 * kept for it. A hook, passed by the module that owns the blok (rekuest,
 * kabinet): it must be the same function on every render.
 */
export type UseLogoTree = (cacheId: string) => LogoTree | null | undefined;

/**
 * A logo blok (context LOGO: an agent's logo or an action's), drawn in a box.
 *
 * A logo shows its demo, so it is the same picture every time: it is
 * drawn once and kept (`logoCache.ts`). The first showing renders the blok and
 * keeps the `<svg>` it drew under `cacheId` and `hash`; every later one places
 * it inline, without fetching the tree. A module prefixes its `cacheId`s so two
 * services' blok ids never meet.
 *
 * Its box is a `data-logo-host`: hovering it plays the logo's animations, as
 * does `active` (an action of it running).
 */
export const CachedBlokLogo = ({
  cacheId,
  hash,
  useTree,
  className,
  active,
}: {
  cacheId: string;
  hash: string;
  useTree: UseLogoTree;
  className?: string;
  active?: boolean;
}) => (
  <CachedLogo
    key={`${cacheId}:${hash}`}
    cacheId={cacheId}
    hash={hash}
    useTree={useTree}
    className={className}
    active={active}
  />
);

type Cached = { status: "loading" } | { status: "hit"; svg: string } | { status: "miss" };

const CachedLogo = ({
  cacheId,
  hash,
  useTree,
  className,
  active,
}: {
  cacheId: string;
  hash: string;
  useTree: UseLogoTree;
  className?: string;
  active?: boolean;
}) => {
  const [cached, setCached] = React.useState<Cached>({ status: "loading" });
  const prefix = `logo${React.useId().replace(/[^A-Za-z0-9]/g, "")}`;
  // A kept drawing that is not one a logo blok makes is drawn again instead.
  const markup = React.useMemo(
    () => (cached.status === "hit" ? inlineDrawing(cached.svg, prefix) : null),
    [cached, prefix],
  );
  const drawn = React.useCallback((svg: string) => setCached({ status: "hit", svg }), []);

  React.useEffect(() => {
    let current = true;
    void loadLogo(cacheId, hash).then((svg) => {
      if (current) setCached(svg ? { status: "hit", svg } : { status: "miss" });
    });
    return () => {
      current = false;
    };
  }, [cacheId, hash]);

  const box = cn("relative shrink-0 overflow-hidden", className);
  const playing = active ? "" : undefined;
  if (cached.status === "loading") return <span className={box} aria-hidden />;
  if (markup) {
    return (
      <span
        data-logo-host=""
        data-logo-active={playing}
        className={cn(box, "[&>svg]:size-full")}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  }
  return (
    <FirstDrawing cacheId={cacheId} hash={hash} useTree={useTree} className={box} active={playing} onDrawn={drawn} />
  );
};

/** Renders the logo blok once, and keeps what it drew. */
const FirstDrawing = ({
  cacheId,
  hash,
  useTree,
  className,
  active,
  onDrawn,
}: {
  cacheId: string;
  hash: string;
  useTree: UseLogoTree;
  className: string;
  active?: "";
  onDrawn: (svg: string) => void;
}) => {
  const tree = useTree(cacheId);
  const container = React.useRef<HTMLSpanElement>(null);
  const initialState = React.useMemo(() => logoDataModel(tree?.demo), [tree?.demo]);
  const roots = React.useMemo(
    () => normalizeBlokComponentTree((tree?.componentTree as unknown[] | null) ?? null).roots,
    [tree?.componentTree],
  );

  React.useEffect(() => {
    const element = container.current;
    // A blok that changed since its list was fetched is drawn, but not kept under the old hash.
    if (!element || !tree || tree.hash !== hash) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const keep = () => {
      const svg = serializeDrawing(element);
      if (!svg) return;
      observer.disconnect();
      void saveLogo(cacheId, hash, svg).then(() => onDrawn(svg));
    };
    // Kept once nothing has changed for a moment: props resolve over a few renders.
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(keep, SETTLE_MS);
    });
    observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });
    timer = setTimeout(keep, SETTLE_MS);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [tree, cacheId, hash, onDrawn]);

  return (
    <span ref={container} data-logo-host="" data-logo-active={active} className={className}>
      {tree && roots.length > 0 && (
        <BlokRenderer
          surfaceId={`logo-${cacheId}`}
          uiComponents={roots}
          initialState={initialState}
          chrome="none"
          refuseAction={REFUSE_EVERY_ACTION}
        />
      )}
    </span>
  );
};

export default CachedBlokLogo;

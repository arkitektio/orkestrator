import * as React from "react";
import { cn } from "@/core/util/utils";
import DemoBlokRenderer from "@/rekuest/components/DemoBlokRenderer";
import { AgentLogoFragment, BlokLogoFragment, useLogoBlokQuery } from "@/rekuest/api/graphql";
import { inlineDrawing, loadLogo, saveLogo, serializeDrawing } from "./logoCache";

/** How long a first drawing must stay unchanged before it is kept. */
const SETTLE_MS = 150;

/** Logos never act: whatever a logo blok binds to an agent is dropped. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * A logo blok (context LOGO), drawn in a box: an agent's, an action's.
 *
 * A logo shows its demo state, never an agent's live state. Since that makes
 * it the same picture every time, it is drawn once and kept (`logoCache.ts`):
 * the first showing renders the blok and keeps the `<svg>` it drew under the
 * blok's hash, and every later one places it inline. No blok shows nothing.
 *
 * Its box is a `data-logo-host`: hovering it plays the logo's animations.
 */
export const BlokLogo = ({ blok, className }: { blok?: BlokLogoFragment | null; className?: string }) => {
  if (!blok) return null;
  return <CachedLogo key={`${blok.id}:${blok.hash}`} blokId={blok.id} hash={blok.hash} className={className} />;
};

/** An agent's logo: the blok it declared as its default for the LOGO context. */
export const AgentLogo = ({ agent, className }: { agent: AgentLogoFragment; className?: string }) => (
  <BlokLogo blok={agent.logo?.blok} className={className} />
);

type Cached = { status: "loading" } | { status: "hit"; svg: string } | { status: "miss" };

const CachedLogo = ({ blokId, hash, className }: { blokId: string; hash: string; className?: string }) => {
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
    void loadLogo(blokId, hash).then((svg) => {
      if (current) setCached(svg ? { status: "hit", svg } : { status: "miss" });
    });
    return () => {
      current = false;
    };
  }, [blokId, hash]);

  const box = cn("relative shrink-0 overflow-hidden", className);
  if (cached.status === "loading") return <span className={box} aria-hidden />;
  if (markup) {
    return <span data-logo-host="" className={cn(box, "[&>svg]:size-full")} dangerouslySetInnerHTML={{ __html: markup }} />;
  }
  return (
    <FirstDrawing
      blokId={blokId}
      hash={hash}
      className={box}
      onDrawn={drawn}
    />
  );
};

/** Renders the logo blok once, and keeps what it drew. */
const FirstDrawing = ({
  blokId,
  hash,
  className,
  onDrawn,
}: {
  blokId: string;
  hash: string;
  className: string;
  onDrawn: (svg: string) => void;
}) => {
  const { data } = useLogoBlokQuery({ variables: { id: blokId } });
  const container = React.useRef<HTMLSpanElement>(null);
  const blok = data?.blok;

  React.useEffect(() => {
    const element = container.current;
    // A blok that changed since the agent list was fetched is drawn, but not kept under the old hash.
    if (!element || !blok || blok.hash !== hash) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const keep = () => {
      const svg = serializeDrawing(element);
      if (!svg) return;
      observer.disconnect();
      void saveLogo(blokId, hash, svg).then(() => onDrawn(svg));
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
  }, [blok, blokId, hash, onDrawn]);

  return (
    <span ref={container} data-logo-host="" className={className}>
      {blok && (
        <DemoBlokRenderer
          blok={{ id: blok.id, componentTree: blok.componentTree, demoState: blok.demoState }}
          surfaceId={`logo-${blok.id}`}
          chrome="none"
          refuseAction={REFUSE_EVERY_ACTION}
        />
      )}
    </span>
  );
};

export default BlokLogo;

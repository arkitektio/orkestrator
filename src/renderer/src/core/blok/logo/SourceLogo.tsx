import * as React from "react";
import { parseBsxSafe } from "@/core/blok/bsx/parse";
import { CachedBlokLogo, type LogoTree, type UseLogoTree } from "./CachedBlokLogo";

/**
 * A logo blok this app carries as BSX source rather than fetches: a local
 * action's logo (`Action.logo`). Parsed here with the client's BSX port, then
 * drawn and kept like any logo blok (`CachedBlokLogo`), under a hash of the
 * source, so an edited logo is drawn again.
 */

const trees = new Map<string, LogoTree | null>();

/** FNV-1a: a stable name for a source, not a guard against anyone. */
const hashSource = (source: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/** Parses `source` once, and names what it parsed into. */
const sourceTree = (source: string): { cacheId: string; hash: string } => {
  const hash = hashSource(source);
  const cacheId = `bsx:${hash}`;
  if (!trees.has(cacheId)) {
    const parsed = parseBsxSafe(source);
    if (!parsed.ok) console.error("A logo's BSX does not parse:", parsed.error, source);
    // An action logo reads only `task`: none, when it is drawn to be kept.
    trees.set(cacheId, parsed.ok ? { componentTree: [parsed.tree], resolvedLocals: [], demo: { task: null }, hash } : null);
  }
  return { cacheId, hash };
};

const useSourceTree: UseLogoTree = (cacheId) => trees.get(cacheId);

export const SourceLogo = ({
  source,
  className,
  active,
}: {
  source: string;
  className?: string;
  active?: boolean;
}) => {
  const { cacheId, hash } = React.useMemo(() => sourceTree(source), [source]);
  return <CachedBlokLogo cacheId={cacheId} hash={hash} useTree={useSourceTree} className={className} active={active} />;
};

export default SourceLogo;

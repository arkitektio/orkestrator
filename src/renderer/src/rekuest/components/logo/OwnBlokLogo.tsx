import { blokLogoTree } from "@arkitektio/bsx/bsx/index";
import { logoDataModel } from "@arkitektio/bsx/logo/demo";
import BlokRenderer from "@arkitektio/bsx/renderer/BlokRenderer";
import { useMemo } from "react";
import { CachedBlokLogo, type LogoTree } from "@arkitektio/bsx/logo/CachedBlokLogo";
import type { BlokComponentNode } from "@arkitektio/bsx/renderer/runtime/index";
import { cn } from "@/core/util/utils";
import { ComponentContext, useLogoBlokQuery } from "@/rekuest/api/graphql";
import { BLOK_CONTEXTS } from "../blokContexts";
import { useBlokDocument } from "../blokDocument";

/** The cache a blok's own logo is kept under: apart from the blok itself (a logo blok's). */
const OWN = "own:";

/** The root of a stored tree (a list holding its one `<Blok>`), or null. */
const rootOf = (tree: unknown): BlokComponentNode | null => {
  const root = Array.isArray(tree) ? tree[0] : tree;
  return root && typeof root === "object" ? (root as BlokComponentNode) : null;
};

/**
 * A blok's own `<logo>`, lifted out of its tree as a logo blok of its own (`blokLogoTree`).
 * Fetched only for a first drawing: the drawing is kept for the blok's hash.
 */
export const useOwnLogoTree = (cacheId: string): LogoTree | null | undefined => {
  const { data, loading } = useLogoBlokQuery({ variables: { id: cacheId.slice(OWN.length) } });
  if (loading && !data) return undefined;
  const blok = data?.blok;
  const logo = blok ? blokLogoTree(rootOf(blok.componentTree)) : null;
  if (!blok || !logo) return null;
  // A <logo> is literals only: it declares no locals and reads no demo.
  return { componentTree: [logo], resolvedLocals: [], hash: blok.hash };
};

export type OwnLogoBlok = {
  id: string;
  hash: string;
  context: ComponentContext;
  hasLogo: boolean;
};

/**
 * What stands for a blok in a list, a pin, a header or a tab: its own `<logo>` when it declares
 * one (drawn once and kept, like every logo), else its context's icon.
 */
export const OwnBlokLogo = ({ blok, className }: { blok: OwnLogoBlok; className?: string }) => {
  if (blok.hasLogo) {
    return <CachedBlokLogo cacheId={`${OWN}${blok.id}`} hash={blok.hash} useTree={useOwnLogoTree} className={className} />;
  }
  const Icon = BLOK_CONTEXTS[blok.context]?.icon;
  return Icon ? <Icon aria-hidden className={cn("shrink-0", className)} /> : null;
};

export default OwnBlokLogo;

/** Logos never act. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * The `<logo>` of a blok being written, drawn live from its tree (not kept: it changes with every
 * keystroke). Nothing while the draft declares none.
 */
export const DraftBlokLogo = ({ tree, className }: { tree: BlokComponentNode | null; className?: string }) => {
  const logo = useMemo(() => blokLogoTree(tree), [tree]);
  const { roots } = useBlokDocument(logo ? [logo] : null);
  const initialState = useMemo(() => logoDataModel(undefined), []);
  if (!logo) return null;
  return (
    <span data-logo-host="" className={cn("relative shrink-0 overflow-hidden", className)}>
      <BlokRenderer
        key={JSON.stringify(logo)}
        surfaceId="draft-blok-logo"
        uiComponents={roots}
        initialState={initialState}
        chrome="none"
        refuseAction={REFUSE_EVERY_ACTION}
      />
    </span>
  );
};

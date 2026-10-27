import { CachedBlokLogo, type LogoTree } from "@/core/blok/logo/CachedBlokLogo";
import { AgentLogoFragment, BlokLogoFragment, useLogoBlokQuery } from "@/rekuest/api/graphql";

/**
 * A rekuest blok's tree and demo, fetched only for a first drawing (a
 * logo's, a preview's). Cached under the bare blok id.
 */
export const useRekuestBlokTree = (blokId: string): LogoTree | null | undefined => {
  const { data, loading } = useLogoBlokQuery({ variables: { id: blokId } });
  // Undefined while it comes; null once it will not (failed, or no such blok).
  if (loading && !data) return undefined;
  const blok = data?.blok;
  if (!blok) return null;
  return { componentTree: blok.componentTree, resolvedLocals: blok.resolvedLocals, demo: blok.demo, hash: blok.hash };
};

/**
 * A logo blok (context LOGO), drawn in a box: an agent's, an action's.
 *
 * A logo shows its demo, never an agent's live state, so it is drawn
 * once and kept (`CachedBlokLogo`): a list of agents renders no bloks, and
 * fetches no trees. No blok shows nothing.
 */
export const BlokLogo = ({ blok, className }: { blok?: BlokLogoFragment | null; className?: string }) => {
  if (!blok) return null;
  return <CachedBlokLogo cacheId={blok.id} hash={blok.hash} useTree={useRekuestBlokTree} className={className} />;
};

/** An agent's logo: the blok it declared as its default for the LOGO context. */
export const AgentLogo = ({ agent, className }: { agent: AgentLogoFragment; className?: string }) => (
  <BlokLogo blok={agent.logo?.blok} className={className} />
);

export default BlokLogo;

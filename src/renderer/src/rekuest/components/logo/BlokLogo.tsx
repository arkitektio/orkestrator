import { CachedBlokLogo, type LogoTree } from "@/core/blok/logo/CachedBlokLogo";
import { AgentLogoFragment, BlokLogoFragment, useLogoBlokQuery } from "@/rekuest/api/graphql";

/** A rekuest blok's tree, fetched only for a first drawing. Cached under the bare blok id. */
const useRekuestLogoTree = (blokId: string): LogoTree | null => {
  const { data } = useLogoBlokQuery({ variables: { id: blokId } });
  return data?.blok ?? null;
};

/**
 * A logo blok (context LOGO), drawn in a box: an agent's, an action's.
 *
 * A logo shows its demo state, never an agent's live state, so it is drawn
 * once and kept (`CachedBlokLogo`): a list of agents renders no bloks, and
 * fetches no trees. No blok shows nothing.
 */
export const BlokLogo = ({ blok, className }: { blok?: BlokLogoFragment | null; className?: string }) => {
  if (!blok) return null;
  return <CachedBlokLogo cacheId={blok.id} hash={blok.hash} useTree={useRekuestLogoTree} className={className} />;
};

/** An agent's logo: the blok it declared as its default for the LOGO context. */
export const AgentLogo = ({ agent, className }: { agent: AgentLogoFragment; className?: string }) => (
  <BlokLogo blok={agent.logo?.blok} className={className} />
);

export default BlokLogo;

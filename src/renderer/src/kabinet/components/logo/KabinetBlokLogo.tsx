import { CachedBlokLogo, type LogoTree } from "@arkitektio/bsx/logo/CachedBlokLogo";
import { parseBlokDeclarations } from "@arkitektio/bsx/renderer/declarations";
import { KabinetLogoBlokFragment, useKabinetLogoTreeQuery } from "@/kabinet/api/graphql";

/** kabinet's blok ids (`<flavour id>:<key>`) are kept apart from every other service's. */
export const KABINET_CACHE_PREFIX = "kabinet:";

/**
 * A flavour blok's tree (any context: a logo, a panel's preview), fetched only
 * for a first drawing. Takes the `kabinet:`-prefixed cache id.
 */
export const useKabinetBlokTree = (cacheId: string): LogoTree | null => {
  const { data } = useKabinetLogoTreeQuery({ variables: { id: cacheId.slice(KABINET_CACHE_PREFIX.length) } });
  const blok = data?.flavourBlok;
  if (!blok) return null;
  return { ...parseBlokDeclarations(blok), componentTree: blok.componentTree, hash: blok.hash };
};

/**
 * A logo blok an app brings (its logo, an action's), drawn against its demo
 * and kept: a list of apps or definitions fetches no trees once
 * each has been drawn. No blok shows nothing.
 */
export const KabinetBlokLogo = ({
  blok,
  className,
}: {
  blok?: KabinetLogoBlokFragment | null;
  className?: string;
}) => {
  if (!blok) return null;
  return (
    <CachedBlokLogo
      cacheId={`${KABINET_CACHE_PREFIX}${blok.id}`}
      hash={blok.hash}
      useTree={useKabinetBlokTree}
      className={className}
    />
  );
};

/** The logo an action definition is drawn with, when one of its flavours names one. */
export const DefinitionLogo = ({
  definition,
  className,
}: {
  definition: { logo?: KabinetLogoBlokFragment | null };
  className?: string;
}) => <KabinetBlokLogo blok={definition.logo} className={className} />;

export default KabinetBlokLogo;

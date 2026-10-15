import { CachedBlokLogo, type LogoTree } from "@/core/blok/logo/CachedBlokLogo";
import { KabinetLogoBlokFragment, useKabinetLogoTreeQuery } from "@/kabinet/api/graphql";

/** kabinet's blok ids (`<flavour id>:<key>`) are kept apart from every other service's. */
const CACHE_PREFIX = "kabinet:";

/** A flavour blok's tree, fetched only for a first drawing. */
const useKabinetLogoTree = (cacheId: string): LogoTree | null => {
  const { data } = useKabinetLogoTreeQuery({ variables: { id: cacheId.slice(CACHE_PREFIX.length) } });
  return data?.flavourBlok ?? null;
};

/**
 * A logo blok an app brings (its LOGO, an action's ACTION_LOGO), drawn against
 * its demo state and kept: a list of apps or definitions fetches no trees once
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
      cacheId={`${CACHE_PREFIX}${blok.id}`}
      hash={blok.hash}
      useTree={useKabinetLogoTree}
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

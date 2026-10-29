import {configureBlokPlatform} from '@arkitektio/bsx/runtime';
import {defaultBlokCatalog} from './catalog';

/**
 * Gives the blok renderer the app's catalog, as `platform.ts` does for the app
 * (imported by `main.tsx`, which no test loads). Without it every renderer
 * falls back to base@2 alone, and a blok's `Text`, `Card` or `AgentLogo` reads
 * as an unknown component. Only the catalog: the rest of the platform keeps the
 * package's defaults, which need no theme provider or toast island.
 */
export const installAppBlokCatalog = (): void => {
  configureBlokPlatform({catalog: defaultBlokCatalog});
};

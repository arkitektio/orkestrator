import {RawInspector} from './bloks/inspector/Inspector';
import {lovekitBlokComponents} from './bloks/lovekit';
import {shadcnComposableComponents} from './bloks/primitives/Primitives';
import {standardBlokFunctions} from './functions';
import {createBlokCatalog} from './runtime';

/**
 * The catalog a blok payload is validated and rendered against: which
 * components exist, which functions a `utilCall` may name.
 *
 * The backend does not enumerate either — `ComponentNode.component` and
 * `UtilCall.operation` are free-form strings — so this module is the authority,
 * and `describeBlokCatalog` turns it into the published manifest.
 */
/**
 * The name this client registers `defaultBlokCatalog` under on the rekuest
 * server (`registerUiCatalog`, upsert by name). Bloks reference catalogs by
 * this name; the URL below stays the client-side catalog id.
 */
export const UI_CATALOG_NAME = 'orkestrator';
export const UI_CATALOG_DESCRIPTION =
  'Components and functions rendered by the Orkestrator desktop app';

export const defaultBlokCatalog = createBlokCatalog(
  'https://arkitekt.live/catalogs/v1.json',
  [...shadcnComposableComponents, ...lovekitBlokComponents, RawInspector],
  standardBlokFunctions,
);

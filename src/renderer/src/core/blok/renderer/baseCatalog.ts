import {controlBlokComponents} from './bloks/control';
import {queryBlokComponents} from './bloks/query';
import {standardBlokFunctions} from './functions';
import {createBlokCatalog, type BlokCatalog} from './runtime';

/**
 * The base catalog: what every blok may use whichever UI draws it — control
 * flow (`foreach`, `if`, `when`, `match`/`case`/`default`, `fragment`, the
 * record slots `pending`/`failed`/`empty`/`ready`), the read-only GraphQL
 * `query`, and the fixed-signature standard function library. Base elements
 * are named in lowercase; a UI catalog (orkestrator's, `./catalog.tsx`)
 * extends it with what it draws and may not redefine any of it
 * (`extendBlokCatalog`).
 *
 * The server holds the same catalog (`base@1`, rekuest
 * `rekuest_core/catalogs/base_v1.json`, vendored here as `./base_v1.json` and
 * in arkitekt-spec); `functions/base.test.ts` keeps the two in step.
 */
export const BASE_CATALOG_NAME = 'base';
export const BASE_CATALOG_VERSION = 1;
export const BASE_CATALOG_ID = `${BASE_CATALOG_NAME}@${BASE_CATALOG_VERSION}`;

export const baseBlokCatalog: BlokCatalog = createBlokCatalog(
  BASE_CATALOG_ID,
  [...controlBlokComponents, ...queryBlokComponents],
  standardBlokFunctions,
);

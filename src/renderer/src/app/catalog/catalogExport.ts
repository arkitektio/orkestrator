import { addBlokComponents } from "@/core/blok/catalog";
import { MIKRO_MODULE } from "@/mikro/module";
import { buildCatalogExport as buildCoreCatalogExport } from "@/rekuest/catalog/catalogExport";

/**
 * The catalog this app publishes, module components included: what
 * `scripts/export-blok-catalog.mjs` writes and a release attaches.
 *
 * The composition root, because core may not import a module. A module is read
 * through its public entry (`<module>/module`), and only the modules that bring
 * bloks, never `app/modules/install`: every module's builtins at once is more
 * than plain node needs to load. Blok definitions import nothing heavy (their
 * renders are lazy, the scene's three.js and WebGPU behind them), and the
 * export test holds them to it.
 */
const MODULE_BLOKS = [...(MIKRO_MODULE.builtins.bloks ?? [])];

let added = false;

export const buildCatalogExport = () => {
  if (!added) {
    addBlokComponents(MODULE_BLOKS);
    added = true;
  }
  return buildCoreCatalogExport();
};

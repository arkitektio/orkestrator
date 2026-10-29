// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {baseBlokCatalog} from '@arkitektio/bsx/renderer/baseCatalog';
import {UI_CATALOG_NAME} from '@/core/blok/catalog';
import {buildCatalogExport} from './catalogExport';

/**
 * Guards the JSON documents `scripts/export-blok-catalog.mjs` writes and the
 * release attaches. A renamed module, a non-serializable value or a catalog
 * no longer claimed would otherwise only show up in a published asset.
 */
describe('buildCatalogExport', () => {
  it('survives a JSON round-trip unchanged', () => {
    const exported = buildCatalogExport();

    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });

  it('claims every global catalog, the ones it implements whole', () => {
    const {catalog, catalogs} = buildCatalogExport();

    expect(catalog.name).toBe(UI_CATALOG_NAME);
    expect(catalog.description).toBeTruthy();
    expect(catalogs).toEqual(['html@1', 'logo@1', 'scene@1', 'shadcn@1', 'structure@1', 'ui@1']);
    expect(catalog.catalogs).toEqual(catalogs);
    // A module adds components only: what a blok calls is the language's.
    expect(catalog.operations).toEqual([]);
  });

  it('publishes only what no global catalog holds: base and the claimed catalogs are named, not repeated', () => {
    const {catalog, module} = buildCatalogExport();
    const inCatalog = new Set(catalog.components.map(component => component.name));

    for (const name of [...baseBlokCatalog.components.keys(), 'Button', 'div', 'Scene', 'Sheet', 'Chart', 'AgentLogo', 'StructurePicker']) {
      expect(inCatalog.has(name), name).toBe(false);
    }
    expect(module.components.map(component => component.name)).toEqual([...inCatalog].sort());
  });
});

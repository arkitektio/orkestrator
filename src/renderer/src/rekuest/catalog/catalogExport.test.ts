// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {baseBlokCatalog} from '@arkitektio/bsx/renderer/baseCatalog';
import {UI_CATALOG_ID, UI_CATALOG_NAME, UI_CATALOG_VERSION} from '@/core/blok/catalog';
import {buildCatalogExport} from './catalogExport';

/**
 * Guards the JSON documents `scripts/export-blok-catalog.mjs` writes and the
 * release attaches. A renamed catalog, a non-serializable value or a context
 * no longer drawn whole would otherwise only show up in a published asset.
 */
describe('buildCatalogExport', () => {
  it('survives a JSON round-trip unchanged', () => {
    const exported = buildCatalogExport();

    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });

  it('speaks the base catalog, whole in every context', () => {
    const {catalog, catalogs, contexts} = buildCatalogExport();

    expect(catalog.name).toBe(UI_CATALOG_NAME);
    expect(catalog.description).toBeTruthy();
    expect(catalogs).toEqual(['base@3']);
    expect(contexts).toEqual(['HTML', 'SCENE', 'LOGO']);
    expect(catalog.catalogs).toEqual(catalogs);
    // A module adds components only: what a blok calls is the language's.
    expect(catalog.operations).toEqual([]);
  });

  it('publishes its own catalog under the address a blok names it by, on top of the base', () => {
    const {published} = buildCatalogExport();

    expect([published.id, published.name, published.version, published.minor]).toEqual([UI_CATALOG_ID, UI_CATALOG_NAME, UI_CATALOG_VERSION, 0]);
    expect(published.extends).toBe('https://arkitekt.live/catalogs/base/v3');
  });

  it('publishes only what the base catalog does not hold: its components are the spec\'s, never repeated', () => {
    const {catalog, published} = buildCatalogExport();
    const inCatalog = new Set(catalog.components.map(component => component.name));

    for (const name of [...baseBlokCatalog.components.keys(), 'Button', 'div', 'Scene', 'Sheet', 'Chart', 'AgentLogo', 'StructurePicker']) {
      expect(inCatalog.has(name), name).toBe(false);
    }
    expect(published.components.map(component => component.name)).toEqual([...inCatalog].sort());
  });
});

// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {baseBlokCatalog} from '@/core/blok/renderer/baseCatalog';
import {UI_CATALOG_NAME} from '@/core/blok/renderer/catalog';
import {buildCatalogExport} from './catalogExport';

/**
 * Guards the two JSON documents `scripts/export-blok-catalog.mjs` writes and
 * the release attaches. A drop to zero components, a non-serializable value or
 * a renamed catalog would otherwise only show up in a published asset.
 */
describe('buildCatalogExport', () => {
  it('survives a JSON round-trip unchanged', () => {
    const exported = buildCatalogExport();

    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
  });

  it('publishes the full registration payload', () => {
    const {catalog} = buildCatalogExport();

    expect(catalog.name).toBe(UI_CATALOG_NAME);
    expect(catalog.description).toBeTruthy();
    expect(catalog.components.length).toBeGreaterThan(100);
    expect(catalog.operations.length).toBeGreaterThan(10);
  });

  it('publishes the manifest under the catalog id', () => {
    const {manifest} = buildCatalogExport();

    expect(manifest.id).toBe('https://arkitekt.live/catalogs/v1.json');
    expect(manifest.functions.length).toBeGreaterThan(10);
  });

  it('publishes what this app adds to the base catalog, never the base itself', () => {
    const {catalog, manifest} = buildCatalogExport();
    const inCatalog = new Set(catalog.components.map(component => component.name));
    const operations = new Set(catalog.operations.map(operation => operation.name));

    for (const name of baseBlokCatalog.components.keys()) {
      expect(inCatalog.has(name), name).toBe(false);
      // The manifest describes what the renderer offers, base included.
      expect(manifest.components.some(component => component.name === name), name).toBe(true);
    }
    for (const name of baseBlokCatalog.functions.keys()) expect(operations.has(name), name).toBe(false);
    expect(operations.has('str.concat')).toBe(true);
  });

  it('carries the same UI components in both documents', () => {
    const {catalog, manifest} = buildCatalogExport();
    const inCatalog = new Set(catalog.components.map(component => component.name));
    const inManifest = new Set(manifest.components.map(component => component.name));

    // Spelled out rather than counted: an export that silently empties out, or
    // a family that stops being bundled, must go red here.
    for (const name of ['Button', 'div', 'Flex']) {
      expect(inCatalog.has(name)).toBe(true);
      expect(inManifest.has(name)).toBe(true);
    }
    const base = new Set(baseBlokCatalog.components.keys());
    expect(inCatalog).toEqual(new Set([...inManifest].filter(name => !base.has(name))));
  });
});

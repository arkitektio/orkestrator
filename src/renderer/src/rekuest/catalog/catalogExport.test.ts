// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {baseBlokCatalog} from '@/core/blok/renderer/baseCatalog';
import {UI_CATALOG_NAME} from '@/core/blok/renderer/catalog';
import {buildCatalogExport} from './catalogExport';
import {specOwnedComponents} from '@/core/blok/renderer/modules';
import {orkestratorModule} from '@/core/blok/spec/catalogs';

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
    const {catalog, catalogs} = buildCatalogExport();

    expect(catalog.name).toBe(UI_CATALOG_NAME);
    expect(catalog.description).toBeTruthy();
    // Its own extras only: the spec's standard catalogs are named, not repeated.
    expect(catalog.components.length).toBeGreaterThan(50);
    expect(catalogs).toEqual(['ui@1', 'scene@1', 'logo@1', 'structure@1', 'html@1']);
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

  it('publishes its extras, the orkestrator module, and nothing the spec owns', () => {
    const {catalog, manifest} = buildCatalogExport();
    const inCatalog = new Set(catalog.components.map(component => component.name));
    const inManifest = new Set(manifest.components.map(component => component.name));
    const owned = specOwnedComponents();

    for (const name of ['Sheet', 'DropdownMenu', 'Chart', 'RawInspector']) expect(inCatalog.has(name), name).toBe(true);
    for (const name of ['Button', 'div', 'Scene', 'Html', 'AgentLogo', 'ActionLogo', 'StructurePicker']) {
      expect(inCatalog.has(name), name).toBe(false);
      expect(inManifest.has(name), name).toBe(true);
    }
    expect(inCatalog).toEqual(new Set([...inManifest].filter(name => !owned.has(name))));
    expect([...inCatalog].filter(name => !orkestratorModule().components.some(component => component.name === name))).toEqual([]);
  });
});

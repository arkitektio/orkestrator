// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {defaultBlokCatalog} from './catalog';
import {defaultBlokView} from '@arkitektio/bsx/spec/catalogs';
import {isActionSchema} from '@arkitektio/bsx/renderer/runtime/index';
import {zodEnumValues, zodToCatalogKind} from '@/rekuest/catalog/uiCatalogInput';
import {CatalogValueKind} from '@/rekuest/api/graphql';

/**
 * Invariants of the published catalog. These are what make the registered
 * server copy usable for authoring: a name that is stable, a description on
 * every component and prop, and action props that are still recognisable as
 * actions after `.describe()` cloned their schema.
 */

const components = [...defaultBlokCatalog.components.values()];

describe('the blok catalog', () => {
  it('registers every component under a unique name', () => {
    const names = components.map(component => component.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('describes every component', () => {
    const undescribed = components
      .filter(component => !component.schema.description)
      .map(component => component.name);

    expect(undescribed).toEqual([]);
  });

  it('describes every prop', () => {
    const undescribed = components.flatMap(component =>
      Object.entries(component.schema.shape as Record<string, z.ZodTypeAny>)
        .filter(([, schema]) => !schema.description)
        .map(([key]) => `${component.name}.${key}`),
    );

    expect(undescribed).toEqual([]);
  });

  /**
   * `.describe()` clones a zod schema, and the action brand lives in a WeakSet
   * keyed by the schema object — so describing a branded schema directly would
   * quietly demote a handler to a value prop. Every action prop goes through
   * `actionProp`, which describes the `.optional()` wrapper instead; this is
   * the test that keeps that true.
   */
  it('keeps handler props recognisable as actions', () => {
    const handlerKeys = /^(on[A-Z]|action$)/;
    const demoted = components.flatMap(component =>
      Object.entries(component.schema.shape as Record<string, z.ZodTypeAny>)
        .filter(([key, schema]) => handlerKeys.test(key) && !isActionSchema(schema))
        .map(([key]) => `${component.name}.${key}`),
    );

    expect(demoted).toEqual([]);
  });

  it('publishes handler props as callbacks', () => {
    const buttonSchema = defaultBlokCatalog.components.get('Button')?.schema.shape as Record<
      string,
      z.ZodTypeAny
    >;

    expect(zodToCatalogKind(buttonSchema.onClick)).toBe(CatalogValueKind.Callback);
  });

  it('implements every component the spec catalogs hold, with every prop', () => {
    const view = defaultBlokView();
    // Drawn by a module (mikro) that installs them: not in the core catalog.
    const moduleProvided = new Set(['MikroScene', 'MikroSceneAnnotations', 'MikroSceneLayers', 'MikroSceneProbe', 'MikroSceneViewport']);
    const missing: string[] = [];
    const props: string[] = [];
    const callbacks: string[] = [];
    for (const [name, spec] of view.components) {
      if (moduleProvided.has(name)) continue;
      const definition = defaultBlokCatalog.components.get(name);
      if (!definition) {
        missing.push(`${name} (${spec.catalog})`);
        continue;
      }
      const shape = definition.schema.shape as Record<string, z.ZodTypeAny>;
      for (const prop of spec.props) {
        if (!(prop.key in shape)) props.push(`${name}.${prop.key}`);
        else if (prop.kind === 'CALLBACK' && !isActionSchema(shape[prop.key])) callbacks.push(`${name}.${prop.key}`);
      }
    }
    expect(missing).toEqual([]);
    expect(props).toEqual([]);
    expect(callbacks).toEqual([]);
  });

  /**
   * The spec's `values` are what an author (or a model) is told a prop takes, and what the spec
   * warns about (`catalog.value`): they must be exactly the options the zod enum draws.
   */
  it('holds the values every enum prop draws, and no others', () => {
    const view = defaultBlokView();
    const drift: string[] = [];
    for (const [name, spec] of view.components) {
      const definition = defaultBlokCatalog.components.get(name);
      if (!definition) continue;
      const shape = definition.schema.shape as Record<string, z.ZodTypeAny>;
      for (const prop of spec.props) {
        if (!(prop.key in shape)) continue;
        const drawn = zodEnumValues(shape[prop.key]);
        const held = prop.values ? [...prop.values] : null;
        if (JSON.stringify(drawn) !== JSON.stringify(held)) {
          drift.push(`${name}.${prop.key}: draws ${JSON.stringify(drawn)}, the spec holds ${JSON.stringify(held)}`);
        }
      }
    }
    expect(drift).toEqual([]);
  });

  it('draws nothing the spec catalogs do not hold, but for its own extras', () => {
    const view = defaultBlokView();
    const extra = [...defaultBlokCatalog.components.keys()].filter(name => !view.components.has(name));
    expect(extra).toEqual([]);
  });
});

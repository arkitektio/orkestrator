// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {baseBlokCatalog} from '../baseCatalog';
import {defaultBlokCatalog} from '../catalog';
import manifest from '../base_v1.json';
import {baseCatalog as baseV2} from '../../spec/catalogs';

/**
 * base@1's operations, vendored byte for byte (rekuest
 * `rekuest_core/catalogs/base_v1.json`): what port definitions (validators,
 * effects, CUSTOM widgets) still evaluate, since they feed `definition_hash`.
 * The language components are base@2's (`core/blok/spec/base_v2.json`).
 */
const BASE_V1 = manifest as {
  operations: {name: string; arguments: {key: string}[]}[];
  components: {name: string; props: {key: string}[]}[];
};

const call = (name: string, args: Record<string, unknown>) => {
  const result = defaultBlokCatalog.invokeFunction(name, args, {requirePure: true});
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

describe('the base catalog', () => {
  it('evaluates every base@1 operation under its own name, in its positional order', () => {
    for (const operation of BASE_V1.operations) {
      const fn = baseBlokCatalog.functions.get(operation.name);
      expect(fn?.name, operation.name).toBe(operation.name);
      const keys = Object.keys((fn!.schema as unknown as {shape: object}).shape);
      expect(keys, operation.name).toEqual(operation.arguments.map(argument => argument.key));
      expect(fn!.purity, operation.name).toBe('pure');
    }
  });

  it('draws every base@2 component with its props, and has nothing base does not', () => {
    for (const component of baseV2().components) {
      const definition = baseBlokCatalog.components.get(component.name);
      expect(definition, component.name).toBeDefined();
      expect(Object.keys(definition!.schema.shape).sort(), component.name).toEqual(component.props.map(prop => prop.key).sort());
    }
    expect([...baseBlokCatalog.components.keys()].sort()).toEqual(baseV2().components.map(component => component.name).sort());
    expect(baseBlokCatalog.functionDefinitions.map(fn => fn.name).sort()).toEqual(BASE_V1.operations.map(operation => operation.name).sort());
  });

  it('is what the orkestrator catalog extends', () => {
    expect(defaultBlokCatalog.base).toBe(baseBlokCatalog);
    for (const name of ['foreach', 'if', 'else', 'match', 'case', 'default', 'suspense', 'fallback', 'error', 'ask']) {
      expect(baseBlokCatalog.components.has(name), name).toBe(true);
      expect(defaultBlokCatalog.components.get(name)).toBe(baseBlokCatalog.components.get(name));
    }
  });

  it('follows the base semantics, not the looser client ones', () => {
    expect(call('eq', {a: {x: 1, y: [2]}, b: {y: [2], x: 1}})).toBe(true);
    expect(call('eq', {a: '3', b: 3})).toBe(false);
    expect(call('gt', {a: 'abc', b: 1})).toBe(false);
    expect(call('if', {condition: true, then: 'y', otherwise: 'n'})).toBe('y');
    expect(call('if', {condition: 1, then: 'y', otherwise: 'n'})).toBe('n');
    expect(call('sub', {'0': 5, '1': 2})).toBe(3);
    expect(call('div', {a: 1, b: 0})).toBeNull();
    expect(call('mod', {a: -1, b: 3})).toBe(2);
    expect(call('add', {a: 'x', b: 1})).toBeNull();
    expect(call('len', {a: null})).toBe(0);
    expect(call('len_between', {value: 'abc', min: 1})).toBe(true);
    expect(call('contains', {haystack: {k: 1}, needle: 'k'})).toBe(true);
    expect(call('contains', {haystack: [{a: 1}], needle: {a: 1}})).toBe(true);
    expect(call('in', {value: 2, options: [1, 2]})).toBe(true);
    expect(call('matches', {value: 'abc', pattern: 'b'})).toBe(false);
    expect(call('matches', {value: 'abc', pattern: 'a.c'})).toBe(true);
    expect(call('get', {value: {a: [{'b/c': 7}]}, path: '/a/0/b~1c'})).toBe(7);
    expect(call('get', {value: {a: 1}, path: '/missing'})).toBeNull();
    expect(call('coalesce', {a: null, b: 0})).toBe(0);
  });

  it('refuses a UI catalog that redefines a base name', async () => {
    const {extendBlokCatalog} = await import('../runtime');
    expect(() => extendBlokCatalog(baseBlokCatalog, 'x', [baseBlokCatalog.components.get('if')!])).toThrow(/redefine base names: if/);
  });
});

import {describe, expect, it} from 'vitest';
import corpus from '../spec/bsx_v2.json';
import type {BlokComponentNode} from '../renderer/runtime/types';
import {parseBsx, parseBsxSafe} from './parse';
import {BsxPrintError, printBsx} from './print';

/**
 * Parity with the spec's corpus (`core/blok/spec/bsx_v2.json`, written by
 * arkitekt-spec and read by takt's `tests/bsx.rs` too): trees compare
 * without nulls, refusals by code, line and column (code points, 1-based).
 */

/** The wire spells "nothing" as null or leaves it out; a tree is the same either way. */
export const withoutNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null || entry === undefined) continue;
      out[key] = withoutNulls(entry);
    }
    return out;
  }
  return value;
};

type ParsedCase = {name: string; source: string; tree: unknown; printed?: string};
type RefusedCase = {name: string; source: string; error: {code: string; line: number; column: number}};

const cases = corpus.cases as ReadonlyArray<Record<string, unknown>>;
const parsedCases = cases.filter((entry): entry is ParsedCase & Record<string, unknown> => 'tree' in entry);
const refusedCases = cases.filter((entry): entry is RefusedCase & Record<string, unknown> => 'error' in entry);
const printedCases = parsedCases.filter(entry => typeof entry.printed === 'string');

/** Python prints a float that is whole as `1000.0`; JSON (and so JavaScript) has no such number. */
const floatSpelling = (text: string): string => text.replace(/(\d)\.0(?!\d)/g, '$1');

describe('the v2 corpus', () => {
  it('holds every kind of case', () => {
    expect(parsedCases.length).toBeGreaterThan(50);
    expect(refusedCases.length).toBeGreaterThan(40);
  });

  describe('parses to the stored tree', () => {
    it.each(parsedCases.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
      const result = parseBsxSafe(entry.source);
      if (!result.ok) throw new Error(`${result.error.code} at ${result.error.line}:${result.error.column}: ${result.error.message}`);
      expect(withoutNulls(result.tree)).toEqual(withoutNulls(entry.tree));
    });
  });

  describe('refuses with the code and the place', () => {
    it.each(refusedCases.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
      const result = parseBsxSafe(entry.source);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect({code: result.error.code, line: result.error.line, column: result.error.column}).toEqual(entry.error);
    });
  });

  describe('prints what the spec prints, and reads it back', () => {
    it.each(printedCases.map(entry => [entry.name, entry] as const))('%s', (_name, entry) => {
      const tree = entry.tree as BlokComponentNode;
      const printed = printBsx(tree);
      expect(floatSpelling(printed)).toBe(floatSpelling(entry.printed ?? ''));
      expect(withoutNulls(parseBsx(printed).tree)).toEqual(withoutNulls(tree));
    });
  });
});

describe('positions', () => {
  it('counts columns in code points, not UTF-16 units', () => {
    const result = parseBsxSafe('<Text text="😀" /><B />');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('bsx.multiple_roots');
      expect(result.error.column).toBe(18);
      // The range stays in UTF-16, for the editor.
      expect(result.error.range.start).toBe(18);
    }
  });

  it('keeps where every node and prop is', () => {
    const {sources} = parseBsx('<Html><Card>\n  <Button label="Go" />\n</Card></Html>');
    const button = sources.get('Html[0]/Card[0]/Button[0]');
    expect(button?.tagRange).toEqual({start: 16, end: 22});
    expect(button?.props.get('label')?.valueRange).toEqual({start: 30, end: 32});
  });

  it('refuses a source over 256 KiB of UTF-8', () => {
    const big = `<Text text="${'é'.repeat(140 * 1024)}" />`;
    const result = parseBsxSafe(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('bsx.syntax');
  });
});

describe('printing refuses what reads back differently', () => {
  it('refuses a fallback literal and a positional task argument', () => {
    const node = (props: BlokComponentNode['props']): BlokComponentNode => ({id: 'Text[0]', component: 'Text', props});
    expect(() => printBsx(node([{key: 'text', dynamic_value: {path: 'self.x', literal: 'y'}}]))).toThrow(BsxPrintError);
    expect(() =>
      printBsx({
        id: 'Button[0]',
        component: 'Button',
        props: [{key: 'onClick', agent_call: {dependency: 'self', operation: 'go', arguments: [{key: '0', value_literal: 1}]}}],
      }),
    ).toThrow(/names its arguments/);
    expect(() => printBsx({id: 'odd/id', component: 'Card'})).toThrow(/neither explicit nor/);
  });
});

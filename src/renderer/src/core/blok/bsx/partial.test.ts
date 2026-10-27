import {describe, expect, it} from 'vitest';
import corpus from '../spec/bsx_v2.json';
import type {BlokComponentNode} from '../renderer/runtime/types';
import {parseBsx} from './parse';
import {closeBsx, parseBsxPartial} from './partial';

/**
 * A source drawn while it arrives: every prefix of every corpus source draws a
 * tree with the whole one's root, or nothing; it never throws, and a whole
 * source parses exactly as the strict parser does. (Node ids of a prefix may
 * differ: an explicit id still arriving is not the one it will be.)
 */

const ids = (node: BlokComponentNode, into: Set<string> = new Set()): Set<string> => {
  into.add(node.id);
  for (const child of node.children ?? []) ids(child, into);
  return into;
};

const parsed = (corpus.cases as ReadonlyArray<Record<string, unknown>>).filter(
  (entry): entry is {name: string; source: string} & Record<string, unknown> => 'tree' in entry && typeof entry.source === 'string',
);

describe('closeBsx', () => {
  it('closes what is open, in order', () => {
    expect(closeBsx('<Html><Card><Text>Hel')).toBe('<Html><Card><Text>Hel</Text></Card></Html>');
  });

  it('keeps the whole attributes of a tag that stops short', () => {
    expect(closeBsx('<Html><Button variant="outline" onClick={deps.stage.mo')).toBe('<Html><Button variant="outline"></Button></Html>');
  });

  it('waits for a name to be whole', () => {
    expect(closeBsx('<Html><Car')).toBe('<Html></Html>');
    expect(closeBsx('<Ht')).toBeNull();
  });

  it('cuts an unclosed comment, closing tag and text expression', () => {
    expect(closeBsx('<Html><!-- note')).toBe('<Html></Html>');
    expect(closeBsx('<Html><Card></Ca')).toBe('<Html><Card></Card></Html>');
    expect(closeBsx('<Html><Text>{fmt.number(value: ')).toBe('<Html><Text></Text></Html>');
  });

  it('leaves a whole source alone', () => {
    const source = '<Html><Card /></Html>';
    expect(closeBsx(source)).toBe(source);
  });
});

describe('parseBsxPartial', () => {
  it('parses a whole source as the strict parser does', () => {
    const source = '<Html><Card><Text>hi</Text></Card></Html>';
    const result = parseBsxPartial(source);
    expect(result.complete).toBe(true);
    expect(result.error).toBeNull();
    expect(result.tree).toEqual(parseBsx(source).tree);
  });

  it('draws the prefix and says why the whole does not parse', () => {
    const result = parseBsxPartial('<Html><Card><Text>Hel');
    expect(result.complete).toBe(false);
    expect(result.error?.code).toBe('bsx.unclosed');
    expect(result.tree && [...ids(result.tree)]).toEqual(['Html[0]', 'Html[0]/Card[0]', 'Html[0]/Card[0]/Text[0]']);
  });

  it('drops a tag that cannot draw until its attributes arrive', () => {
    const result = parseBsxPartial('<Html><Card><foreach items={[1, 2]}');
    expect(result.tree && [...ids(result.tree)]).toEqual(['Html[0]', 'Html[0]/Card[0]']);
  });

  it('never guesses past an error that is not the end of the source', () => {
    const result = parseBsxPartial('<Html><Card></Text></Card></Html>');
    expect(result.tree).toBeNull();
    expect(result.error?.code).toBe('bsx.mismatched_tag');
  });

  describe('every prefix of the corpus', () => {
    it.each(parsed.map(entry => [entry.name, entry.source] as const))('%s', (_name, source) => {
      const root = parseBsx(source).tree.component;
      for (let end = 0; end <= source.length; end += 1) {
        const result = parseBsxPartial(source.slice(0, end));
        if (!result.tree) continue;
        expect(result.tree.component, `prefix ${JSON.stringify(source.slice(0, end))}`).toBe(root);
        expect(result.complete).toBe(result.error === null);
      }
    });
  });
});

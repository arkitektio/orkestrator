import type {BlokComponentNode} from '../renderer/runtime/types';
import type {BlokView} from '../spec/catalogs';
import {parseBsxSafe, type BsxSourceMap} from './parse';
import type {BsxSyntaxError} from './source';

/**
 * A source that is still arriving (a model streaming it, an author mid-word),
 * drawn as far as it goes. The strict parser is never loosened: the source is
 * cut back to the last place markup can end -- between nodes, after a complete
 * attribute -- the elements still open there are closed, and that is parsed
 * strictly. What does not parse after that is an error, never a guess.
 */
export type BsxPartialResult = {
  /** The tree of the completed prefix; null when nothing of it parses. */
  tree: BlokComponentNode | null;
  /** Where each node is; offsets index the source as given (the prefix is its own). */
  sources: BsxSourceMap;
  /** Why the source as given does not parse; null when it does. */
  error: BsxSyntaxError | null;
  /** Whether the source parsed as it is, with nothing cut or closed. */
  complete: boolean;
};

const NAME = /[A-Za-z_][A-Za-z0-9_.:-]*/y;
const isSpace = (char: string | undefined) => char === ' ' || char === '\t' || char === '\r' || char === '\n';

/** Where the quoted string opening at `index` ends (after its quote), or -1 when it never closes. */
const stringEnd = (source: string, index: number): number => {
  const quote = source[index];
  for (let at = index + 1; at < source.length; at += 1) {
    if (source[at] === '\\') {
      at += 1;
      continue;
    }
    if (source[at] === quote) return at + 1;
  }
  return -1;
};

/** Where the braces opening at `index` end (after `}`), strings skipped, or -1 when they never close. */
const bracesEnd = (source: string, index: number): number => {
  let depth = 0;
  for (let at = index; at < source.length; at += 1) {
    const char = source[at];
    if (char === '"' || char === "'") {
      const end = stringEnd(source, at);
      if (end < 0) return -1;
      at = end - 1;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return at + 1;
    }
  }
  return -1;
};

/** The name at `index` when something after it shows it is whole, else null (`<Butt` is not `<Butt>`). */
const wholeName = (source: string, index: number): {name: string; end: number} | null => {
  NAME.lastIndex = index;
  const match = NAME.exec(source);
  if (!match) return null;
  const end = NAME.lastIndex;
  return end < source.length ? {name: match[0], end} : null;
};

/**
 * `source` cut back to where markup can end, with every element still open
 * there closed; `source` itself when nothing is cut or open; null when not even
 * a root element's opening tag is whole yet. A tag that stops short keeps its
 * whole attributes; with `dropShort` it is dropped instead (an element that
 * cannot render yet without the attribute still arriving).
 */
export const closeBsx = (source: string, {dropShort = false}: {dropShort?: boolean} = {}): string | null => {
  const open: string[] = [];
  let index = 0;
  let cut = -1;
  let tail = '';
  let rooted = false;

  outer: while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      if (end < 0) {
        cut = index;
        break;
      }
      index = end + 3;
      continue;
    }
    if (source.startsWith('</', index)) {
      const close = source.indexOf('>', index + 2);
      if (close < 0) {
        cut = index;
        break;
      }
      const name = source.slice(index + 2, close).trim();
      if (open[open.length - 1] === name) open.pop();
      index = close + 1;
      continue;
    }
    if (source[index] === '<') {
      const start = index;
      const named = wholeName(source, index + 1);
      if (!named) {
        cut = start;
        break;
      }
      // The opening tag: attributes until `>` or `/>`; `kept` is where the last whole one ends.
      let at = named.end;
      let kept = named.end;
      for (;;) {
        while (at < source.length && isSpace(source[at])) at += 1;
        if (at >= source.length) break;
        if (source.startsWith('/>', at)) {
          index = at + 2;
          rooted = true;
          continue outer;
        }
        if (source[at] === '>') {
          open.push(named.name);
          index = at + 1;
          rooted = true;
          continue outer;
        }
        if (source[at] === '/') break;
        const attribute = wholeName(source, at);
        if (!attribute) break;
        at = attribute.end;
        let probe = at;
        while (probe < source.length && isSpace(source[probe])) probe += 1;
        if (source[probe] !== '=') {
          if (probe >= source.length) break;
          kept = at;
          continue;
        }
        probe += 1;
        while (probe < source.length && isSpace(source[probe])) probe += 1;
        const end =
          source[probe] === '"' || source[probe] === "'"
            ? stringEnd(source, probe)
            : source[probe] === '{'
              ? bracesEnd(source, probe)
              : -1;
        if (end < 0) break;
        at = end;
        kept = end;
      }
      // The tag stops short: keep its whole attributes, end it, and close it with the rest.
      if (dropShort && open.length > 0) {
        cut = start;
        break;
      }
      cut = kept;
      tail = '>';
      open.push(named.name);
      rooted = true;
      break;
    }
    if (source[index] === '{') {
      const end = bracesEnd(source, index);
      if (end < 0) {
        cut = index;
        break;
      }
      index = end;
      continue;
    }
    index += 1;
  }

  if (!rooted) return null;
  if (cut < 0 && open.length === 0) return source;
  const prefix = cut < 0 ? source : source.slice(0, cut);
  return prefix + tail + open.reverse().map(name => `</${name}>`).join('');
};

/**
 * Parse `source` strictly; when it does not parse, draw what its completed
 * prefix (`closeBsx`) parses to. A preview reads `tree`; markers read `error`.
 */
export const parseBsxPartial = (source: string, view?: BlokView): BsxPartialResult => {
  const strict = parseBsxSafe(source, view);
  if (strict.ok) return {tree: strict.tree, sources: strict.sources, error: null, complete: true};
  for (const dropShort of [false, true]) {
    const completed = closeBsx(source, {dropShort});
    if (completed === null || completed === source) break;
    const prefix = parseBsxSafe(completed, view);
    if (prefix.ok) return {tree: prefix.tree, sources: prefix.sources, error: strict.error, complete: false};
  }
  return {tree: null, sources: new Map(), error: strict.error, complete: false};
};

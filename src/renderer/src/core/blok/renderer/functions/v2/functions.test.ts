import {describe, expect, it} from 'vitest';
import {loadVocabulary} from '../../../spec/vocabulary';
import {invokeV2Function, undeclaredImplementations, v2Functions, type BlokV2FunctionContext} from './index';

const NOW = '2026-10-25T12:00:00Z';
const context: BlokV2FunctionContext = {locale: 'en-US'};

const call = (name: string, args: Record<string, unknown>, at: BlokV2FunctionContext = context): unknown => {
  const result = invokeV2Function(name, args, at);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

/** Seconds from NOW to `at`, through time.diff. */
const time = (at: string): number => call('time.diff', {start: NOW, end: at}) as number;

describe('coverage', () => {
  it('implements every pure vocabulary function, and nothing else', () => {
    const declared = [...loadVocabulary().functions.values()].filter(fn => !fn.effect).map(fn => fn.name).sort();
    expect([...v2Functions.keys()].sort()).toEqual(declared);
    expect(declared).toHaveLength(80);
    expect(undeclaredImplementations()).toEqual([]);
  });

  it('refuses effects, unknown names and unknown arguments as results, never throws', () => {
    expect(invokeV2Function('ui.copy', {text: 'x'}, context).ok).toBe(false);
    expect(invokeV2Function('str.frob', {}, context).ok).toBe(false);
    expect(invokeV2Function('str.upper', {value: 'a', nope: 1}, context).ok).toBe(false);
    expect(invokeV2Function('math.round', {value: 1, digits: 'x'}, context).ok).toBe(false);
    expect(invokeV2Function('str.matches', {value: 'a', pattern: '('}, context).ok).toBe(false);
  });
});

describe('the null table', () => {
  const nullCases: Array<[string, Record<string, unknown>, unknown]> = [
    ['cmp.eq', {a: null, b: null}, true],
    ['cmp.eq', {a: null, b: 0}, false],
    ['cmp.ne', {a: null, b: 0}, true],
    ['cmp.gt', {a: null, b: 1}, false],
    ['cmp.gte', {a: 1, b: null}, false],
    ['cmp.lt', {a: null, b: 1}, false],
    ['cmp.lte', {a: null, b: null}, false],
    ['cmp.between', {value: null, min: 0, max: 1}, false],
    ['logic.all', {values: [true, null]}, null],
    ['logic.any', {values: [null, 0]}, 0],
    ['logic.negate', {a: null}, true],
    ['logic.choose', {cond: null, then: 'a', otherwise: 'b'}, 'b'],
    ['logic.choose', {cond: false, then: 'a'}, null],
    ['logic.coalesce', {values: [null, null]}, null],
    ['math.add', {a: null, b: 1}, null],
    ['math.sub', {a: 1, b: null}, null],
    ['math.mul', {a: null, b: 2}, null],
    ['math.div', {a: 1, b: 0}, null],
    ['math.div', {a: null, b: 2}, null],
    ['math.mod', {a: 1, b: 0}, null],
    ['math.neg', {a: null}, null],
    ['math.abs', {value: null}, null],
    ['math.round', {value: null}, null],
    ['math.floor', {value: null}, null],
    ['math.ceil', {value: null}, null],
    ['math.clamp', {value: null, min: 0, max: 1}, null],
    ['math.min', {values: [null, 3, null, 2]}, 2],
    ['math.min', {values: [null]}, null],
    ['math.max', {values: [null]}, null],
    ['math.sum', {values: [null, null]}, 0],
    ['math.sum', {values: [1, null, 2]}, 3],
    ['str.upper', {value: null}, null],
    ['str.lower', {value: null}, null],
    ['str.trim', {value: null}, null],
    ['str.capitalize', {value: null}, null],
    ['str.slice', {value: null, start: 0}, null],
    ['str.truncate', {value: null, length: 3}, null],
    ['str.replace', {value: null, search: 'a', replacement: 'b'}, null],
    ['str.split', {value: null}, []],
    ['str.concat', {values: [null, 'a', null]}, 'a'],
    ['str.template', {template: 'x{0}y', values: [null]}, 'xy'],
    ['str.template', {template: null, values: []}, ''],
    ['str.classes', {values: null}, ''],
    ['str.starts_with', {value: null, prefix: 'a'}, false],
    ['str.ends_with', {value: null, suffix: 'a'}, false],
    ['str.contains', {value: null, search: 'a'}, false],
    ['str.matches', {value: null, pattern: 'a'}, false],
    ['str.length', {value: null}, 0],
    ['list.len', {value: null}, 0],
    ['list.contains', {value: null, item: 1}, false],
    ['list.first', {value: null}, null],
    ['list.last', {value: null}, null],
    ['list.at', {value: null, index: 0}, null],
    ['list.join', {value: null}, ''],
    ['list.slice', {value: null, start: 0}, []],
    ['list.reverse', {value: null}, []],
    ['list.unique', {value: null}, []],
    ['list.compact', {value: null}, []],
    ['list.pluck', {value: null, key: 'a'}, []],
    ['list.sort', {value: null}, []],
    ['list.range', {start: null, end: 3}, []],
    ['obj.get', {value: null, key: 'a', default: 7}, 7],
    ['obj.get', {value: null, key: 'a'}, null],
    ['obj.has', {value: null, key: 'a'}, false],
    ['obj.keys', {value: null}, []],
    ['obj.values', {value: null}, []],
    ['obj.entries', {value: null}, []],
    ['val.is_null', {value: null}, true],
    ['val.is_set', {value: null}, false],
    ['val.is_empty', {value: null}, true],
    ['val.type', {value: null}, 'null'],
    ['val.to_string', {value: null}, ''],
    ['val.to_number', {value: null}, null],
    ['val.to_number', {value: 'abc'}, null],
    ['val.to_bool', {value: null}, false],
    ['val.status', {value: null}, 'ready'],
    ['val.is_pending', {value: null}, false],
    ['val.is_ready', {value: null}, true],
    ['fmt.number', {value: null}, ''],
    ['fmt.percent', {value: null}, ''],
    ['fmt.currency', {value: null, currency: 'EUR'}, ''],
    ['fmt.bytes', {value: null}, ''],
    ['fmt.date', {value: null}, ''],
    ['fmt.datetime', {value: null}, ''],
    ['fmt.duration', {seconds: null}, ''],
    ['fmt.json', {value: null}, 'null'],
    ['fmt.quantity', {value: null}, ''],
    ['time.diff', {start: null, end: NOW}, null],
    ['time.diff', {start: NOW, end: null}, null],
  ];

  it.each(nullCases)('%s(%j) is %j', (name, args, expected) => {
    expect(call(name, args)).toEqual(expected);
  });

  it('covers every function at least once', () => {
    const covered = new Set(nullCases.map(([name]) => name));
    expect([...v2Functions.keys()].filter(name => !covered.has(name))).toEqual([]);
  });
});

describe('semantics', () => {
  it('compares deeply and orders numbers and strings only', () => {
    expect(call('cmp.eq', {a: {x: [1, {y: 2}]}, b: {x: [1, {y: 2}]}})).toBe(true);
    expect(call('cmp.eq', {a: 1, b: '1'})).toBe(false);
    expect(call('cmp.gt', {a: 'b', b: 'a'})).toBe(true);
    expect(call('cmp.gt', {a: '2', b: 1})).toBe(false);
    expect(call('cmp.between', {value: 5, min: 1, max: 5})).toBe(true);
  });

  it('gives logic.all and logic.any JavaScript operand semantics', () => {
    expect(call('logic.all', {values: []})).toBe(true);
    expect(call('logic.all', {values: [1, 'x', 'animate-pulse']})).toBe('animate-pulse');
    expect(call('logic.all', {values: [1, 0, 'x']})).toBe(0);
    expect(call('logic.any', {values: []})).toBe(false);
    expect(call('logic.any', {values: [0, '', 'x', 'y']})).toBe('x');
    expect(call('logic.any', {values: [0, '']})).toBe('');
    expect(call('logic.coalesce', {values: [null, 0, 1]})).toBe(0);
  });

  it('does math the vocabulary way', () => {
    expect(call('math.round', {value: 2.5})).toBe(3);
    expect(call('math.round', {value: -2.5})).toBe(-3);
    expect(call('math.round', {value: 1.005, digits: 2})).toBe(1.01);
    expect(call('math.clamp', {value: 12, min: 0, max: 10})).toBe(10);
    expect(call('math.max', {values: [1, 7, 3]})).toBe(7);
    expect(call('math.mod', {a: 7, b: 3})).toBe(1);
  });

  it('works on strings', () => {
    expect(call('str.truncate', {value: 'abcdefgh', length: 5})).toBe('abcd…');
    expect(call('str.truncate', {value: 'abc', length: 5})).toBe('abc');
    expect(call('str.truncate', {value: 'abcdefgh', length: 5, suffix: '..'})).toBe('abc..');
    expect(call('str.replace', {value: 'a-b-c', search: '-', replacement: '+'})).toBe('a+b+c');
    expect(call('str.split', {value: 'ab'})).toEqual(['a', 'b']);
    expect(call('str.split', {value: 'a,b', separator: ','})).toEqual(['a', 'b']);
    expect(call('str.capitalize', {value: 'robot'})).toBe('Robot');
    expect(call('str.slice', {value: 'robot', start: 1, end: 3})).toBe('ob');
    expect(call('str.matches', {value: 'ot2-a', pattern: '^ot\\d'})).toBe(true);
    expect(call('str.length', {value: '😀a'})).toBe(2);
  });

  it('fills str.template with {n} and literal braces', () => {
    expect(call('str.template', {template: 'Arrived at {0}', values: [3]})).toBe('Arrived at 3');
    expect(call('str.template', {template: '{0} {1}', values: ['a', {b: 1}]})).toBe('a {"b":1}');
    expect(call('str.template', {template: 'a {{ b }} {0}', values: [true]})).toBe('a { b } true');
    expect(call('str.template', {template: '{{0}}', values: ['x']})).toBe('{0}');
  });

  it('is clsx for str.classes', () => {
    expect(call('str.classes', {values: ['px-2', false, null, 0, '', 'animate-pulse']})).toBe('px-2 animate-pulse');
    expect(call('str.classes', {values: {'animate-pulse': true, ring: false, 'a b': 1}})).toBe('animate-pulse a b');
    expect(call('str.classes', {values: ['p-1', ['m-1', [false, 'x']], {y: true, z: null}]})).toBe('p-1 m-1 x y');
    expect(call('str.classes', {values: '  p-1   m-2 '})).toBe('p-1 m-2');
  });

  it('works on lists', () => {
    expect(call('list.at', {value: [1, 2, 3], index: -1})).toBe(3);
    expect(call('list.join', {value: ['a', 1, null]})).toBe('a, 1, ');
    expect(call('list.unique', {value: [1, {a: 1}, 1, {a: 1}]})).toEqual([1, {a: 1}]);
    expect(call('list.compact', {value: [1, null, 2]})).toEqual([1, 2]);
    expect(call('list.pluck', {value: [{a: 1}, {b: 2}], key: 'a'})).toEqual([1, null]);
    expect(call('list.sort', {value: [3, null, 1, 2]})).toEqual([1, 2, 3, null]);
    expect(call('list.sort', {value: [{n: 1}, {n: null}, {n: 3}], key: 'n', descending: true})).toEqual([{n: 3}, {n: 1}, {n: null}]);
    expect(call('list.range', {start: 0, end: 5, step: 2})).toEqual([0, 2, 4]);
    expect(call('list.range', {start: 3, end: 0, step: -1})).toEqual([3, 2, 1]);
    expect(call('list.contains', {value: [{a: 1}], item: {a: 1}})).toBe(true);
  });

  it('works on objects', () => {
    expect(call('obj.get', {value: {a: {b: 2}}, key: 'a.b'})).toBe(2);
    expect(call('obj.get', {value: {a: {}}, key: 'a.b', default: 'x'})).toBe('x');
    expect(call('obj.entries', {value: {a: 1}})).toEqual([{key: 'a', value: 1}]);
    expect(call('obj.has', {value: {a: null}, key: 'a'})).toBe(true);
  });

  it('inspects values and statuses', () => {
    expect(call('val.type', {value: [1]})).toBe('list');
    expect(call('val.type', {value: {}})).toBe('object');
    expect(call('val.is_empty', {value: ''})).toBe(true);
    expect(call('val.is_empty', {value: 0})).toBe(false);
    expect(call('val.to_number', {value: ' 4.5 '})).toBe(4.5);
    expect(call('val.to_bool', {value: 'x'})).toBe(true);
    expect(call('val.status', {value: null}, {...context, argumentStatus: {value: 'pending'}})).toBe('pending');
    expect(call('val.is_pending', {value: null}, {...context, argumentStatus: {value: 'pending'}})).toBe(true);
    expect(call('val.is_ready', {value: 1}, {...context, argumentStatus: {value: 'stale'}})).toBe(true);
    expect(call('val.is_ready', {value: 1}, {...context, argumentStatus: {value: 'failed'}})).toBe(false);
  });

  it('formats', () => {
    expect(call('fmt.number', {value: 1234.5, digits: 2})).toBe('1,234.50');
    expect(call('fmt.percent', {value: 0.42})).toBe('42%');
    expect(call('fmt.bytes', {value: 1536})).toBe('1.5 KB');
    expect(call('fmt.bytes', {value: 12})).toBe('12 B');
    expect(call('fmt.currency', {value: 3, currency: 'EUR'})).toBe('€3.00');
    expect(call('fmt.json', {value: {a: 1}})).toBe('{"a":1}');
    expect(call('fmt.json', {value: {a: 1}, indent: 2})).toBe('{\n  "a": 1\n}');
    expect(call('fmt.quantity', {value: {magnitude: 3, unit: 'µm'}})).toBe('3 µm');
    expect(call('fmt.quantity', {value: 2.5, unit: 'mm'})).toBe('2.5 mm');
    expect(call('fmt.date', {value: '2026-10-25T12:00:00Z', format: 'iso'})).toBe('2026-10-25');
    expect(call('fmt.date', {value: 'not a date'})).toBe('');
    expect(typeof call('fmt.datetime', {value: NOW})).toBe('string');
  });

  it('measures time between two moments, never against the wall clock', () => {
    expect(call('time.diff', {start: '2026-10-25T11:59:00Z', end: NOW})).toBe(60);
    expect(call('time.diff', {start: NOW, end: '2026-10-25T11:00:00Z'})).toBe(-3600);
    expect(call('time.diff', {start: 'not a date', end: NOW})).toBeNull();
    // Nothing reads now: the functions that did are gone.
    for (const gone of ['time.since', 'time.until', 'fmt.relative_time']) expect(invokeV2Function(gone, {}, context).ok).toBe(false);
  });

  it('writes durations, keeping their sign', () => {
    expect(call('fmt.duration', {seconds: 90})).toBe('1m 30s');
    expect(call('fmt.duration', {seconds: 0})).toBe('0s');
    expect(call('fmt.duration', {seconds: 2.5})).toBe('2.5s');
    expect(call('fmt.duration', {seconds: -3600})).toBe('-1h');
    expect(call('fmt.duration', {seconds: 90061})).toBe('1d 1h 1m 1s');
    expect(call('fmt.duration', {seconds: time('2026-10-25T13:30:00Z')})).toBe('1h 30m');
  });
});

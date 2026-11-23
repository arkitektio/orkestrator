import {describe, expect, it} from 'vitest';
import {createBlokDebugScope} from './registry';

const meta = (key: string) => ({key, label: key, kind: 'materialized' as const});

describe('createBlokDebugScope', () => {
  it('gives a blok that opens again the history it had', () => {
    const scope = createBlokDebugScope();
    const first = scope.recorderFor('a');
    const release = scope.acquire(meta('a'), first);
    first.record({stream: 'out', title: 'call stage.move'});
    release();
    expect(scope.getSnapshot()[0]).toMatchObject({key: 'a', mounts: 0});
    expect(scope.recorderFor('a')).toBe(first);
    scope.acquire(meta('a'));
    expect(scope.getSnapshot()[0]).toMatchObject({key: 'a', mounts: 1, closedAt: null});
    expect(scope.getSnapshot()[0].recorder.getSnapshot().entries).toHaveLength(1);
  });

  it('counts hosts drawing the same blok, and closes it with the last', () => {
    const scope = createBlokDebugScope();
    const one = scope.acquire(meta('logo'));
    const two = scope.acquire(meta('logo'));
    expect(scope.getSnapshot()[0].mounts).toBe(2);
    one();
    one();
    expect(scope.getSnapshot()[0].mounts).toBe(1);
    two();
    expect(scope.getSnapshot()[0].closedAt).not.toBeNull();
  });

  it('lists open bloks first and keeps only the newest closed ones', () => {
    const scope = createBlokDebugScope(2);
    for (const key of ['a', 'b', 'c']) scope.acquire(meta(key))();
    scope.acquire(meta('open'));
    expect(scope.getSnapshot().map(item => item.key)).toEqual(['open', 'c', 'b']);
  });
});

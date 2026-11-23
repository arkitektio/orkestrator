import {describe, expect, it} from 'vitest';
import {createBlokDebugRecorder, diffBlokRuntime} from './recorder';

const state = (overrides: Partial<Parameters<typeof diffBlokRuntime>[0]> = {}) => ({
  runtimePathValues: {},
  statuses: {},
  agentMappingStateUpdates: {},
  ...overrides,
});

describe('createBlokDebugRecorder', () => {
  it('keeps the newest entries up to its limit', () => {
    const recorder = createBlokDebugRecorder(3);
    for (let i = 0; i < 5; i++) recorder.record({stream: 'out', title: `call ${i}`});
    expect(recorder.getSnapshot().entries.map(entry => entry.title)).toEqual(['call 2', 'call 3', 'call 4']);
  });

  it('folds repeated writes to one path into one entry', () => {
    const recorder = createBlokDebugRecorder();
    recorder.record({stream: 'state', title: 'locals.x', detail: 1}, {coalesce: true});
    recorder.record({stream: 'state', title: 'locals.x', detail: 2}, {coalesce: true});
    recorder.record({stream: 'state', title: 'locals.y', detail: 3}, {coalesce: true});
    const [first, second] = recorder.getSnapshot().entries;
    expect(first).toMatchObject({title: 'locals.x', detail: 2, count: 2});
    expect(second).toMatchObject({title: 'locals.y', count: 1});
  });

  it('records nothing while paused, and clears', () => {
    const recorder = createBlokDebugRecorder();
    recorder.record({stream: 'log', title: 'a'});
    recorder.setPaused(true);
    recorder.record({stream: 'log', title: 'b'});
    expect(recorder.getSnapshot().entries).toHaveLength(1);
    recorder.clear();
    expect(recorder.getSnapshot().entries).toHaveLength(0);
  });
});

describe('diffBlokRuntime', () => {
  it('reports written and cleared paths', () => {
    const changes = diffBlokRuntime(state({runtimePathValues: {a: 1, b: 2}}), state({runtimePathValues: {a: 1, c: 3}}));
    expect(changes).toEqual([
      {stream: 'state', title: 'c', note: 'set', detail: 3},
      {stream: 'state', title: 'b', note: 'cleared'},
    ]);
  });

  it('reports status moves, failed ones as errors', () => {
    const changes = diffBlokRuntime(
      state({statuses: {'deps.stage.position': {status: 'pending'}}}),
      state({statuses: {'deps.stage.position': {status: 'failed', error: 'offline'}}}),
    );
    expect(changes).toEqual([
      expect.objectContaining({title: 'deps.stage.position', note: 'status pending → failed', level: 'error'}),
    ]);
  });

  it('reports pushed agent states as incoming', () => {
    const position = {value: {x: 1}, revision: 4};
    const changes = diffBlokRuntime(
      state(),
      state({agentMappingStateUpdates: {stage: {agentId: 'agent-1', interfaces: {position}}}}),
    );
    expect(changes).toEqual([{stream: 'in', title: 'state stage.position', note: 'rev 4 from agent-1', detail: {x: 1}}]);
  });
});

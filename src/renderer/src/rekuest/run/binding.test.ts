import {describe, expect, it} from 'vitest';
import {agentMappingsOf, agentsByKey, bindingFromDependencyAgents, bindingFromDryRun, runAgentIds} from './binding';

const agent = (id: string, connected = true) => ({id, name: `agent ${id}`, connected});

/** `Task.dependencyAgents` of a run: `stage` bound to two agents. */
const dependencyAgents = [
  {key: 'robot', agent: agent('a1')},
  {key: 'stage', agent: agent('a2')},
  {key: 'stage', agent: agent('a3', false)},
];
const self = agent('w1');

describe('the binding of a run', () => {
  it('reads every key of Task.dependencyAgents, a repeated key once per agent', () => {
    expect(bindingFromDependencyAgents(dependencyAgents).map(({key, agent}) => [key, agent.id])).toEqual([
      ['robot', 'a1'],
      ['stage', 'a2'],
      ['stage', 'a3'],
    ]);
  });

  it('anchors a key at each of its agents, and self at the agent running the action', () => {
    const byKey = agentsByKey(bindingFromDependencyAgents(dependencyAgents), self);
    expect(byKey.get('self')?.map(each => each.id)).toEqual(['w1']);
    expect(byKey.get('stage')?.map(each => each.id)).toEqual(['a2', 'a3']);
    expect(byKey.get('frame')).toBeUndefined();
  });

  it('reads states from and calls one agent per key: the first, with self beside them', () => {
    expect(agentMappingsOf(bindingFromDependencyAgents(dependencyAgents), self).map(({key, agent}) => [key, agent.id])).toEqual([
      ['self', 'w1'],
      ['robot', 'a1'],
      ['stage', 'a2'],
    ]);
  });

  it('keeps whether a bound agent is connected, so an offline one shows unavailable', () => {
    const mappings = agentMappingsOf(bindingFromDependencyAgents([{key: 'stage', agent: agent('a3', false)}]), null);
    expect(mappings).toEqual([{key: 'stage', agent: {id: 'a3', name: 'agent a3', connected: false}}]);
  });

  it('binds a preview from the top level of the dry run, by agent id where the agent is not read', () => {
    const binding = bindingFromDryRun([
      {key: 'robot', mappedAgents: [{agentId: 'a1', agent: agent('a1')}]},
      {key: 'frame', mappedAgents: [{agentId: 'a9', agent: null}]},
      {key: 'stitcher', mappedAgents: []},
    ]);
    expect(binding).toEqual([
      {key: 'robot', agent: {id: 'a1', name: 'agent a1', connected: true}},
      {key: 'frame', agent: {id: 'a9', name: 'a9'}},
    ]);
    expect(bindingFromDryRun(undefined)).toEqual([]);
  });

  it('names every agent once, self first, to look for spaces with', () => {
    expect(runAgentIds(bindingFromDependencyAgents([...dependencyAgents, {key: 'back', agent: agent('a1')}]), self)).toEqual([
      'w1',
      'a1',
      'a2',
      'a3',
    ]);
  });
});

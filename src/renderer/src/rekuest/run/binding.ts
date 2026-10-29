import type {BlokRunAgent} from '@arkitektio/bsx/renderer/bloks/run/index';

/**
 * Which agent stands behind each dependency key of a run: what an action's
 * own blok names devices by. A run that happened reads it off
 * `Task.dependencyAgents`; a run that is only being prepared, off the
 * `dependencyTree` dry run. Either way a key may come more than once, once
 * per agent bound to it.
 */

/** The agent a key is bound to; `connected` left out when the source does not say. */
export type RunBoundAgent = {id: string; name: string; connected?: boolean};

export type RunBinding = ReadonlyArray<{key: string; agent: RunBoundAgent}>;

/** The key an action blok reads the agent running the action under (`self`, i.e. `deps.self`). */
export const SELF_KEY = 'self';

/** `Task.dependencyAgents`, as the binding of the run. */
export const bindingFromDependencyAgents = (
  dependencyAgents: ReadonlyArray<{key: string; agent: {id: string; name: string; connected: boolean}}>,
): RunBinding =>
  dependencyAgents.map(({key, agent}) => ({key, agent: {id: agent.id, name: agent.name, connected: agent.connected}}));

/** The top level of a `dependencyTree` dry run: every agent it maps to each key. */
export type DryRunLevel = ReadonlyArray<{
  key: string;
  mappedAgents: ReadonlyArray<{agentId: string; agent?: {id: string; name: string; connected: boolean} | null}>;
}>;

/** The binding a run would get, from the dry run of its assign. */
export const bindingFromDryRun = (level: DryRunLevel | null | undefined): RunBinding =>
  (level ?? []).flatMap(dependency =>
    dependency.mappedAgents.map(mapping => ({
      key: dependency.key,
      agent: mapping.agent
        ? {id: mapping.agent.id, name: mapping.agent.name, connected: mapping.agent.connected}
        : {id: mapping.agentId, name: mapping.agentId},
    })),
  );

/** The agents bound to each key, in order, with `self` the agent running the action. */
export const agentsByKey = (
  binding: RunBinding,
  self: RunBoundAgent | null | undefined,
): ReadonlyMap<string, readonly BlokRunAgent[]> => {
  const byKey = new Map<string, BlokRunAgent[]>();
  const add = (key: string, agent: RunBoundAgent) => {
    const agents = byKey.get(key) ?? [];
    if (!agents.some(candidate => candidate.id === agent.id)) agents.push({id: agent.id, name: agent.name});
    byKey.set(key, agents);
  };
  if (self) add(SELF_KEY, self);
  for (const {key, agent} of binding) add(key, agent);
  return byKey;
};

/** One agent per key, as a materialized blok's `agentMappings`. */
export type RunAgentMapping = {key: string; agent: RunBoundAgent};

/**
 * The agents a blok's states are read from and its calls go to: the first
 * agent of each key, and `self`. A key bound to several agents is drawn at
 * each (`At`), but one state path can only follow one agent.
 */
export const agentMappingsOf = (binding: RunBinding, self: RunBoundAgent | null | undefined): RunAgentMapping[] => {
  const mappings: RunAgentMapping[] = [];
  const seen = new Set<string>();
  const add = (key: string, agent: RunBoundAgent) => {
    if (seen.has(key)) return;
    seen.add(key);
    mappings.push({key, agent});
  };
  if (self) add(SELF_KEY, self);
  for (const {key, agent} of binding) add(key, agent);
  return mappings;
};

/** Every distinct agent of the run, `self` first: what to look for spaces with. */
export const runAgentIds = (binding: RunBinding, self: RunBoundAgent | null | undefined): string[] => [
  ...new Set([...(self ? [self.id] : []), ...binding.map(({agent}) => agent.id)]),
];

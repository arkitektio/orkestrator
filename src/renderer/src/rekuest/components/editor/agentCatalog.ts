import type { ProtocolAgentFragment } from "@/rekuest/api/graphql";
import { dependencyKeyFor, match, nameable, type Port } from "@/rekuest/lib/agentBlokScaffold";
import { draftUid, type DemandedDraft, type DependencyDraft } from "./blokDependencies";
import type { ActionDemandInput, StateDemandInput } from "@/rekuest/api/graphql";

/**
 * What the editor's Agents tab knows beyond the draft itself: what a real
 * agent OFFERS (so an action or a state is picked, not typed from memory),
 * and what the source USES (so a slot nobody reads says so, and a name the
 * source reads but nothing declares can be declared in one click).
 *
 * Pure: type-only imports from the generated api.
 */

export type OfferedAction = {
  /** What the BSX names: the implementation's interface on the agent. */
  key: string;
  title: string;
  description: string;
  /** The arguments it takes, as `key` or `key?` (nullable). */
  args: string[];
  argPorts: Port[];
};

export type OfferedState = {
  key: string;
  title: string;
  /** Its fields, as the BSX reads them after the state's name. */
  fields: string[];
  ports: Port[];
};

export type AgentOffer = { actions: OfferedAction[]; states: OfferedState[] };

/** What an agent offers that BSX can name: its states and its actions, each once, by interface. */
export const offerOf = (agent: ProtocolAgentFragment): AgentOffer => {
  const states: OfferedState[] = agent.states
    .filter((state) => nameable(state.interface))
    .map((state) => {
      const ports = state.definition.ports as Port[];
      return {
        key: state.interface,
        title: state.definition.name || state.interface,
        fields: ports.map((port) => port.key),
        ports,
      };
    });
  const seen = new Set(states.map((state) => state.key));
  const actions: OfferedAction[] = [];
  for (const implementation of agent.implementations) {
    if (!nameable(implementation.interface) || seen.has(implementation.interface)) continue;
    seen.add(implementation.interface);
    const argPorts = implementation.action.args as Port[];
    actions.push({
      key: implementation.interface,
      title: implementation.action.name || implementation.interface,
      description: implementation.action.description ?? "",
      args: argPorts.map((port) => (port.nullable ? `${port.key}?` : port.key)),
      argPorts,
    });
  }
  return { actions, states };
};

export const actionSlot = (action: OfferedAction): DemandedDraft<ActionDemandInput> => ({
  key: action.key,
  description: action.description,
  optional: false,
  demand: { argMatches: action.argPorts.map(match) },
});

export const stateSlot = (state: OfferedState): DemandedDraft<StateDemandInput> => ({
  key: state.key,
  description: "",
  optional: false,
  demand: { matches: state.ports.map(match) },
});

/** A free key from `base`: `stage`, then `stage_2`, `stage_3`. */
export const freeKey = (base: string, taken: readonly string[]): string => {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let index = 2; ; index += 1) {
    const candidate = `${base}_${index}`;
    if (!used.has(candidate)) return candidate;
  }
};

/**
 * A dependency for a picked agent: keyed after its app, held to that app, and
 * declaring nothing yet. What it uses is ticked from what the agent offers.
 */
export const draftForAgent = (
  agent: { name?: string | null; app?: { identifier: string } | null },
  takenKeys: readonly string[],
): DependencyDraft => ({
  uid: draftUid(),
  key: freeKey(dependencyKeyFor({ name: agent.name ?? "", app: agent.app ?? null } as ProtocolAgentFragment), takenKeys),
  app: agent.app?.identifier ?? "",
  version: "",
  description: agent.name ? `The ${agent.name} agent.` : "",
  optional: false,
  autoResolvable: false,
  minViableInstances: null,
  maxViableInstances: null,
  actions: [],
  states: [],
  locked: false,
});

/** `agents.<key>.<these>` are the agent's own fields, never a state or an action. */
const OWN = new Set(["tasks", "assets", "id", "name", "connected"]);

/** What the source names of one agent: the states it reads, the actions it calls (or reads the task of). */
export type KeyUsage = { states: Set<string>; actions: Set<string> };

const NAME = "[A-Za-z_][A-Za-z0-9_]*";
const REFERENCE = new RegExp(`\\bagents\\.(${NAME})(?:\\.(${NAME})(\\s*\\()?)?`, "g");
const TASK = new RegExp(`\\bagents\\.(${NAME})\\.tasks\\.(${NAME})`, "g");

/** What the source names of each agent, per dependency key. */
export const sourceUsage = (source: string): Map<string, KeyUsage> => {
  const usage = new Map<string, KeyUsage>();
  const of = (key: string) => {
    const found = usage.get(key) ?? { states: new Set<string>(), actions: new Set<string>() };
    usage.set(key, found);
    return found;
  };
  for (const found of source.matchAll(REFERENCE)) {
    const entry = of(found[1]);
    const name = found[2];
    if (!name || OWN.has(name)) continue;
    (found[3] ? entry.actions : entry.states).add(name);
  }
  // `agents.stage.tasks.move`: the latest task of an action is a use of that action.
  for (const found of source.matchAll(TASK)) of(found[1]).actions.add(found[2]);
  return usage;
};

/** The keys the source reads that no dependency declares: `agents.lamp…` with no `lamp`. */
export const undeclaredKeys = (usage: ReadonlyMap<string, KeyUsage>, drafts: readonly DependencyDraft[]): string[] => {
  const declared = new Set(drafts.map((draft) => draft.key.trim()));
  return [...usage.keys()].filter((key) => !declared.has(key));
};

/**
 * The names the source uses of one sort (its actions, or its states) that the
 * dependency does not declare. None where it declares none of that sort: then
 * every name is accepted.
 */
export const undeclaredNames = (slots: readonly { key: string }[], used: ReadonlySet<string> | undefined): string[] => {
  if (!used || slots.length === 0) return [];
  const declared = new Set(slots.map((slot) => slot.key));
  return [...used].filter((name) => !declared.has(name));
};

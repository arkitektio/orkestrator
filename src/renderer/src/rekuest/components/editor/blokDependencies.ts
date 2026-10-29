import type { BlokPortMatch, BlokScopeDependency } from "@arkitektio/bsx/bsx/index";
import type {
  ActionDemandInput,
  AgentDependencyInput,
  BlokEditorDependencyFragment,
  PortMatchInput,
  StateDemandInput,
} from "@/rekuest/api/graphql";

/**
 * A blok's dependencies as the editor holds them, and back. `dependencies`
 * replaces a blok's whole set on save, so a draft keeps everything it was
 * read with: a demand it cannot show is still sent again as it came. Only a
 * port match nested deeper than the editor reads (`BlokEditorPortMatch`)
 * cannot be: that dependency is `locked`, and while one is, the set is not
 * sent at all.
 */

export type DemandedDraft<Demand> = {
  key: string;
  description: string;
  optional: boolean;
  /** Kept as read, never edited here. */
  demand: Demand | null;
};

export type DependencyDraft = {
  /** Stable across renames, for React keys. */
  uid: string;
  key: string;
  app: string;
  version: string;
  description: string;
  optional: boolean;
  autoResolvable: boolean;
  minViableInstances: number | null;
  maxViableInstances: number | null;
  actions: DemandedDraft<ActionDemandInput>[];
  states: DemandedDraft<StateDemandInput>[];
  /** It holds a demand deeper than the editor reads: it cannot be sent back whole. */
  locked: boolean;
};

let uidCounter = 0;
export const draftUid = () => `dependency-${(uidCounter += 1)}`;

export const emptyDependency = (key = ""): DependencyDraft => ({
  uid: draftUid(),
  key,
  app: "",
  version: "",
  description: "",
  optional: false,
  autoResolvable: false,
  minViableInstances: null,
  maxViableInstances: null,
  actions: [],
  states: [],
  locked: false,
});

type PortMatchRead = {
  at?: number | null;
  key?: string | null;
  kind?: PortMatchInput["kind"] | null;
  identifier?: string | null;
  nullable?: boolean | null;
  dimension?: string | null;
  children?: PortMatchRead[] | null;
};

class TooDeep extends Error {}

/** The read port match as an input; a match at the innermost level read (its key only) is more than the editor holds. */
const portMatchInput = (match: PortMatchRead, depth: number): PortMatchInput => {
  if (depth >= 3) throw new TooDeep();
  return {
    at: match.at ?? null,
    key: match.key ?? null,
    kind: match.kind ?? null,
    identifier: match.identifier ?? null,
    nullable: match.nullable ?? null,
    dimension: match.dimension ?? null,
    children: match.children ? match.children.map((child) => portMatchInput(child, depth + 1)) : null,
  };
};

const matches = (list: PortMatchRead[] | null | undefined) => (list ? list.map((match) => portMatchInput(match, 0)) : null);

type ActionDemandRead = NonNullable<BlokEditorDependencyFragment["actionDependencies"][number]["demand"]>;
type StateDemandRead = NonNullable<BlokEditorDependencyFragment["stateDependencies"][number]["demand"]>;

const actionDemandInput = (demand: ActionDemandRead): ActionDemandInput => ({
  app: demand.app ?? null,
  argMatches: matches(demand.argMatches as PortMatchRead[] | null),
  forceArgLength: demand.forceArgLength ?? null,
  forceReturnLength: demand.forceReturnLength ?? null,
  hash: demand.hash ?? null,
  idempotent: demand.idempotent ?? null,
  key: demand.key ?? null,
  name: demand.name ?? null,
  protocols: demand.protocols ?? null,
  pure: demand.pure ?? null,
  returnMatches: matches(demand.returnMatches as PortMatchRead[] | null),
  stateful: demand.stateful ?? null,
  version: demand.version ?? null,
});

const stateDemandInput = (demand: StateDemandRead): StateDemandInput => ({
  app: demand.app ?? null,
  hash: demand.hash ?? null,
  key: demand.key ?? null,
  matches: matches(demand.matches as PortMatchRead[] | null),
  protocols: demand.protocols ?? null,
});

export const dependencyDraft = (dependency: BlokEditorDependencyFragment): DependencyDraft => {
  let locked = false;
  const keep = <Read, Input>(demand: Read | null | undefined, map: (read: Read) => Input): Input | null => {
    if (!demand) return null;
    try {
      return map(demand);
    } catch (error) {
      if (!(error instanceof TooDeep)) throw error;
      locked = true;
      return null;
    }
  };
  const draft: DependencyDraft = {
    uid: draftUid(),
    key: dependency.key,
    app: dependency.appFilter ?? "",
    version: dependency.versionFilter ?? "",
    description: dependency.description ?? "",
    optional: dependency.optional,
    autoResolvable: dependency.autoResolvable,
    minViableInstances: dependency.minViableInstances ?? null,
    maxViableInstances: dependency.maxViableInstances ?? null,
    actions: dependency.actionDependencies.map((action) => ({
      key: action.key,
      description: action.description ?? "",
      optional: action.optional,
      demand: keep(action.demand, actionDemandInput),
    })),
    states: dependency.stateDependencies.map((state) => ({
      key: state.key,
      description: state.description ?? "",
      optional: state.optional,
      demand: keep(state.demand, stateDemandInput),
    })),
    locked: false,
  };
  draft.locked = locked;
  return draft;
};

const orNull = (value: string) => (value.trim() ? value.trim() : null);

export const dependencyInput = (draft: DependencyDraft): AgentDependencyInput => ({
  key: draft.key.trim(),
  app: orNull(draft.app),
  version: orNull(draft.version),
  description: orNull(draft.description),
  optional: draft.optional,
  autoResolvable: draft.autoResolvable,
  minViableInstances: draft.minViableInstances,
  maxViableInstances: draft.maxViableInstances,
  // None declared: any operation is accepted, which is not what an empty list says.
  actionDependencies: draft.actions.length
    ? draft.actions.map((action) => ({
        key: action.key,
        description: orNull(action.description),
        optional: action.optional,
        demand: action.demand,
      }))
    : null,
  stateDependencies: draft.states.length
    ? draft.states.map((state) => ({
        key: state.key,
        description: orNull(state.description),
        optional: state.optional,
        demand: state.demand,
      }))
    : null,
});

/** A port match as the editor reads it (camelCase), as the validator's scope spells it. */
const scopeMatch = (match: PortMatchInput): BlokPortMatch => ({
  key: match.key ?? null,
  kind: match.kind ?? null,
  identifier: match.identifier ?? null,
  nullable: match.nullable ?? null,
  children: match.children ? match.children.map(scopeMatch) : null,
});

const scopeMatches = (matches: readonly PortMatchInput[] | null | undefined) => (matches ? matches.map(scopeMatch) : null);

/**
 * A draft as the validator and completion read a dependency (the corpus'
 * scope shape): its actions with their argument and return matches, its
 * states with their matches. No actions (or states) declared means any.
 */
export const scopeDependency = (draft: DependencyDraft): BlokScopeDependency => ({
  key: draft.key.trim(),
  action_dependencies: draft.actions.length
    ? draft.actions.map((action) => ({
        key: action.key,
        demand: action.demand
          ? { arg_matches: scopeMatches(action.demand.argMatches), return_matches: scopeMatches(action.demand.returnMatches) }
          : null,
      }))
    : null,
  state_dependencies: draft.states.length
    ? draft.states.map((state) => ({
        key: state.key,
        demand: state.demand ? { matches: scopeMatches(state.demand.matches) } : null,
      }))
    : null,
});

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Why a set of drafts cannot be saved, per draft uid; empty when it can. */
export const dependencyProblems = (drafts: readonly DependencyDraft[]): Map<string, string> => {
  const problems = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const draft of drafts) seen.set(draft.key.trim(), (seen.get(draft.key.trim()) ?? 0) + 1);
  for (const draft of drafts) {
    const key = draft.key.trim();
    if (!NAME.test(key)) problems.set(draft.uid, "A key is a name: letters, digits and _, not starting with a digit.");
    else if (key === "self") problems.set(draft.uid, "'self' is the blok's own agent, not a dependency key.");
    else if ((seen.get(key) ?? 0) > 1) problems.set(draft.uid, `'${key}' is declared twice.`);
    else if (
      draft.minViableInstances != null &&
      draft.maxViableInstances != null &&
      draft.minViableInstances > draft.maxViableInstances
    ) {
      problems.set(draft.uid, "At least can't be more than at most.");
    }
  }
  return problems;
};

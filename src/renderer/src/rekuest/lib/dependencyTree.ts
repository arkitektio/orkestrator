import type {
  ListAgentFragment,
  ListDependencyFragment,
  ResolvedDependencyInput,
} from "../api/graphql";

/**
 * An implementation's dependencies form a tree: what a dependency binds may
 * have dependencies of its own. The server resolves the whole tree when the
 * root is assigned; `dependencyTree` is the same resolution as a dry run.
 *
 * Pins (`ResolvedDependencyInput`) are per level. A dependency key is a
 * parameter name and repeats across levels, so the pins for the level below
 * sit under the agent they are for (`mappedAgents[].dependencies`).
 */

/** One dependency of one level, as the dry run resolved it. */
export type DependencyNode = {
  key: string;
  /** Why an assign would refuse it; null or absent when it is met. */
  unmet?: string | null;
  /** The dependency as declared, while its implementation still declares it. */
  dependency?: ListDependencyFragment | null;
  mappedAgents: DependencyBinding[];
};

export type DependencyBinding = {
  agentId: string;
  agent?: ListAgentFragment | null;
  mappedImplementations: {
    key: string;
    implementation?: { id: string; interface: string; action: { id: string; name: string } } | null;
    resolvedDependencies?: DependencyNode[] | null;
  }[];
};

type Pin = ResolvedDependencyInput;

/** The pins as the server takes them: nothing but the input's own fields. */
export const toPins = (level: readonly Pin[] | null | undefined): Pin[] =>
  (level ?? []).map((pin) => ({
    key: pin.key,
    autoResolve: pin.autoResolve ?? false,
    mappedAgents: (pin.mappedAgents ?? []).map((mapped) => ({
      key: mapped.key,
      agent: mapped.agent,
      ...(mapped.dependencies && mapped.dependencies.length > 0
        ? { dependencies: toPins(mapped.dependencies) }
        : {}),
    })),
  }));

/** `level` with the pin of `key` replaced, or dropped when it pins nothing. */
export const withPin = (level: readonly Pin[], key: string, pin: Pin | undefined): Pin[] => {
  const rest = level.filter((other) => other.key !== key);
  const keeps = pin && (pin.mappedAgents.length > 0 || pin.autoResolve);
  if (!keeps) return rest;
  const at = level.findIndex((other) => other.key === key);
  if (at < 0) return [...rest, pin];
  return [...rest.slice(0, at), pin, ...rest.slice(at)];
};

/**
 * What is bound on one agent declares dependencies of its own: the level
 * below. Several implementations of the agent may be bound; a pin under the
 * agent applies to every one that declares the key, so they read as one level.
 */
export const levelBelow = (binding: DependencyBinding): DependencyNode[] => {
  const byKey = new Map<string, DependencyNode>();
  for (const bound of binding.mappedImplementations) {
    for (const node of bound.resolvedDependencies ?? []) {
      const seen = byKey.get(node.key);
      if (!seen) byKey.set(node.key, node);
      else if (!seen.unmet && node.unmet) byKey.set(node.key, { ...seen, unmet: node.unmet });
    }
  }
  return [...byKey.values()];
};

/**
 * Pin the level below `agent`. A dependency that resolved by itself has no pin
 * to hang them under, so what it bound is pinned first: the same agents, now
 * by name.
 */
export const withLevelBelow = (
  pin: Pin | undefined,
  node: DependencyNode,
  agent: string,
  below: Pin[],
): Pin => {
  const pinned = pin && !pin.autoResolve && pin.mappedAgents.length > 0;
  const agents = pinned
    ? pin.mappedAgents
    : node.mappedAgents.map((binding) => ({ key: node.key, agent: binding.agentId }));
  return {
    key: node.key,
    autoResolve: false,
    mappedAgents: agents.map((mapped) =>
      mapped.agent === agent ? { key: mapped.key, agent: mapped.agent, dependencies: below } : mapped,
    ),
  };
};

/** Every unmet dependency of the tree, with the keys that lead to it. */
export const unmetDependencies = (
  nodes: readonly DependencyNode[] | null | undefined,
  path: string[] = [],
): { path: string[]; reason: string }[] =>
  (nodes ?? []).flatMap((node) => [
    ...(node.unmet ? [{ path: [...path, node.key], reason: node.unmet }] : []),
    ...node.mappedAgents.flatMap((binding) =>
      unmetDependencies(levelBelow(binding), [...path, node.key]),
    ),
  ]);

/** A task's frozen bindings, as far as its fragment selects them. */
export type FrozenDependency = {
  key: string;
  mappedAgents: {
    agentId?: string | null;
    agent?: { id: string } | null;
    mappedImplementations?:
      | { key: string; resolvedDependencies?: FrozenDependency[] | null }[]
      | null;
  }[];
};

/**
 * The pins that bind a task's dependencies again, level by level: a rerun
 * reaches the same agents instead of resolving anew.
 */
export const pinsFromFrozen = (frozen: readonly FrozenDependency[] | null | undefined): Pin[] =>
  (frozen ?? []).map((dependency) => ({
    key: dependency.key,
    autoResolve: false,
    mappedAgents: dependency.mappedAgents.flatMap((binding) => {
      const agent = binding.agentId ?? binding.agent?.id;
      if (!agent) return [];
      const below = new Map<string, FrozenDependency>();
      for (const bound of binding.mappedImplementations ?? []) {
        for (const inner of bound.resolvedDependencies ?? []) {
          if (!below.has(inner.key)) below.set(inner.key, inner);
        }
      }
      const dependencies = pinsFromFrozen([...below.values()]);
      return [{ key: dependency.key, agent, ...(dependencies.length > 0 ? { dependencies } : {}) }];
    }),
  }));

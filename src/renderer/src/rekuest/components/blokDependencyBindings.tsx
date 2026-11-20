import * as React from 'react';
import type {BlokComponentStateStore} from '@arkitektio/bsx/renderer/persist';
import {useBlokRuntimeStoreApi} from '@arkitektio/bsx/renderer/runtime/index';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/core/ui/select';
import {cn} from '@/core/util/utils';
import {useAgentForDependencyQuery, useImplementationAtQuery, useRunTaskQuery} from '@/rekuest/api/graphql';
import {useLatestTask} from '@/rekuest/hooks/useLatestTask';

/**
 * The dependencies an agent's blok declares itself
 * (`<dependencies key="cells" like="self.<action>" />`): the dependencies of one
 * of its own actions, read through the key (`cells.microscope`, stored as the
 * blok's dependency `cells__microscope`) and handed to a run with `with cells`.
 *
 * Which agent each is bound to is the viewer's choice, kept on this device and
 * never on a server. Until they choose, one the tree uses is seeded once: the
 * agent the latest run of the action had for it, else the only agent that fits.
 * What the seed gives is kept as the choice, so it never changes under the
 * viewer afterwards; a picker (`<deppicker>`, or the blok's own over
 * `cells.options.<dependency>` and `cells.pick(...)`) changes it.
 */

/** How `cells.microscope` is stored: one dependency key of the blok. */
export const REFERENCE_SEPARATOR = '__';
const OPTIONS = 'options';

export const referenceKey = (key: string, name: string) => `${key}${REFERENCE_SEPARATOR}${name}`;

/** A `<dependencies>` of the tree. */
export type DeclaredDependencies = {
  key: string;
  /** The action of the blok's own agent whose dependencies they are; null when `like` does not say. */
  action: string | null;
};

/** One dependency of that action, as the server has it. */
export type ActionDependency = {id: string; key: string};

/** The agent a dependency is bound to on this device. */
export type PickedAgent = {id: string; name: string | null};

/** Per declared key, per dependency, the agent chosen. */
export type DependencyPicks = Readonly<Record<string, Readonly<Record<string, PickedAgent>>>>;

type TreeProp = {key?: unknown; static_value?: unknown};
type TreeNode = {component?: unknown; props?: TreeProp[] | null; children?: TreeNode[] | null};

const literal = (node: TreeNode, key: string): string | null => {
  const value = node.props?.find(prop => prop.key === key)?.static_value;
  return typeof value === 'string' && value ? value : null;
};

/** The `<dependencies>` children of the blok's `<Blok>`, in order. */
export const declaredDependencies = (roots: readonly unknown[]): DeclaredDependencies[] =>
  ((roots[0] as TreeNode | undefined)?.children ?? []).flatMap(child => {
    if (child.component !== 'dependencies') return [];
    const key = literal(child, 'key');
    if (!key) return [];
    const parts = literal(child, 'like')?.split('.') ?? [];
    return [{key, action: parts.length === 2 && parts[0] === 'self' && parts[1] ? parts[1] : null}];
  });

/** What the tree does with the dependencies declared as `key`. */
export type DependencyUse = {
  /** The dependencies it reads or calls (`cells.microscope...`). */
  read: ReadonlySet<string>;
  /** Those whose candidates it lists itself (`cells.options.microscope`). */
  listed: ReadonlySet<string>;
  /** Those it places the ready-made picker for (`<deppicker key="cells.microscope" />`). */
  placed: ReadonlySet<string>;
  /** Whether it places the picker of the rest (`<deppicker key="cells" />`). */
  rest: boolean;
};

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** How the tree uses the dependencies declared as `key`, read off its stored form. */
export const dependencyUse = (roots: readonly unknown[], key: string): DependencyUse => {
  const read = new Set<string>();
  const listed = new Set<string>();
  const placed = new Set<string>();
  let rest = false;
  const stored = JSON.stringify(roots);
  const prefix = escaped(referenceKey(key, ''));
  for (const match of stored.matchAll(new RegExp(`(?<![A-Za-z0-9_])${prefix}([A-Za-z_][A-Za-z0-9_]*)(?:\\.([A-Za-z_][A-Za-z0-9_]*))?`, 'g'))) {
    if (match[1] === OPTIONS) {
      if (match[2]) listed.add(match[2]);
    } else {
      read.add(match[1]);
    }
  }
  const visit = (node: TreeNode) => {
    if (node.component === 'deppicker') {
      const written = literal(node, 'key');
      if (written === key) rest = true;
      else if (written?.startsWith(`${key}.`)) placed.add(written.slice(key.length + 1));
    }
    node.children?.forEach(visit);
  };
  roots.forEach(root => visit(root as TreeNode));
  return {read, listed, placed, rest};
};

const storeId = (key: string) => `dependencies:${key}`;

const keptPicks = (value: unknown): Record<string, PickedAgent> =>
  typeof value === 'object' && value !== null
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(
          (entry): entry is [string, PickedAgent] =>
            typeof entry[1] === 'object' && entry[1] !== null && typeof (entry[1] as PickedAgent).id === 'string',
        ),
      )
    : {};

export type BlokDependencyBindings = {
  declared: readonly DeclaredDependencies[];
  picks: DependencyPicks;
  /** Binds dependencies declared as `key` to agents; what is not named stays as it is. */
  pick: (key: string, agents: Readonly<Record<string, PickedAgent>>) => void;
};

/**
 * What this device keeps for the dependencies `roots` declares: `undefined`
 * while it is read, so the blok opens bound as it was left.
 */
export const useBlokDependencyBindings = (
  roots: readonly unknown[],
  store: BlokComponentStateStore | null,
): BlokDependencyBindings | undefined => {
  const declared = React.useMemo(() => declaredDependencies(roots), [roots]);
  const keys = declared.map(each => each.key).join('\u0000');
  const [loaded, setLoaded] = React.useState<{for: string; picks: Record<string, Record<string, PickedAgent>>} | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const wanted = keys ? keys.split('\u0000') : [];
    void Promise.all(
      wanted.map(async key => [key, keptPicks(store ? await store.load(storeId(key)).catch(() => null) : null)] as const),
    ).then(entries => {
      if (!cancelled) setLoaded({for: keys, picks: Object.fromEntries(entries)});
    });
    return () => {
      cancelled = true;
    };
  }, [keys, store]);

  const pick = React.useCallback(
    (key: string, agents: Readonly<Record<string, PickedAgent>>) => {
      setLoaded(current => {
        if (!current) return current;
        const next = {...current.picks[key], ...agents};
        store?.save(storeId(key), next);
        return {...current, picks: {...current.picks, [key]: next}};
      });
    },
    [store],
  );

  return React.useMemo(
    () => (loaded?.for === keys ? {declared, picks: loaded.picks, pick} : undefined),
    [declared, keys, loaded, pick],
  );
};

/** The dependencies of the action `declared` names, on the blok's own agent: empty until answered. */
export const useActionDependencies = (declared: DeclaredDependencies, selfAgentId: string | undefined): readonly ActionDependency[] => {
  const {data} = useImplementationAtQuery({
    variables: {agent: selfAgentId ?? '', interface: declared.action},
    skip: !selfAgentId || !declared.action,
  });
  return React.useMemo(
    () => (data?.implementationAt?.dependencies ?? []).map(dependency => ({id: dependency.id, key: dependency.key})),
    [data],
  );
};

/**
 * Seeds one dependency nobody chose an agent for yet, once: the agent the
 * latest run of its action had for it, when that agent still fits; else the
 * only agent that fits.
 */
export const BlokDependencySeed = (props: {
  action: string;
  dependency: ActionDependency;
  /** The blok's own agent: whose action it is. */
  selfAgentId: string | undefined;
  onSeed: (agent: PickedAgent) => void;
}) => {
  const {action, dependency, selfAgentId, onSeed} = props;
  const latest = useLatestTask({agentID: selfAgentId, name: action});
  const latestTask = latest?.task ?? null;
  const ran = useRunTaskQuery({variables: {id: latestTask ?? ''}, skip: !latestTask});
  const candidates = useAgentForDependencyQuery({variables: {dependency: dependency.id}});
  // Decided once both are answered: the latest run first, so several fitting agents do not leave it open.
  const answered = (latest !== null || !selfAgentId) && (!latestTask || !ran.loading) && !candidates.loading;
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!answered || seeded.current) return;
    const fitting = candidates.data?.agents ?? [];
    const followed = ran.data?.task.dependencyAgents.find(bound => bound.key === dependency.key)?.agent;
    const chosen = followed && fitting.some(agent => agent.id === followed.id) ? followed : fitting.length === 1 ? fitting[0] : undefined;
    if (!chosen) return;
    seeded.current = true;
    onSeed({id: chosen.id, name: chosen.name ?? null});
  }, [answered, candidates.data, dependency.key, onSeed, ran.data]);

  return null;
};

type Candidate = {id: string; name?: string | null; connected?: boolean};

/** The agents that fit a dependency, with the chosen one among them even when it no longer fits. */
const useCandidates = (dependency: ActionDependency | undefined, picked: PickedAgent | undefined): Candidate[] => {
  const {data} = useAgentForDependencyQuery({
    variables: {dependency: dependency?.id},
    skip: !dependency,
    fetchPolicy: 'cache-and-network',
    pollInterval: 15_000,
  });
  return React.useMemo(() => {
    const agents: Candidate[] = data?.agents ?? [];
    return picked && !agents.some(agent => agent.id === picked.id) ? [{id: picked.id, name: picked.name}, ...agents] : agents;
  }, [data, picked]);
};

/** The ready-made picker of one dependency: the agents that fit, the chosen one shown. Always changeable. */
export const BlokDependencyPicker = (props: {
  label: string;
  dependency: ActionDependency | undefined;
  picked: PickedAgent | undefined;
  onPick: (agent: PickedAgent) => void;
  className?: string;
}) => {
  const {label, dependency, picked, onPick, className} = props;
  const listed = useCandidates(dependency, picked);

  return (
    <Select
      value={picked?.id ?? ''}
      onValueChange={id => {
        const agent = listed.find(each => each.id === id);
        if (agent) onPick({id: agent.id, name: agent.name ?? null});
      }}
    >
      <SelectTrigger className={cn('w-full', className)} aria-label={label}>
        <SelectValue placeholder={`Choose ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {listed.map(agent => (
          <SelectItem key={agent.id} value={agent.id}>
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  agent.connected === false ? 'bg-destructive' : agent.connected ? 'bg-success' : 'bg-muted-foreground/40',
                )}
              />
              {agent.name || agent.id}
            </span>
          </SelectItem>
        ))}
        {listed.length === 0 ? <div className="px-2 py-1.5 text-sm text-muted-foreground">No agent fits</div> : null}
      </SelectContent>
    </Select>
  );
};

/**
 * Keeps `cells.options.<dependency>` (stored `deps.cells__options.<dependency>`)
 * on the agents that fit it: what a blok's own picker lists. Rendered inside
 * the blok's runtime.
 */
export const BlokDependencyOptionsSync = (props: {
  reference: string;
  dependency: ActionDependency;
  picked: PickedAgent | undefined;
}) => {
  const {reference, dependency, picked} = props;
  const store = useBlokRuntimeStoreApi();
  const listed = useCandidates(dependency, picked);
  const path = `deps.${referenceKey(reference, OPTIONS)}.${dependency.key}`;
  const written = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    const options = listed.map(agent => ({
      id: agent.id,
      name: agent.name ?? null,
      connected: agent.connected !== false,
      picked: agent.id === picked?.id,
    }));
    const key = JSON.stringify(options);
    if (written.current === key) return;
    written.current = key;
    store.getState().setRuntimeValue(path, options);
  }, [listed, path, picked, store]);

  return null;
};

/** What is known now of each chosen agent, by id: whether it is connected, and its name. */
export const usePickedAgents = (picks: DependencyPicks): ReadonlyMap<string, {connected: boolean; name: string | null}> => {
  const ids = React.useMemo(
    () => [...new Set(Object.values(picks).flatMap(each => Object.values(each).map(agent => agent.id)))].sort(),
    [picks],
  );
  const {data} = useAgentForDependencyQuery({
    variables: {values: ids},
    skip: ids.length === 0,
    fetchPolicy: 'cache-and-network',
    pollInterval: 10_000,
  });
  return React.useMemo(
    () => new Map((data?.agents ?? []).map(agent => [agent.id, {connected: agent.connected, name: agent.name ?? null}] as const)),
    [data],
  );
};

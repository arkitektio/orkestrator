import * as React from 'react';
import * as z from 'zod';
import {
  BlokScopeProvider,
  BlokSuspenseContext,
  createBlokComponent,
  useBlok,
  useBlokDrawContext,
  useResolvedProp,
  useScopedResolver,
  useSuspenseReport,
  useValue,
  type BlokComponentNode,
  type BlokSourceStatus,
  type BlokSuspenseReporter,
} from '../runtime';
import {useBlokRunHost} from './run/host';

/**
 * The language of base@2 (`core/blok/spec/base_v2.json`): components that
 * decide *whether* and *how often* their children render, rather than drawing
 * anything themselves. Lowercase names are reserved for language.
 *
 * - `<if when={...}>`: its children are the then-branch, then `<else when>`
 *   (else-if) and a last `<else>`; only the active branch is rendered and read.
 * - `<foreach items={...} let="p" key={p.id}>`: once per item, keyed; without
 *   `key`, keyed by position.
 * - `<match value={...}>` with `<case is={...}>` and `<default>`.
 * - `<suspense>` with `<fallback>` and `<error>`: React's model, the error
 *   boundary folded in; a pending read inside shows the fallback, a failed
 *   one the error (bound as `error`); stale never suspends.
 * - `<fragment>`; `<ask>`, the task's open ask.
 */

const renderNodes = (nodes: readonly BlokComponentNode[], buildChild: (id: string) => React.ReactNode) => (
  <>
    {nodes.map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

const renderDeclaredChildren = (component: BlokComponentNode, buildChild: (id: string) => React.ReactNode) =>
  renderNodes(component.children ?? [], buildChild);

/* -------------------------------------------------------------------------- */
/* foreach                                                                    */
/* -------------------------------------------------------------------------- */

const ForeachIteration = (props: {
  scopeName: string;
  /** Absolute path of this item, when the items came from a data binding. */
  itemPath?: string;
  /** The item itself, for sources that have no addressable path. */
  item: unknown;
  childIds: string[];
  buildChild: (id: string, basePath?: string) => React.ReactNode;
}) => {
  const {buildChild, childIds, item, itemPath, scopeName} = props;

  // A path-backed item aliases to its path, so a bound control inside the loop
  // writes the real backing list. Without a path the item is handed down by value.
  const aliases = React.useMemo(() => (itemPath ? {[scopeName]: itemPath} : undefined), [itemPath, scopeName]);
  const values = React.useMemo(() => (itemPath ? undefined : {[scopeName]: item}), [item, itemPath, scopeName]);

  return (
    <BlokScopeProvider aliases={aliases} values={values}>
      {childIds.map(childId => (
        <React.Fragment key={childId}>{buildChild(childId)}</React.Fragment>
      ))}
    </BlokScopeProvider>
  );
};

const foreachSchema = z
  .object({
    items: z.array(z.unknown()).nullish().describe('The list to iterate.'),
    let: z.string().describe('The name each item is read by inside the loop (`let="p"`, read as `p.name`).'),
    key: z
      .unknown()
      .optional()
      .describe('What identifies an item (`key={p.id}`): a reorder never reshuffles its subtree. Left out, items are keyed by position.'),
  })
  .describe('Renders its children once per item of a list, each keyed by `key`, or by its position without one.');

const keyText = (value: unknown, index: number): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return `#${index}`;
  return JSON.stringify(value);
};

/**
 * The runtime ids of a foreach's items (vocabulary `stored_tree.foreach`):
 * `<id>@<key>` with a key, `<id>@#<n>` without one (n the 0-based index).
 * `keys` is null for a foreach without `key`; two items with one key are told
 * apart by position, so they never share a subtree.
 */
export const foreachItemIds = (id: string, count: number, keys: readonly unknown[] | null): string[] => {
  const seen = new Map<string, number>();
  return Array.from({length: count}, (_, index) => {
    if (keys === null) return `${id}@#${index}`;
    let key = keyText(keys[index], index);
    const repeats = seen.get(key) ?? 0;
    seen.set(key, repeats + 1);
    if (repeats > 0) key = `${key}#${repeats}`;
    return `${id}@${key}`;
  });
};

export const Foreach = createBlokComponent(
  {name: 'foreach', acceptsChildren: true, placement: {inheritsContext: true}, schema: foreachSchema},
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const items = useValue(blok.items);
    const scopeName = blok['let'].prop?.declares_value ?? (typeof blok['let'].prop?.static_value === 'string' ? blok['let'].prop.static_value : '');
    const resolve = useScopedResolver();
    const childIds = React.useMemo(() => component.children?.map(child => child.id) ?? [], [component]);
    const itemsPath = blok.items.prop?.dynamic_value?.path?.replace(/[/.]+$/, '');
    const keyProp = blok.key.prop;

    if (!Array.isArray(items) || childIds.length === 0 || !scopeName) {
      return null;
    }

    const itemPath = (index: number): string | undefined => (itemsPath ? `${itemsPath}/${index}` : undefined);
    const keys = keyProp
      ? items.map((item, index) => {
          const path = itemPath(index);
          const resolved = resolve(keyProp, path ? {} : {[scopeName]: item}, path ? {[scopeName]: path} : undefined);
          return resolved.ok ? resolved.value : null;
        })
      : null;
    const ids = foreachItemIds(component.id, items.length, keys);
    return (
      <>
        {items.map((item, index) => {
          return (
            <ForeachIteration
              key={ids[index]}
              scopeName={scopeName}
              itemPath={itemPath(index)}
              item={item}
              childIds={childIds}
              buildChild={buildChild}
            />
          );
        })}
      </>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* if / else                                                                  */
/* -------------------------------------------------------------------------- */

const IF_COMPONENT = 'if';
const ELSE_COMPONENT = 'else';
const conditionSchema = z.unknown();

/** One `<else>` of a chain: taken when it has no `when` or its `when` holds, else the next one is asked. */
const ElseBranch = (props: {elses: readonly BlokComponentNode[]; index: number; buildChild: (id: string) => React.ReactNode}) => {
  const {elses, index, buildChild} = props;
  const node = elses[index];
  const hasWhen = (node.props ?? []).some(prop => prop.key === 'when');
  const condition = useResolvedProp(node, hasWhen ? 'when' : undefined, conditionSchema);
  const status: BlokSourceStatus = condition.ok ? (condition.status ?? {status: 'ready'}) : {status: 'ready'};
  useSuspenseReport(node.id, status);
  if (status.status === 'pending' || status.status === 'failed') return null;
  const taken = !hasWhen || (condition.ok && Boolean(condition.value));
  if (taken) return <>{buildChild(node.id)}</>;
  if (index + 1 < elses.length) return <ElseBranch elses={elses} index={index + 1} buildChild={buildChild} />;
  return null;
};

export const If = createBlokComponent(
  {
    name: IF_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({
        when: z.unknown().describe('The condition: its children render while it holds (JavaScript truthiness).'),
      })
      .describe('Renders its then-branch while a condition holds, else its first `<else>` whose `when` holds (or that has none).'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const when = useValue(blok.when);
    const children = component.children ?? [];
    const branch = children.filter(child => child.component !== ELSE_COMPONENT);
    const elses = children.filter(child => child.component === ELSE_COMPONENT);
    if (when) return renderNodes(branch, buildChild);
    if (elses.length === 0) return null;
    return <ElseBranch elses={elses} index={0} buildChild={buildChild} />;
  },
);

export const Else = createBlokComponent(
  {
    name: ELSE_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true, downstreamOf: [IF_COMPONENT]},
    schema: z
      .object({
        when: z.unknown().optional().describe('Makes it an else-if: taken when this holds. Only the last `<else>` may leave it out.'),
      })
      .describe('A branch of an `<if>`: rendered when the `if` and every `<else>` before it did not hold.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

export const Fragment = createBlokComponent(
  {
    name: 'fragment',
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z.object({}).describe('Renders its children without introducing an element.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

export const Html = createBlokComponent(
  {
    name: 'Html',
    acceptsChildren: true,
    placement: {childrenContext: 'html', notDownstreamOf: ['Html']},
    schema: z.object({}).describe("The root of an html blok (a panel, a dashboard, a popout's page): lays its children out as a fragment does, and names the blok's context."),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

/* -------------------------------------------------------------------------- */
/* match                                                                      */
/* -------------------------------------------------------------------------- */

const MATCH_COMPONENT = 'match';
const CASE_COMPONENT = 'case';
const DEFAULT_COMPONENT = 'default';

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  const left = Object.entries(a as Record<string, unknown>);
  const right = b as Record<string, unknown>;
  return left.length === Object.keys(right).length && left.every(([key, value]) => key in right && deepEqual(value, right[key]));
};

/** Whether a case's literal names the value: deep equality, as `==` (`cmp.eq`). */
export const caseMatches = (value: unknown, literal: unknown): boolean => deepEqual(value ?? null, literal ?? null);

export const Match = createBlokComponent(
  {
    name: MATCH_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({
        value: z.unknown().describe('The value to match (`value={task.status}`).'),
      })
      .describe('Renders the first `<case>` whose `is` equals the value, else its `<default>`.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = component.children ?? [];
    const chosen =
      children.find(child => child.component === CASE_COMPONENT && caseMatches(value, child.props?.find(prop => prop.key === 'is')?.static_value)) ??
      children.find(child => child.component === DEFAULT_COMPONENT);
    return chosen ? <>{buildChild(chosen.id)}</> : null;
  },
);

export const Case = createBlokComponent(
  {
    name: CASE_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true, downstreamOf: [MATCH_COMPONENT]},
    schema: z
      .object({
        is: z.unknown().optional().describe('The literal this case matches (`is="done"`, `is={3}`).'),
      })
      .describe('One branch of a `<match>`: its children render when the matched value equals `is`.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

export const Default = createBlokComponent(
  {
    name: DEFAULT_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true, downstreamOf: [MATCH_COMPONENT]},
    schema: z.object({}).describe('The branch of a `<match>` that renders when no `<case>` matches.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

/* -------------------------------------------------------------------------- */
/* suspense                                                                   */
/* -------------------------------------------------------------------------- */

const SUSPENSE_COMPONENT = 'suspense';
const FALLBACK_COMPONENT = 'fallback';
const ERROR_COMPONENT = 'error';
/** What `<error>` binds: the error that made it show. */
export const ERROR_ROOT = 'error';

/** Children stay mounted while the boundary shows its fallback, so they keep reporting; html hides them. */
const Hidden = ({hidden, children}: {hidden: boolean; children: React.ReactNode}) => {
  const draw = useBlokDrawContext();
  if (draw !== 'html') return hidden ? null : <>{children}</>;
  return <div style={{display: hidden ? 'none' : 'contents'}}>{children}</div>;
};

export const Suspense = createBlokComponent(
  {
    name: SUSPENSE_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({})
      .describe(
        'A boundary: while any read inside is pending it shows its `<fallback>`, when one failed its `<error>` (with `error`); stale values never suspend.',
      ),
  },
  ({buildChild, component}) => {
    const [statuses, setStatuses] = React.useState<ReadonlyMap<string, BlokSourceStatus>>(() => new Map());
    const reporter = React.useMemo<BlokSuspenseReporter>(
      () => ({
        report: (nodeId, status) =>
          setStatuses(previous => {
            const current = previous.get(nodeId);
            const same = current?.status === status?.status && current?.error === status?.error && current?.code === status?.code;
            if (status === null ? current === undefined : same) {
              return previous;
            }
            const next = new Map(previous);
            if (status === null) next.delete(nodeId);
            else next.set(nodeId, status);
            return next;
          }),
      }),
      [],
    );
    const children = component.children ?? [];
    const fallback = children.find(child => child.component === FALLBACK_COMPONENT);
    const errorSlot = children.find(child => child.component === ERROR_COMPONENT);
    const body = children.filter(child => child.component !== FALLBACK_COMPONENT && child.component !== ERROR_COMPONENT);
    const all = [...statuses.values()];
    const failed = all.find(status => status.status === 'failed');
    const pending = all.some(status => status.status === 'pending');
    const error = React.useMemo(
      () => (failed ? {[ERROR_ROOT]: {message: failed.error ?? 'Could not load.', code: failed.code ?? null}} : undefined),
      [failed],
    );

    return (
      <>
        {failed && errorSlot ? <BlokScopeProvider values={error}>{buildChild(errorSlot.id)}</BlokScopeProvider> : null}
        {!failed && pending && fallback ? buildChild(fallback.id) : null}
        <BlokSuspenseContext.Provider value={reporter}>
          <Hidden hidden={Boolean(failed) || pending}>{renderNodes(body, buildChild)}</Hidden>
        </BlokSuspenseContext.Provider>
      </>
    );
  },
);

const slot = (name: string, description: string) =>
  createBlokComponent(
    {
      name,
      acceptsChildren: true,
      placement: {inheritsContext: true, downstreamOf: [SUSPENSE_COMPONENT]},
      schema: z.object({}).describe(description),
    },
    ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
  );

export const Fallback = slot(FALLBACK_COMPONENT, 'What a `<suspense>` shows while a read inside it is pending.');
export const ErrorSlot = slot(ERROR_COMPONENT, 'What a `<suspense>` shows when a read inside it failed; `error.message` says why.');

/* -------------------------------------------------------------------------- */
/* ask                                                                        */
/* -------------------------------------------------------------------------- */

export const Ask = createBlokComponent(
  {
    name: 'ask',
    schema: z
      .object({})
      .describe("The open ask of `task`, as a form generated from its ports: answered right here, which resumes the task. Nothing while none is open."),
  },
  () => <>{useBlokRunHost().renderAsk()}</>,
);

export const controlBlokComponents = [
  Foreach,
  If,
  Else,
  Fragment,
  Html,
  Match,
  Case,
  Default,
  Suspense,
  Fallback,
  ErrorSlot,
  Ask,
];

import * as React from 'react';
import * as z from 'zod';
import {
  BlokPropSchemas,
  BlokScopeProvider,
  createBlokComponent,
  recordPhase,
  useBlok,
  useValue,
  type BlokComponentNode,
  type BlokRecordPhase,
} from '../runtime';
import {childListSchema, childSchema, renderChildList} from './shared';

/**
 * Control-flow bloks: components that decide *whether* and *how often* their
 * children render, rather than drawing anything themselves. They are the base
 * catalog's components (`../baseCatalog.ts`), named in lowercase like every
 * base element; a UI catalog such as orkestrator's extends them.
 */

const ForeachIteration = (props: {
  scopeName?: string;
  /** Absolute path of this item, when the items came from a data binding. */
  itemPath?: string;
  /** The item itself, for sources that have no addressable path. */
  item: unknown;
  childIds: string[];
  buildChild: (id: string, basePath?: string) => React.ReactNode;
  iterationKey: string;
}) => {
  const {buildChild, childIds, item, itemPath, iterationKey, scopeName} = props;

  // A named scope backed by a real path aliases to it, so reads *and* writes
  // from inside the loop body hit the shared data model. Without a path we can
  // only hand the value down, which is read-only but still correct.
  const aliases = React.useMemo(
    () => (scopeName && itemPath ? {[scopeName]: itemPath} : undefined),
    [itemPath, scopeName],
  );
  const values = React.useMemo(
    () => (scopeName && !itemPath ? {[scopeName]: item} : undefined),
    [item, itemPath, scopeName],
  );

  const renderedChildren = childIds.map(childId => (
    <React.Fragment key={`${iterationKey}-${childId}`}>{buildChild(childId)}</React.Fragment>
  ));

  if (!aliases && !values && !itemPath) {
    return <>{renderedChildren}</>;
  }

  return (
    <BlokScopeProvider
      aliases={aliases}
      values={values}
      basePath={scopeName ? undefined : itemPath}
    >
      {renderedChildren}
    </BlokScopeProvider>
  );
};

export const Foreach = createBlokComponent(
  {
    name: 'foreach',
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({
        items: z
          .array(z.unknown())
          .optional()
          .describe('The list to iterate. Bind it to a data-model path to make it writable.'),
        let: z
          .string()
          .optional()
          .describe('Scope name each item is addressable by inside the loop body.'),
      })
      .describe('Renders its declared children once per item of a list.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const items = useValue(blok.items);
    const scopeName = useValue(blok['let']);
    const childIds = React.useMemo(
      () => component.children?.map(child => child.id) ?? [],
      [component],
    );

    // Only a data-bound `items` has an addressable path. A literal or
    // util-call source still iterates correctly — the item is passed down by
    // value instead of by path — where it used to silently fall through to the
    // unscoped path and render the wrong data.
    const itemsPath = blok.items.prop?.dynamic_value?.path?.replace(/[/.]+$/, '');

    if (!Array.isArray(items) || childIds.length === 0) {
      return null;
    }

    return (
      <>
        {items.map((item, index) => {
          const iterationKey = `${component.id}-${index}`;

          return (
            <ForeachIteration
              key={iterationKey}
              iterationKey={iterationKey}
              scopeName={scopeName}
              itemPath={itemsPath ? `${itemsPath}/${index}` : undefined}
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

export const If = createBlokComponent(
  {
    name: 'if',
    placement: {inheritsContext: true},
    schema: z
      .object({
        when: BlokPropSchemas.DynamicBoolean.optional().describe(
          'Condition. Bind it to a path or compute it with a pure util call.',
        ),
        then: childSchema.describe('Rendered when the condition holds.'),
        else: childSchema.describe('Rendered when it does not.'),
      })
      .describe('Renders one of two children depending on a condition.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const when = useValue(blok.when);
    const thenChild = useValue(blok['then']);
    const elseChild = useValue(blok['else']);

    const selected = when === true ? thenChild : elseChild;
    return selected ? <>{buildChild(selected)}</> : null;
  },
);

export const Fragment = createBlokComponent(
  {
    name: 'fragment',
    placement: {inheritsContext: true},
    schema: z
      .object({
        children: childListSchema,
      })
      .describe('Renders its children without introducing an element.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);

    return <>{renderChildList(children, buildChild)}</>;
  },
);

const renderDeclaredChildren = (
  component: BlokComponentNode,
  buildChild: (id: string) => React.ReactNode,
) => (
  <>
    {component.children?.map(child => (
      <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
    ))}
  </>
);

export const When = createBlokComponent(
  {
    name: 'when',
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({
        test: BlokPropSchemas.DynamicBoolean.optional().describe(
          'Condition. Bind it to a path (`@cells.ready`) or compute it with a pure util call (`@utils.gt(count, 0)`).',
        ),
        not: z.boolean().optional().describe('Render when the condition does NOT hold.'),
      })
      .describe('Renders its declared children while a condition holds: an `if` without naming the children by id.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const test = useValue(blok.test) === true;
    const not = useValue(blok.not) === true;

    return test !== not ? renderDeclaredChildren(component, buildChild) : null;
  },
);

/* -------------------------------------------------------------------------- */
/* Match                                                                      */
/* -------------------------------------------------------------------------- */

const MATCH_COMPONENT = 'match';
const CASE_COMPONENT = 'case';
const DEFAULT_COMPONENT = 'default';

const caseValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * Whether a case's literal names the value. BSX writes every literal as a
 * string, so `is="3"` must match a `3` and `is="true"` a `true`: primitives
 * compare by their text.
 */
export const caseMatches = (value: unknown, literal: unknown): boolean => {
  if (Object.is(value, literal)) return true;
  if (value == null || literal == null) return value == null && (literal == null || literal === 'null');
  if (typeof value === 'object' || typeof literal === 'object') return false;
  return String(value) === String(literal);
};

/** A case's `is`, read off the node: one literal or a list of them. */
const caseLiterals = (node: BlokComponentNode): unknown[] => {
  const raw = node.props?.find(prop => prop.key === 'is')?.static_value;
  return Array.isArray(raw) ? raw : [raw];
};

export const Match = createBlokComponent(
  {
    name: MATCH_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true},
    schema: z
      .object({
        value: z
          .unknown()
          .optional()
          .describe('The value to match, typically a path: `@job.status`.'),
      })
      .describe(
        'Renders the first `case` child whose `is` names the value, else its `default` child. The way to compare against several values, since a blok expression has no `==`.',
      ),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const children = component.children ?? [];

    const chosen =
      children.find(
        child => child.component === CASE_COMPONENT && caseLiterals(child).some(literal => caseMatches(value, literal)),
      ) ?? children.find(child => child.component === DEFAULT_COMPONENT);

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
        is: z
          .union([caseValueSchema, z.array(caseValueSchema)])
          .optional()
          .describe('The literal this case matches, or a list of them. A literal: it is read off the blok, not resolved.'),
      })
      .describe('One branch of a `match`: its children render when the matched value is `is`.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

export const Default = createBlokComponent(
  {
    name: DEFAULT_COMPONENT,
    acceptsChildren: true,
    placement: {inheritsContext: true, downstreamOf: [MATCH_COMPONENT]},
    schema: z.object({}).describe('The branch of a `match` that renders when no `case` matches.'),
  },
  ({buildChild, component}) => renderDeclaredChildren(component, buildChild),
);

/* -------------------------------------------------------------------------- */
/* Record slots                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The record a reading component (`query`) hands the slots inside it, so they
 * need no `of`. Outside one, a slot names its record with `of`.
 */
export const BlokRecordContext = React.createContext<unknown>(undefined);

const slot = (name: string, phases: readonly BlokRecordPhase[], description: string) =>
  createBlokComponent(
    {
      name,
      acceptsChildren: true,
      placement: {inheritsContext: true},
      schema: z
        .object({
          of: z
            .unknown()
            .optional()
            .describe(
              'The record to follow: a read bound with `bind` (`@cells`) or a run bound with `.into(job)` (`@job`). Inside a `query` it defaults to the query\'s.',
            ),
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const of = useValue(blok.of);
      const inherited = React.useContext(BlokRecordContext);
      const phase = recordPhase(of !== undefined ? of : inherited);

      return phases.includes(phase) ? renderDeclaredChildren(component, buildChild) : null;
    },
  );

export const Pending = slot(
  'pending',
  ['pending'],
  'Renders its children while a read (or a run) is under way and there is no earlier answer to show.',
);
export const Failed = slot('failed', ['failed'], 'Renders its children when a read (or a run) failed. The reason is `<record>.error`.');
export const Empty = slot('empty', ['empty'], 'Renders its children when a read answered with nothing: no rows, every field empty.');
export const Ready = slot(
  'ready',
  ['ready'],
  'Renders its children once a read answered with something (or a run is done), including while a newer read refreshes it.',
);

export const controlBlokComponents = [
  Foreach,
  If,
  Fragment,
  When,
  Match,
  Case,
  Default,
  Pending,
  Failed,
  Empty,
  Ready,
];

import * as React from 'react';
import * as z from 'zod';
import {
  BlokPropSchemas,
  BlokScopeProvider,
  createBlokComponent,
  useBlok,
  useValue,
} from '../runtime';
import {childListSchema, childSchema, renderChildList} from './shared';

/**
 * Control-flow bloks: components that decide *whether* and *how often* their
 * children render, rather than drawing anything themselves.
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
    name: 'Fragment',
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

export const controlBlokComponents = [Foreach, If, Fragment];

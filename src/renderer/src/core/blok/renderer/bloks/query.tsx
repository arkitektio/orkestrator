import * as React from 'react';
import * as z from 'zod';
import {useServiceQuery} from '@/core/modules/hooks/useServiceQuery';
import {queryVariables, readOnlyQueryProblem, requiredQueryVariables} from '@/core/ports/engine/constraints';
import {createBlokComponent, useBinding, useBlok, useBlokResource, useDataPaths, useValue} from '../runtime';
import {BlokRecordContext} from './control';
import {asStructure, bindSchema, boolSchema, renderChildList} from './shared';

/**
 * A GraphQL read, as a blok — a base component (`../baseCatalog.ts`), since any
 * Arkitekt UI with clients for its services can run one: the query runs on one service and its record
 * (`BlokResourceRecord`) is written under `bind`, where the rest of the blok
 * reads it (`@cells.data.datasets`, `@cells.loading`). The slots inside it
 * (`pending`, `failed`, `empty`, `ready`) follow it without
 * naming it.
 *
 *     <query schema="mikro" bind="cells"
 *       query="query($folder: ID!) { datasets: arrayDatasets(filters: {folder: $folder}) { id name } }">
 *       <pending><Spinner /></pending>
 *       <ready>
 *         <foreach items="@cells.data.datasets" let="#ds"><Text text="@ds.name" /></foreach>
 *       </ready>
 *     </query>
 *
 * Variables follow `StructurePicker`'s rule: `variables` first, else the data
 * path of the same name (a structure held there goes as its id). A variable
 * declared non-null is one the query is not asked without.
 *
 * Reads only, never a mutation: a document holding anything but one `query`
 * fails without being sent (`readOnlyQueryProblem`, also enforced by
 * `useServiceQuery` and marked by the editor). Whatever changes something goes
 * through an action, so it is the agent's and is recorded as such.
 */

/** A value as a query variable: a structure is known to its service by its id. */
const asVariable = (raw: unknown): unknown => {
  if (Array.isArray(raw)) return raw.map(asVariable);
  return asStructure(raw)?.object ?? raw ?? null;
};

export const querySchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe(
        'The GraphQL query, run on the `schema` service: one `query` operation, never a mutation or subscription (a change goes through an action). Each variable it declares is read from `variables`, else from the data path of the same name; a structure held there is passed as its id. The query waits for every variable declared non-null.',
      ),
    schema: z
      .string()
      .optional()
      .describe(
        'The service whose schema `query` is written against, and which runs it, by its key: "mikro". A validator that knows the service type-checks the query and what the blok reads of its answer.',
      ),
    variables: z
      .record(z.string(), z.unknown())
      .nullish()
      .describe('Values for the variables `query` declares, ahead of the data paths of the same name.'),
    bind: bindSchema.describe(
      'Where the record is written: {"status", "loading", "ready", "failed", "empty", "stale", "error", "data"}. `data` is the query\'s answer, typed by its selection when the validator knows the schema. The validator seeds an idle record in demo_state; a preview, which runs no query, shows what demo_state holds there.',
    ),
    poll: z
      .number()
      .optional()
      .describe('Ask again every this many seconds while the blok is open.'),
    clearOnUnmount: boolSchema.describe(
      'Remove the record when this query leaves the screen, instead of keeping it marked stale.',
    ),
  })
  .describe(
    'Runs a GraphQL query (reads only, never a mutation) against one service and writes its record under `bind`. Renders its children always; the record slots inside it (`pending`, `failed`, `empty`, `ready`) follow its record.',
  );

export const QueryBlok = createBlokComponent(
  {
    name: 'query',
    acceptsChildren: true,
    placement: {inheritsContext: true},
    writesRecordTo: 'bind',
    schema: querySchema,
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const query = useValue(blok.query);
    const schemaKey = useValue(blok.schema);
    const explicit = useValue(blok.variables);
    const bind = useValue(blok.bind);
    const poll = useValue(blok.poll);
    const clearOnUnmount = useValue(blok.clearOnUnmount) === true;
    const run = useServiceQuery(schemaKey);

    const declared = React.useMemo(() => (query ? queryVariables(query) : []), [query]);
    const required = React.useMemo(() => new Set(query ? requiredQueryVariables(query) : []), [query]);
    const read = useDataPaths(declared);
    // By content: the paths hand back rebuilt objects on most renders, and the
    // query is asked again only when what they say changes.
    const variables = Object.fromEntries(
      declared.map(name => [name, asVariable(explicit && name in explicit ? explicit[name] : read.get(name))]),
    );
    const variablesKey = JSON.stringify(variables);
    const ready = Boolean(query && schemaKey) && declared.every(name => !required.has(name) || variables[name] != null);

    const record = useBlokResource({
      bind,
      key: `${schemaKey ?? ''}\u0000${query ?? ''}\u0000${variablesKey}`,
      enabled: ready,
      load: async () => {
        const problem = readOnlyQueryProblem(query as string);
        if (problem) throw new Error(problem);
        return run(query as string, JSON.parse(variablesKey) as Record<string, unknown>);
      },
      pollMs: poll ? poll * 1000 : undefined,
      clearOnUnmount,
    });

    // The slots follow what is under `bind` when there is one: the same record
    // once a read started, and the demo_state's seed before (the preview).
    const bound = useBinding(bind);
    const shown = bound && bound.value != null && record.status === 'idle' ? bound.value : record;

    return (
      <BlokRecordContext.Provider value={shown}>
        {renderChildList(component.children, buildChild)}
      </BlokRecordContext.Provider>
    );
  },
);

export const queryBlokComponents = [QueryBlok];

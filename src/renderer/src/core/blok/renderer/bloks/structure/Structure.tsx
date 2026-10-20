import * as React from 'react';
import * as z from 'zod';
import {StructurePickerControl, type PickerRequest} from '@/core/forms/StructurePickerControl';
import {useServiceQuery} from '@/core/modules/hooks/useServiceQuery';
import {useOptionSourceHonoursRequires, useStructureOptions} from '@/core/modules/hooks/useStructureOptions';
import {queryVariables, requiredQueryVariables} from '@/core/ports/engine/constraints';
import {StructureDisplay} from '@/core/smart/display/StructureDisplay';
import {StructureViewer} from '@/core/smart/display/StructureViewer';
import {cn} from '@/core/util/utils';
import {
  BlokPropSchemas,
  createBlokComponent,
  useBlok,
  useBlokPort,
  useDataPaths,
  useEventAction,
  useValue,
} from '../../runtime';
import {
  actionProp,
  asStructure,
  bindSchema,
  boolSchema,
  classNameSchema,
  disabledSchema,
  sizeSchema,
  structureValueSchema,
  useControlledValue,
  type StructureValue,
} from '../shared';

/**
 * Bloks over other modules' objects, by structure identifier.
 *
 * None of them imports a module: the picker asks the owning module's option
 * source, the display and the viewer mount what it registered (`displays`,
 * `viewers`), each behind that module's guard. A deployment without the module
 * degrades to a notice.
 */

const Notice = ({children, className}: {children: React.ReactNode; className?: string}) => (
  <div
    className={cn(
      'flex h-full min-h-10 w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-sm text-muted-foreground',
      className,
    )}
  >
    {children}
  </div>
);

const emptyTextSchema = BlokPropSchemas.DynamicString.optional().describe(
  'Shown while there is no structure.',
);

/** One candidate, as a search answers it. */
type Option = {value: string; label: string; description?: string};

const keyOf = (option: Option) => option.value;

const renderOption = (option: Option) => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate">{option.label}</span>
    {option.description && (
      <span className="truncate text-xs text-muted-foreground">{option.description}</span>
    )}
  </div>
);

const renderChosen = (option: Option) => <span className="truncate">{option.label}</span>;

/**
 * The variables a picker's query is handed by the picker itself: what the
 * user typed, the ids to resolve, a page, and what the port being filled
 * requires. Every other variable is the author's and is read from the data.
 */
const RESERVED_VARIABLES = new Set(['search', 'values', 'limit', 'offset', 'requires']);

/**
 * A value as a query variable. A structure is held as `{__identifier, object}`
 * and known to its service by its id, so the id is what the query gets (a
 * list of structures, their ids); anything else goes as it is.
 */
const asVariable = (raw: unknown): unknown => {
  if (Array.isArray(raw)) return raw.map(asVariable);
  return asStructure(raw)?.object ?? raw ?? null;
};

const asOptions = (raw: unknown): Option[] =>
  (Array.isArray(raw) ? raw : []).flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const {value, label, description} = entry as Record<string, unknown>;
    if (value == null) return [];
    return [
      {
        value: String(value),
        label: typeof label === 'string' && label ? label : String(value),
        description: typeof description === 'string' && description ? description : undefined,
      },
    ];
  });

export const StructurePickerBlok = createBlokComponent(
  {
    name: 'StructurePicker',
    schema: z
      .object({
        identifier: z
          .string()
          .optional()
          .describe(
            'The kind of structure to pick, e.g. "@mikro/arraydataset". As the widget of an action input it defaults to the structure the input is typed on.',
          ),
        bind: bindSchema,
        value: structureValueSchema.describe('Controlled value, a structure reference.'),
        query: z
          .string()
          .optional()
          .describe(
            'The GraphQL query that lists the candidates, run on `ward`. It selects a list aliased `options` with `value` (the id), `label` and optionally `description`, and may declare: $search: String (what the user typed), $values: [ID!] (ids to resolve), $limit: Int and $offset: Int (a page), $requires (the constraints of the action input being filled). Any other variable is read from `variables`, else from the data path of the same name; a structure held there is passed as its id. A nullable one narrows the list while it has a value and the user may lift it; the picker waits for one declared non-null. Without a query the module that owns the structure answers.',
          ),
        ward: z
          .string()
          .optional()
          .describe('The service that runs `query`, by its key, e.g. "mikro".'),
        variables: z
          .record(z.string(), z.unknown())
          .nullish()
          .describe('Values for the variables `query` declares beyond the ones the picker supplies.'),
        placeholder: BlokPropSchemas.DynamicString.optional().describe(
          'Shown while nothing is selected.',
        ),
        disabled: disabledSchema,
        className: classNameSchema,
        onChange: actionProp(
          'Runs on selection. $event is the structure reference, or null when cleared.',
        ),
      })
      .describe(
        'A search-backed picker for one structure of a given identifier. Writes {"object", "__identifier"}, or null when cleared. The candidates come from its `query`, or from the module that owns the structure when it has none.',
      ),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const port = useBlokPort();
    const identifier = useValue(blok.identifier) ?? port?.identifier;
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const query = useValue(blok.query);
    const ward = useValue(blok.ward);
    const explicit = useValue(blok.variables);
    const placeholder = useValue(blok.placeholder);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const source = useStructureOptions(identifier ?? '');
    const sourceHonoursRequires = useOptionSourceHonoursRequires(identifier ?? '');
    const run = useServiceQuery(ward);
    const controlled = useControlledValue<StructureValue | null>({
      bind,
      // `undefined` leaves the control to its binding; `null` is a held value.
      value: value === undefined ? undefined : asStructure(value),
      defaultValue: undefined,
      fallback: null,
      parse: asStructure,
    });

    const declared = React.useMemo(() => (query ? queryVariables(query) : []), [query]);
    const free = React.useMemo(() => declared.filter(name => !RESERVED_VARIABLES.has(name)), [declared]);
    const read = useDataPaths(free);
    // Keyed by content: the port, the variables and what the paths hold are
    // rebuilt objects on most renders, and the query must only be asked again
    // when what they say changes.
    const boundKey = JSON.stringify(
      free.map(name => asVariable(explicit && name in explicit ? explicit[name] : read.get(name))),
    );
    const requiresKey = JSON.stringify(port?.requires ?? []);
    // A variable declared non-null is one the query cannot be asked without:
    // the picker waits for it, and it is never lifted. A nullable one narrows
    // the list while it has a value, and the user may lift that.
    const required = React.useMemo(() => new Set(query ? requiredQueryVariables(query) : []), [query]);
    const waitingFor = React.useMemo(
      () => free.filter((name, index) => required.has(name) && (JSON.parse(boundKey) as unknown[])[index] == null),
      [free, required, boundKey],
    );
    const narrowedBy = React.useMemo(
      () => free.filter((name, index) => !required.has(name) && (JSON.parse(boundKey) as unknown[])[index] != null),
      [free, required, boundKey],
    );

    // What the author's variables narrow the list to is on for every new set
    // of values; lifting it lasts until one of them changes.
    const [liftedFor, setLiftedFor] = React.useState<string | undefined>(undefined);
    const narrowed = narrowedBy.length > 0 && liftedFor !== boundKey;

    const queried = Boolean(query && ward);
    const load = React.useCallback(
      async (request: PickerRequest): Promise<Option[]> => {
        if (!queried) {
          if (!source) return [];
          // A held value is resolved by its id alone, as below.
          return source(
            request.ids ? {values: request.ids} : {search: request.search, requires: JSON.parse(requiresKey)},
          );
        }
        const bound = JSON.parse(boundKey) as unknown[];
        // A held value is resolved by its id alone, so it shows even when it
        // no longer meets what narrows the list.
        const listing = !request.ids;
        const supplied: Record<string, unknown> = {
          search: listing ? request.search : undefined,
          values: request.ids,
          limit: request.limit,
          offset: request.offset,
          requires: listing ? JSON.parse(requiresKey) : undefined,
        };
        const variables: Record<string, unknown> = {};
        declared.forEach(name => {
          if (RESERVED_VARIABLES.has(name)) {
            if (supplied[name] !== undefined) variables[name] = supplied[name];
          } else {
            const held = bound[free.indexOf(name)];
            variables[name] = required.has(name) || (listing && narrowed) ? held : null;
          }
        });
        const data = await run(query as string, variables);
        return asOptions(data.options);
      },
      [queried, source, run, query, declared, free, required, boundKey, requiresKey, narrowed],
    );

    if (!identifier || (!queried && !source)) {
      return <Notice className={className}>No picker available for {identifier ?? 'this structure'}.</Notice>;
    }

    if (waitingFor.length > 0) {
      return <Notice className={className}>Waiting for: {waitingFor.join(', ')}</Notice>;
    }

    return (
      <StructurePickerControl
        value={controlled.value ? String(controlled.value.object) : undefined}
        onChange={id => {
          // `null`, never `undefined`: an argument reading this path must see
          // "nothing selected", not fall back to its literal.
          const next = id ? {object: id, __identifier: identifier} : null;
          controlled.setValue(next);
          onChange?.(next);
        }}
        noun={identifier.split('/').pop() || 'option'}
        load={load}
        keyOf={keyOf}
        renderRow={renderOption}
        renderValue={renderChosen}
        requires={
          (queried ? declared.includes('requires') : sourceHonoursRequires) ? port?.requires : undefined
        }
        scope={
          narrowedBy.length > 0
            ? {
                label: `Narrowed by ${narrowedBy.join(', ')}`,
                active: narrowed,
                onToggle: () => setLiftedFor(narrowed ? boundKey : undefined),
              }
            : undefined
        }
        paged={queried && declared.includes('limit') && declared.includes('offset')}
        placeholder={placeholder}
        disabled={disabled === true}
        className={className}
      />
    );
  },
);

export const StructureDisplayBlok = createBlokComponent(
  {
    name: 'StructureDisplay',
    schema: z
      .object({
        value: structureValueSchema.describe('The structure to show.'),
        variant: z
          .enum(['inline', 'avatar', 'chip', 'card'])
          .optional()
          .describe('How much of it to show. Defaults to "card".'),
        link: boolSchema.describe("Link to the structure's own page."),
        emptyText: emptyTextSchema,
        className: classNameSchema,
      })
      .describe('Shows a structure through the display of the module that owns it.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const structure = asStructure(useValue(blok.value));
    const variant = useValue(blok.variant);
    const link = useValue(blok.link);
    const emptyText = useValue(blok.emptyText);
    const className = useValue(blok.className);

    if (!structure) {
      return <Notice className={className}>{emptyText ?? 'Nothing selected.'}</Notice>;
    }

    return (
      <StructureDisplay
        identifier={structure.__identifier}
        id={structure.object}
        variant={variant ?? 'card'}
        link={link === true}
        className={className}
        fallback={<Notice className={className}>No display available for {structure.__identifier}.</Notice>}
      />
    );
  },
);

export const StructureViewerBlok = createBlokComponent(
  {
    name: 'StructureViewer',
    schema: z
      .object({
        value: structureValueSchema.describe('The structure to open.'),
        height: sizeSchema.describe('CSS height of the viewer. Defaults to "24rem".'),
        minHeight: sizeSchema.describe('CSS minimum height of the viewer.'),
        controls: boolSchema.describe("Show the viewer's own controls. Defaults to true."),
        emptyText: emptyTextSchema,
        className: classNameSchema,
      })
      .describe(
        'An interactive viewer for a structure (a mikro image or scene), provided by the module that owns it.',
      ),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const structure = asStructure(useValue(blok.value));
    const height = useValue(blok.height);
    const minHeight = useValue(blok.minHeight);
    const controls = useValue(blok.controls);
    const emptyText = useValue(blok.emptyText);
    const className = useValue(blok.className);

    // A viewer fills its box, and nothing above a blok has a height to fill.
    return (
      <div
        className={cn('relative w-full overflow-hidden rounded-xl', className)}
        style={{height: height ?? '24rem', minHeight}}
      >
        {structure ? (
          <StructureViewer
            identifier={structure.__identifier}
            id={structure.object}
            controls={controls !== false}
            fallback={<Notice>No viewer available for {structure.__identifier}.</Notice>}
          />
        ) : (
          <Notice>{emptyText ?? 'Nothing to show yet.'}</Notice>
        )}
      </div>
    );
  },
);

export const structureBlokComponents = [StructurePickerBlok, StructureDisplayBlok, StructureViewerBlok];

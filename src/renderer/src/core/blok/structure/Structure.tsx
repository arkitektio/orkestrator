import * as React from 'react';
import {structureCatalog} from '@arkitektio/bsx/catalogs';
import {StructurePickerControl, type PickerRequest} from '@/core/forms/StructurePickerControl';
import {useServiceQuery} from '@/core/modules/hooks/useServiceQuery';
import {useOptionSourceHonoursRequires, useStructureOptions} from '@/core/modules/hooks/useStructureOptions';
import {queryVariables, requiredQueryVariables} from '@/core/ports/engine/constraints';
import {StructureDisplay} from '@/core/smart/display/StructureDisplay';
import {StructureViewer} from '@/core/smart/display/StructureViewer';
import {cn} from '@/core/util/utils';
import {
  implementBlokCatalog,
  type BlokRender,
  useBlok,
  useBlokPort,
  useDataPaths,
  useEventAction,
  useValue,
} from '@arkitektio/bsx/renderer/runtime/index';
import {asStructure, useControlledValue, type StructureValue} from '@arkitektio/bsx/renderer/bloks/shared/index';

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

const StructurePickerRender: BlokRender<(typeof structureCatalog.components)['StructurePicker']> = ({component, schema}) => {
    const blok = useBlok(component, schema);
    const port = useBlokPort();
    const identifier = useValue(blok.identifier) ?? port?.identifier;
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const query = useValue(blok.query);
    const ward = useValue(blok.ward);
    const schemaKey = ward;
    const explicit = useValue(blok.variables);
    const placeholder = useValue(blok.placeholder);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const source = useStructureOptions(identifier ?? '');
    const sourceHonoursRequires = useOptionSourceHonoursRequires(identifier ?? '');
    const run = useServiceQuery(schemaKey);
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

    const queried = Boolean(query && schemaKey);
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
};

const StructureDisplayRender: BlokRender<(typeof structureCatalog.components)['StructureDisplay']> = ({component, schema}) => {
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
};

const StructureViewerRender: BlokRender<(typeof structureCatalog.components)['StructureViewer']> = ({component, schema}) => {
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
};

/** structure@1, drawn with this app's smart system. */
export const orkestratorStructure = implementBlokCatalog(structureCatalog, {
  StructurePicker: StructurePickerRender,
  StructureDisplay: StructureDisplayRender,
  StructureViewer: StructureViewerRender,
});

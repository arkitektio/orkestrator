import * as React from 'react';
import * as z from 'zod';
import {AsyncCombobox} from '@/core/forms/AsyncCombobox';
import {useStructureOptions} from '@/core/modules/hooks/useStructureOptions';
import {StructureDisplay} from '@/core/smart/display/StructureDisplay';
import {StructureViewer} from '@/core/smart/display/StructureViewer';
import {cn} from '@/core/util/utils';
import {BlokPropSchemas, createBlokComponent, useBlok, useEventAction, useValue} from '../../runtime';
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

export const StructurePickerBlok = createBlokComponent(
  {
    name: 'StructurePicker',
    schema: z
      .object({
        identifier: z
          .string()
          .describe('The kind of structure to pick, e.g. "@mikro/arraydataset".'),
        bind: bindSchema,
        value: structureValueSchema.describe('Controlled value, a structure reference.'),
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
        'A search-backed picker for one structure of a given identifier. Writes {"object", "__identifier"}, or null when cleared.',
      ),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const identifier = useValue(blok.identifier);
    const bind = useValue(blok.bind);
    const value = useValue(blok.value);
    const placeholder = useValue(blok.placeholder);
    const disabled = useValue(blok.disabled);
    const className = useValue(blok.className);
    const onChange = useEventAction(blok.onChange);

    const search = useStructureOptions(identifier ?? '');
    const controlled = useControlledValue<StructureValue | null>({
      bind,
      // `undefined` leaves the control to its binding; `null` is a held value.
      value: value === undefined ? undefined : asStructure(value),
      defaultValue: undefined,
      fallback: null,
      parse: asStructure,
    });

    if (!identifier || !search) {
      return <Notice className={className}>No picker available for {identifier ?? 'this structure'}.</Notice>;
    }

    return (
      <AsyncCombobox
        value={controlled.value?.object}
        search={search}
        placeholder={placeholder}
        disabled={disabled === true}
        className={className}
        resolveSelectedLabel
        onChange={id => {
          // `null`, never `undefined`: an argument reading this path must see
          // "nothing selected", not fall back to its literal.
          const next = id ? {object: id, __identifier: identifier} : null;
          controlled.setValue(next);
          onChange?.(next);
        }}
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

// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {defaultBlokCatalog} from '../catalog';
import {describeBlokCatalog, isActionSchema} from '../runtime';
import {zodToCatalogKind} from '@/rekuest/catalog/uiCatalogInput';
import {CatalogValueKind} from '@/rekuest/api/graphql';

/**
 * Invariants of the published catalog. These are what make the registered
 * server copy usable for authoring: a name that is stable, a description on
 * every component and prop, and action props that are still recognisable as
 * actions after `.describe()` cloned their schema.
 */

const components = [...defaultBlokCatalog.components.values()];

describe('the blok catalog', () => {
  it('registers every component under a unique name', () => {
    const names = components.map(component => component.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('describes every component', () => {
    const undescribed = components
      .filter(component => !component.schema.description)
      .map(component => component.name);

    expect(undescribed).toEqual([]);
  });

  it('describes every prop', () => {
    const undescribed = components.flatMap(component =>
      Object.entries(component.schema.shape as Record<string, z.ZodTypeAny>)
        .filter(([, schema]) => !schema.description)
        .map(([key]) => `${component.name}.${key}`),
    );

    expect(undescribed).toEqual([]);
  });

  /**
   * `.describe()` clones a zod schema, and the action brand lives in a WeakSet
   * keyed by the schema object — so describing a branded schema directly would
   * quietly demote a handler to a value prop. Every action prop goes through
   * `actionProp`, which describes the `.optional()` wrapper instead; this is
   * the test that keeps that true.
   */
  it('keeps handler props recognisable as actions', () => {
    const handlerKeys = /^(on[A-Z]|action$)/;
    const demoted = components.flatMap(component =>
      Object.entries(component.schema.shape as Record<string, z.ZodTypeAny>)
        .filter(([key, schema]) => handlerKeys.test(key) && !isActionSchema(schema))
        .map(([key]) => `${component.name}.${key}`),
    );

    expect(demoted).toEqual([]);
  });

  it('publishes handler props as callbacks', () => {
    const buttonSchema = defaultBlokCatalog.components.get('Button')?.schema.shape as Record<
      string,
      z.ZodTypeAny
    >;

    expect(zodToCatalogKind(buttonSchema.onClick)).toBe(CatalogValueKind.Callback);
  });

  it('offers the HTML and shadcn families a payload can rely on', () => {
    const manifest = describeBlokCatalog(defaultBlokCatalog);
    const names = new Set(manifest.components.map(component => component.name));

    // A rename or an accidental drop of one of these breaks stored payloads,
    // so the list is spelled out rather than counted.
    for (const name of [
      // control flow and layout
      'foreach',
      'if',
      'Fragment',
      'Flex',
      'Grid',
      'ScrollArea',
      'Separator',
      // html
      'div',
      'span',
      'p',
      'a',
      'img',
      'ul',
      'li',
      'table',
      'section',
      'h1',
      'h6',
      // forms
      'Button',
      'Input',
      'Textarea',
      'Checkbox',
      'Switch',
      'Slider',
      'Select',
      'SelectItem',
      'RadioGroup',
      'ToggleGroup',
      'Field',
      'Calendar',
      // overlays and navigation
      'Dialog',
      'DialogContent',
      'Sheet',
      'Popover',
      'Tooltip',
      'DropdownMenu',
      'ContextMenu',
      'Tabs',
      'TabsTrigger',
      'Accordion',
      'Collapsible',
      'Breadcrumb',
      'Pagination',
      'Menubar',
      // feedback and data
      'Alert',
      'Badge',
      'Progress',
      'Skeleton',
      'Spinner',
      'Empty',
      'Card',
      'Table',
      'TableCell',
      'Avatar',
      'Item',
      'Carousel',
      'Chart',
      'Icon',
    ]) {
      expect(names, `catalog is missing "${name}"`).toContain(name);
    }
  });
});

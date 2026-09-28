import * as z from 'zod';
import {BlokPropSchemas} from '../../runtime';

/**
 * The prop-schema vocabulary every blok in the catalog is built from.
 *
 * Two rules hold across this file:
 *
 * 1. **Everything carries `.describe()`.** `componentInput` in
 *    `rekuest/catalog/uiCatalogInput.ts` publishes `schema.description` for the
 *    component and every prop, so these strings are the authoring
 *    documentation the server hands back to whoever writes a blok payload.
 * 2. **Action props go through `actionProp`.** `.describe()` *clones* a zod
 *    schema, and the action brand lives in a `WeakSet` keyed by the schema
 *    object (`runtime/schemas.ts`), so describing a branded schema directly
 *    would silently turn a click handler back into a value prop. `actionProp`
 *    describes the `.optional()` wrapper instead, which keeps the brand
 *    reachable through `unwrapSchema`.
 */

/** A click/change handler. Always build action props with this. */
export const actionProp = (description: string) =>
  BlokPropSchemas.Action.optional().describe(description);

export const describedString = (description: string) =>
  z.string().optional().describe(description);

export const sizeSchema = z
  .string()
  .optional()
  .describe('CSS length, e.g. "12rem" or "100%".');

export const spacingSchema = z
  .string()
  .optional()
  .describe('CSS spacing value, e.g. "0.5rem".');

export const boolSchema = z.boolean().optional();
export const numberSchema = z.number().optional();

export const classNameSchema = z
  .string()
  .optional()
  .describe('Extra Tailwind classes appended to the element.');

export const flexDirectionSchema = z
  .enum(['row', 'column'])
  .optional()
  .describe('Main axis direction.');

export const justifySchema = z
  .enum(['start', 'center', 'end', 'between', 'around', 'evenly'])
  .optional()
  .describe('Distribution along the main axis.');

export const alignSchema = z
  .enum(['start', 'center', 'end', 'stretch', 'baseline'])
  .optional()
  .describe('Alignment across the cross axis.');

export const overflowSchema = z
  .enum(['visible', 'hidden', 'auto', 'scroll'])
  .optional()
  .describe('Overflow behaviour.');

export const textToneSchema = z
  .enum(['default', 'muted', 'destructive', 'success'])
  .optional()
  .describe('Semantic text colour.');

export const textSizeSchema = z
  .enum(['xs', 'sm', 'base', 'lg'])
  .optional()
  .describe('Text size step.');

export const textWeightSchema = z
  .enum(['regular', 'medium', 'semibold', 'bold'])
  .optional()
  .describe('Font weight.');

export const textAlignSchema = z
  .enum(['start', 'center', 'end'])
  .optional()
  .describe('Horizontal text alignment.');

export const headingLevelSchema = z
  .enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
  .optional()
  .describe('Heading level, which also sets the type scale.');

export const badgeVariantSchema = z
  .enum(['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'])
  .optional()
  .describe('Badge appearance.');

export const buttonVariantSchema = z
  .enum([
    'default',
    'outline',
    'secondary',
    'ghost',
    'destructive',
    'link',
    'primary',
    'borderless',
  ])
  .optional()
  .describe('Button appearance. "primary" maps to default, "borderless" to ghost.');

export const buttonSizeSchema = z
  .enum(['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'])
  .optional()
  .describe('Button size.');

export const orientationSchema = z
  .enum(['horizontal', 'vertical'])
  .optional()
  .describe('Orientation.');

export const sideSchema = z
  .enum(['top', 'right', 'bottom', 'left'])
  .optional()
  .describe('Which edge the surface is anchored to.');

export const alignmentSchema = z
  .enum(['start', 'center', 'end'])
  .optional()
  .describe('Alignment of the surface against its trigger.');

export const childDescriptorSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    basePath: z.string().optional(),
  }),
]);

export const childListSchema = z
  .array(childDescriptorSchema)
  .optional()
  .describe('Ids of child components to render here.');

/** Text, a single child id, or a list of child ids — used by inline elements. */
export const contentSchema = z
  .union([
    BlokPropSchemas.DynamicString,
    childDescriptorSchema,
    z.array(childDescriptorSchema),
  ])
  .optional()
  .describe('Inline text, a child component id, or a list of child ids.');

export const childSchema = BlokPropSchemas.ComponentId.optional().describe(
  'Id of a single child component to render here.',
);

export const bindSchema = z
  .string()
  .optional()
  .describe('Data-model path this control reads from and writes back to.');

export const disabledSchema = BlokPropSchemas.DynamicBoolean.optional().describe(
  'Disables the control.',
);

export const checksSchema = BlokPropSchemas.Checks.describe(
  'Guards that must all pass before the control is enabled.',
);

/** Layout props shared by every box-like blok. */
export const layoutFields = {
  gap: spacingSchema,
  padding: spacingSchema,
  margin: spacingSchema,
  width: sizeSchema,
  minWidth: sizeSchema,
  maxWidth: sizeSchema,
  height: sizeSchema,
  minHeight: sizeSchema,
  maxHeight: sizeSchema,
  background: BlokPropSchemas.DynamicString.optional().describe('CSS background value.'),
  color: BlokPropSchemas.DynamicString.optional().describe('CSS text colour.'),
  borderColor: BlokPropSchemas.DynamicString.optional().describe('CSS border colour.'),
  radius: sizeSchema.describe('CSS border radius.'),
  overflow: overflowSchema,
  grow: numberSchema.describe('flex-grow.'),
  shrink: numberSchema.describe('flex-shrink.'),
};

/** Presentation props shared by every text-bearing blok. */
export const textFields = {
  tone: textToneSchema,
  size: textSizeSchema,
  weight: textWeightSchema,
  align: textAlignSchema,
  mono: boolSchema.describe('Render in the monospace face.'),
  italic: boolSchema.describe('Render italic.'),
  truncate: boolSchema.describe('Truncate to a single line with an ellipsis.'),
};

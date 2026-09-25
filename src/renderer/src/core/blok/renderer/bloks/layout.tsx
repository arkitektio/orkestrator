import {AspectRatio as ShadAspectRatio} from '@/core/components/ui/aspect-ratio';
import {ScrollArea as ShadScrollArea} from '@/core/components/ui/scroll-area';
import {
  ResizableHandle as ShadResizableHandle,
  ResizablePanel as ShadResizablePanel,
  ResizablePanelGroup as ShadResizablePanelGroup,
} from '@/core/components/ui/resizable';
import {Separator as ShadSeparator} from '@/core/components/ui/separator';
import {cn} from '@/core/lib/utils';
import * as z from 'zod';
import {createBlokComponent, useBlok, useValue} from '../runtime';
import {
  boolSchema,
  buildLayoutStyle,
  childListSchema,
  classNameSchema,
  contentSchema,
  flexDirectionSchema,
  justifySchema,
  alignSchema,
  layoutFields,
  mapAlign,
  mapJustify,
  numberSchema,
  orientationSchema,
  renderChildList,
  renderContent,
  sizeSchema,
  spacingSchema,
  useBaseLayoutProps,
} from './shared';

/**
 * Box and structural bloks.
 *
 * Naming across the catalog: a raw HTML blok is registered under its exact
 * lowercase tag name (`div`, `section`, `table`), a shadcn blok under its
 * PascalCase component name (`Card`, `Table`). The catalog map is
 * case-sensitive, so both can coexist; the PascalCase one is always the styled
 * shadcn component.
 */

const flexSchema = z
  .object({
    children: childListSchema,
    direction: flexDirectionSchema,
    wrap: boolSchema.describe('Allow children to wrap onto multiple lines.'),
    justify: justifySchema,
    align: alignSchema,
    bordered: boolSchema.describe('Draw a border around the box.'),
    ...layoutFields,
  })
  .describe('A flexbox container.');

/**
 * `Flex`, `Row` and `Column` are the same component over the same schema; the
 * only difference is whether the direction is author-controlled or fixed.
 */
const createFlexComponent = (name: string, description: string, fixedDirection?: 'row' | 'column') =>
  createBlokComponent(
    {
      name,
      schema: flexSchema.describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const layoutProps = useBaseLayoutProps(blok);
      const children = useValue(blok.children);
      const direction = useValue(blok.direction);
      const wrap = useValue(blok.wrap);
      const justify = useValue(blok.justify);
      const align = useValue(blok.align);
      const bordered = useValue(blok.bordered);

      const resolvedDirection = fixedDirection ?? (direction === 'column' ? 'column' : 'row');

      return (
        <div
          className={cn(
            'flex min-w-0',
            resolvedDirection === 'column' ? 'flex-col' : 'flex-row',
            wrap && 'flex-wrap',
            mapJustify(justify),
            mapAlign(align),
            bordered && 'border border-border/70',
          )}
          style={buildLayoutStyle(layoutProps)}
        >
          {renderChildList(children, buildChild)}
        </div>
      );
    },
  );

export const Flex = createFlexComponent('Flex', 'A flexbox container with an author-set direction.');
export const Row = createFlexComponent('Row', 'A horizontal flexbox container.', 'row');
export const Column = createFlexComponent('Column', 'A vertical flexbox container.', 'column');

export const Grid = createBlokComponent(
  {
    name: 'Grid',
    schema: z
      .object({
        children: childListSchema,
        columns: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('Fixed column count. Omit to auto-fit on minColumnWidth.'),
        minColumnWidth: sizeSchema.describe('Minimum column width when auto-fitting.'),
        bordered: boolSchema.describe('Draw a border around the grid.'),
        ...layoutFields,
      })
      .describe('A CSS grid container.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const columns = useValue(blok.columns);
    const minColumnWidth = useValue(blok.minColumnWidth);
    const bordered = useValue(blok.bordered);

    const gridTemplateColumns = columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : `repeat(auto-fit, minmax(${minColumnWidth ?? '16rem'}, 1fr))`;

    return (
      <div
        className={cn('grid min-w-0', bordered && 'border border-border/70')}
        style={{...buildLayoutStyle(layoutProps), gridTemplateColumns}}
      >
        {renderChildList(children, buildChild)}
      </div>
    );
  },
);

export const Div = createBlokComponent(
  {
    name: 'div',
    schema: z
      .object({
        children: contentSchema,
        className: classNameSchema,
        ...layoutFields,
      })
      .describe('A plain block container.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <div className={cn('min-w-0', className)} style={buildLayoutStyle(layoutProps)}>
        {renderContent(children, buildChild)}
      </div>
    );
  },
);

export const Spacer = createBlokComponent(
  {
    name: 'Spacer',
    schema: z
      .object({
        size: sizeSchema.describe('Fixed size along the parent axis.'),
        grow: numberSchema.describe('flex-grow; defaults to 1 when no size is given.'),
      })
      .describe('Flexible empty space between siblings.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const size = useValue(blok.size);
    const grow = useValue(blok.grow);

    return (
      <div
        aria-hidden
        style={{flexBasis: size, flexGrow: grow ?? (size ? 0 : 1), flexShrink: 0}}
      />
    );
  },
);

export const Separator = createBlokComponent(
  {
    name: 'Separator',
    schema: z
      .object({
        orientation: orientationSchema,
        className: classNameSchema,
      })
      .describe('A dividing line between sections.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const orientation = useValue(blok.orientation);
    const className = useValue(blok.className);

    return <ShadSeparator orientation={orientation ?? 'horizontal'} className={className} />;
  },
);

export const AspectRatio = createBlokComponent(
  {
    name: 'AspectRatio',
    schema: z
      .object({
        children: childListSchema,
        ratio: z.number().positive().optional().describe('Width divided by height, e.g. 1.777.'),
        className: classNameSchema,
      })
      .describe('Constrains its content to a fixed aspect ratio.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const ratio = useValue(blok.ratio);
    const className = useValue(blok.className);

    return (
      <ShadAspectRatio ratio={ratio ?? 16 / 9} className={className}>
        {renderChildList(children, buildChild)}
      </ShadAspectRatio>
    );
  },
);

export const ScrollArea = createBlokComponent(
  {
    name: 'ScrollArea',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        gap: spacingSchema,
        height: sizeSchema,
        maxHeight: sizeSchema,
      })
      .describe('A scrollable region with styled scrollbars.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const gap = useValue(blok.gap);
    const height = useValue(blok.height);
    const maxHeight = useValue(blok.maxHeight);

    return (
      <ShadScrollArea className={className} style={{height, maxHeight}}>
        <div className="flex min-w-0 flex-col" style={{gap}}>
          {renderChildList(children, buildChild)}
        </div>
      </ShadScrollArea>
    );
  },
);

export const Resizable = createBlokComponent(
  {
    name: 'Resizable',
    schema: z
      .object({
        children: childListSchema.describe('ResizablePanel and ResizableHandle children.'),
        direction: flexDirectionSchema.describe('"row" splits left/right, "column" top/bottom.'),
        className: classNameSchema,
      })
      .describe('A group of user-resizable panels.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const direction = useValue(blok.direction);
    const className = useValue(blok.className);

    return (
      <ShadResizablePanelGroup
        direction={direction === 'column' ? 'vertical' : 'horizontal'}
        className={className}
      >
        {renderChildList(children, buildChild)}
      </ShadResizablePanelGroup>
    );
  },
);

export const ResizablePanel = createBlokComponent(
  {
    name: 'ResizablePanel',
    schema: z
      .object({
        children: childListSchema,
        defaultSize: numberSchema.describe('Initial size as a percentage of the group.'),
        minSize: numberSchema.describe('Minimum size percentage.'),
        maxSize: numberSchema.describe('Maximum size percentage.'),
        className: classNameSchema,
      })
      .describe('One panel inside a Resizable group.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const defaultSize = useValue(blok.defaultSize);
    const minSize = useValue(blok.minSize);
    const maxSize = useValue(blok.maxSize);
    const className = useValue(blok.className);

    return (
      <ShadResizablePanel
        defaultSize={defaultSize}
        minSize={minSize}
        maxSize={maxSize}
        className={className}
      >
        {renderChildList(children, buildChild)}
      </ShadResizablePanel>
    );
  },
);

export const ResizableHandle = createBlokComponent(
  {
    name: 'ResizableHandle',
    schema: z
      .object({
        withHandle: boolSchema.describe('Show the grab affordance.'),
        className: classNameSchema,
      })
      .describe('The drag handle between two ResizablePanels.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const withHandle = useValue(blok.withHandle);
    const className = useValue(blok.className);

    return <ShadResizableHandle withHandle={withHandle} className={className} />;
  },
);

export const layoutBlokComponents = [
  Flex,
  Row,
  Column,
  Grid,
  Div,
  Spacer,
  Separator,
  AspectRatio,
  ScrollArea,
  Resizable,
  ResizablePanel,
  ResizableHandle,
];

import {AspectRatio as ShadAspectRatio} from '@/core/ui/aspect-ratio';
import {ScrollArea as ShadScrollArea} from '@/core/ui/scroll-area';
import {
  ResizableHandle as ShadResizableHandle,
  ResizablePanel as ShadResizablePanel,
  ResizablePanelGroup as ShadResizablePanelGroup,
} from '@/core/ui/resizable';
import {Separator as ShadSeparator} from '@/core/ui/separator';
import {
  BentoGrid as ShadBentoGrid,
  BentoItem as ShadBentoItem,
  type BentoItemProps as ShadBentoItemProps,
} from '@/core/ui/bento-grid';
import {cn} from '@/core/util/utils';
import * as z from 'zod';
import {
  createBlokComponent,
  useBlok,
  useBlokTree,
  useValue,
  type BlokComponentNode,
} from '../runtime';
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

/**
 * A per-breakpoint value: `{base: 2, md: 4}`, mobile first, measured on the
 * grid's own width (sm 640, md 768, lg 1024, xl 1280, 2xl 1536).
 */
const responsive = <T extends z.ZodTypeAny>(value: T) =>
  z.union([
    value,
    z
      .object({
        base: value.optional(),
        sm: value.optional(),
        md: value.optional(),
        lg: value.optional(),
        xl: value.optional(),
        '2xl': value.optional(),
      })
      .strict(),
  ]);

const bentoSpanSchema = z.union([
  z.number().int().min(1),
  z.object({
    min: z.number().int().min(1).optional(),
    ideal: z.union([z.number(), z.templateLiteral([z.number(), '%'])]),
    max: z.number().int().min(1).optional(),
  }),
]);

/**
 * The layout props a `BentoItem` hands its parent. The grid solves the layout
 * from them before any item renders, so it reads them off the payload: they
 * must be static literals.
 */
const bentoItemLayoutFields = {
  cols: responsive(bentoSpanSchema)
    .optional()
    .describe(
      'Column span: 2, {"min":1,"ideal":2,"max":3}, {"ideal":"50%"}, or one per breakpoint ({"base":1,"md":2}). Static; read by the parent BentoGrid. Defaults to 1.',
    ),
  rows: responsive(bentoSpanSchema)
    .optional()
    .describe('Row span, same forms as cols. Static; read by the parent BentoGrid. Defaults to 1.'),
  priority: responsive(z.number().min(0))
    .optional()
    .describe(
      'How strongly the item holds its ideal size: 1 normal, 2-3 key tiles, 0.5 fillers that flex first, 0 takes whatever closes the layout. Static.',
    ),
  show: responsive(z.boolean())
    .optional()
    .describe('false leaves the item out, optionally per breakpoint. Static.'),
};

type BentoItemLayout = Pick<ShadBentoItemProps, 'cols' | 'rows' | 'priority' | 'show'>;

const bentoItemLayoutSchema = z.object(bentoItemLayoutFields);

export const BentoGrid = createBlokComponent(
  {
    name: 'BentoGrid',
    schema: z
      .object({
        children: childListSchema.describe(
          'BentoItem children (their cols/rows/priority/show place them). Any other child, a foreach included, is one 1x1 tile.',
        ),
        columns: responsive(z.number().int().min(1))
          .optional()
          .describe('Column count, optionally per breakpoint: {"base":2,"md":4,"lg":6}. Defaults to 4.'),
        rowHeight: responsive(z.union([z.number(), z.string()]))
          .optional()
          .describe('Row height in px or a CSS length, optionally per breakpoint. Defaults to "10rem".'),
        holeCost: numberSchema.describe('Cost per empty cell inside the layout. Default 10.'),
        raggedCost: numberSchema.describe('Cost per empty cell along the bottom edge. Defaults to holeCost.'),
        animate: boolSchema.describe('Animate items entering, leaving and moving. Default true.'),
        appear: boolSchema.describe('Also animate the items present on first render.'),
        className: classNameSchema,
        ...layoutFields,
      })
      .describe(
        'A bento grid: tiles in order, each sized as close to its preferred span as the columns allow, packed without holes.',
      ),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const columns = useValue(blok.columns);
    const rowHeight = useValue(blok.rowHeight);
    const holeCost = useValue(blok.holeCost);
    const raggedCost = useValue(blok.raggedCost);
    const animate = useValue(blok.animate);
    const appear = useValue(blok.appear);
    const className = useValue(blok.className);
    const {nodes} = useBlokTree();

    const seen = new Set<string>();
    const items = (Array.isArray(children) ? children : []).map(child => {
      const id = typeof child === 'string' ? child : child.id;
      const basePath = typeof child === 'string' ? undefined : child.basePath;
      const key = seen.has(id) ? `${id}:${seen.size}` : id;
      seen.add(key);
      const node = nodes.get(id)?.node;
      return (
        <ShadBentoItem key={key} {...(node?.component === 'BentoItem' ? staticBentoLayout(node.props) : {})}>
          {buildChild(id, basePath)}
        </ShadBentoItem>
      );
    });

    return (
      <ShadBentoGrid
        columns={columns ?? 4}
        rowHeight={rowHeight}
        holeCost={holeCost}
        raggedCost={raggedCost}
        animate={animate}
        appear={appear}
        className={className}
        style={buildLayoutStyle(layoutProps)}
      >
        {items}
      </ShadBentoGrid>
    );
  },
);

/** A BentoItem's layout props, from their static values; a bad or dynamic one is left at the default. */
const staticBentoLayout = (props: BlokComponentNode['props']): BentoItemLayout => {
  const out: Record<string, unknown> = {};
  for (const prop of props ?? []) {
    const field = bentoItemLayoutSchema.shape[prop.key as keyof typeof bentoItemLayoutFields];
    if (!field || prop.static_value === undefined) continue;
    const parsed = field.safeParse(prop.static_value);
    if (parsed.success) out[prop.key] = parsed.data;
  }
  return out as BentoItemLayout;
};

export const BentoItem = createBlokComponent(
  {
    name: 'BentoItem',
    placement: {downstreamOf: ['BentoGrid']},
    schema: z
      .object({
        children: childListSchema,
        ...bentoItemLayoutFields,
        className: classNameSchema,
        ...layoutFields,
      })
      .describe('One tile of a BentoGrid; fills the cells the grid gives it.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <div
        className={cn('flex h-full min-h-0 w-full min-w-0 flex-col', className)}
        style={buildLayoutStyle(layoutProps)}
      >
        {renderChildList(children, buildChild)}
      </div>
    );
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
  BentoGrid,
  BentoItem,
];

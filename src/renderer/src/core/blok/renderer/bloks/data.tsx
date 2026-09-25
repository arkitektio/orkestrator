import * as React from 'react';
import {
  Avatar as ShadAvatar,
  AvatarFallback as ShadAvatarFallback,
  AvatarImage as ShadAvatarImage,
} from '@/core/ui/avatar';
import {
  Card as ShadCard,
  CardContent as ShadCardContent,
  CardDescription as ShadCardDescription,
  CardFooter as ShadCardFooter,
  CardHeader as ShadCardHeader,
  CardTitle as ShadCardTitle,
} from '@/core/ui/card';
import {
  Carousel as ShadCarousel,
  CarouselContent as ShadCarouselContent,
  CarouselItem as ShadCarouselItem,
  CarouselNext as ShadCarouselNext,
  CarouselPrevious as ShadCarouselPrevious,
} from '@/core/ui/carousel';
import {
  ChartContainer as ShadChartContainer,
  ChartLegend as ShadChartLegend,
  ChartLegendContent as ShadChartLegendContent,
  ChartTooltip as ShadChartTooltip,
  ChartTooltipContent as ShadChartTooltipContent,
  type ChartConfig,
} from '@/core/ui/chart';
import {
  Item as ShadItem,
  ItemActions as ShadItemActions,
  ItemContent as ShadItemContent,
  ItemDescription as ShadItemDescription,
  ItemGroup as ShadItemGroup,
  ItemMedia as ShadItemMedia,
  ItemTitle as ShadItemTitle,
} from '@/core/ui/item';
import {
  Table as ShadTable,
  TableBody as ShadTableBody,
  TableCaption as ShadTableCaption,
  TableCell as ShadTableCell,
  TableFooter as ShadTableFooter,
  TableHead as ShadTableHead,
  TableHeader as ShadTableHeader,
  TableRow as ShadTableRow,
} from '@/core/ui/table';
import {cn} from '@/core/util/utils';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import * as z from 'zod';
import {BlokPropSchemas, createBlokComponent, useAction, useBlok, useValue} from '../runtime';
import {iconNameSchema, renderIcon} from './icons';
import {
  actionProp,
  boolSchema,
  buildLayoutStyle,
  childListSchema,
  childSchema,
  classNameSchema,
  contentSchema,
  justifySchema,
  alignSchema,
  layoutFields,
  mapAlign,
  mapJustify,
  mapTextAlign,
  numberSchema,
  renderChildList,
  renderContent,
  spacingSchema,
  textAlignSchema,
  useBaseLayoutProps,
} from './shared';

/** Content containers, tables, media and charts. */

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export const Card = createBlokComponent(
  {
    name: 'Card',
    schema: z
      .object({
        child: childSchema,
        children: childListSchema,
        size: z.enum(['default', 'sm']).optional().describe('Card density.'),
        className: classNameSchema,
        padding: spacingSchema,
        width: layoutFields.width,
        minHeight: layoutFields.minHeight,
        height: layoutFields.height,
        background: layoutFields.background,
        borderColor: layoutFields.borderColor,
        radius: layoutFields.radius,
      })
      .describe('A bordered surface grouping related content.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const child = useValue(blok.child);
    const children = useValue(blok.children);
    const size = useValue(blok.size);
    const className = useValue(blok.className);

    return (
      <ShadCard
        size={size ?? 'default'}
        style={buildLayoutStyle(layoutProps)}
        className={cn('min-w-0', className)}
      >
        {child ? buildChild(child) : null}
        {renderChildList(children, buildChild)}
      </ShadCard>
    );
  },
);

export const CardHeader = createBlokComponent(
  {
    name: 'CardHeader',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The header region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCardHeader className={className} style={buildLayoutStyle(layoutProps)}>
        {renderChildList(children, buildChild)}
      </ShadCardHeader>
    );
  },
);

/** `CardTitle` and `CardDescription` differ only in the element they render. */
const createCardTextBlok = (
  name: string,
  Part: typeof ShadCardTitle | typeof ShadCardDescription,
  description: string,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
          children: contentSchema,
          className: classNameSchema,
          align: textAlignSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const align = useValue(blok.align);

      return (
        <Part className={cn(mapTextAlign(align), className)}>
          {renderContent(children ?? text, buildChild)}
        </Part>
      );
    },
  );

export const CardTitle = createCardTextBlok('CardTitle', ShadCardTitle, 'The title of a Card.');
export const CardDescription = createCardTextBlok(
  'CardDescription',
  ShadCardDescription,
  'Supporting text under a CardTitle.',
);

export const CardContent = createBlokComponent(
  {
    name: 'CardContent',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        padding: spacingSchema,
        gap: spacingSchema,
      })
      .describe('The body region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const gap = useValue(blok.gap);

    return (
      <ShadCardContent className={className} style={buildLayoutStyle(layoutProps)}>
        <div className="flex min-w-0 flex-col" style={{gap}}>
          {renderChildList(children, buildChild)}
        </div>
      </ShadCardContent>
    );
  },
);

export const CardFooter = createBlokComponent(
  {
    name: 'CardFooter',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
        justify: justifySchema,
        align: alignSchema,
        gap: spacingSchema,
        padding: spacingSchema,
      })
      .describe('The footer region of a Card.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const layoutProps = useBaseLayoutProps(blok);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const justify = useValue(blok.justify);
    const align = useValue(blok.align);

    return (
      <ShadCardFooter
        className={cn(mapJustify(justify), mapAlign(align), className)}
        style={buildLayoutStyle(layoutProps)}
      >
        {renderChildList(children, buildChild)}
      </ShadCardFooter>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

type TablePartComponent = React.ComponentType<{
  className?: string;
  children?: React.ReactNode;
}>;

const createTablePartBlok = (name: string, Part: TablePartComponent, description: string) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          children: childListSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const children = useValue(blok.children);
      const className = useValue(blok.className);

      return <Part className={className}>{renderChildList(children, buildChild)}</Part>;
    },
  );

export const Table = createBlokComponent(
  {
    name: 'Table',
    schema: z
      .object({
        children: childListSchema.describe('TableHeader, TableBody and TableFooter children.'),
        caption: BlokPropSchemas.DynamicString.optional().describe('Caption below the table.'),
        className: classNameSchema,
      })
      .describe('A styled data table. Use the lowercase table element for a plain one.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const caption = useValue(blok.caption);
    const className = useValue(blok.className);

    return (
      <ShadTable className={className}>
        {caption ? <ShadTableCaption>{caption}</ShadTableCaption> : null}
        {renderChildList(children, buildChild)}
      </ShadTable>
    );
  },
);

export const TableHeader = createTablePartBlok(
  'TableHeader',
  ShadTableHeader,
  'The header row group of a Table.',
);
export const TableBody = createTablePartBlok(
  'TableBody',
  ShadTableBody,
  'The body row group of a Table.',
);
export const TableFooter = createTablePartBlok(
  'TableFooter',
  ShadTableFooter,
  'The footer row group of a Table.',
);

export const TableRow = createBlokComponent(
  {
    name: 'TableRow',
    schema: z
      .object({
        children: childListSchema.describe('TableHead or TableCell children.'),
        onClick: actionProp('Runs when the row is clicked.'),
        className: classNameSchema,
      })
      .describe('One row of a Table.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadTableRow
        onClick={onClick}
        className={cn(onClick && 'cursor-pointer', className)}
      >
        {renderChildList(children, buildChild)}
      </ShadTableRow>
    );
  },
);

/** `TableHead` and `TableCell` share one shape over two elements. */
const createTableCellBlok = (
  name: string,
  Part: typeof ShadTableHead | typeof ShadTableCell,
  description: string,
) =>
  createBlokComponent(
    {
      name,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('Cell text.'),
          children: contentSchema,
          align: textAlignSchema,
          className: classNameSchema,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const align = useValue(blok.align);
      const className = useValue(blok.className);

      return (
        <Part className={cn(mapTextAlign(align), className)}>
          {renderContent(children ?? text, buildChild)}
        </Part>
      );
    },
  );

export const TableHead = createTableCellBlok(
  'TableHead',
  ShadTableHead,
  'A header cell of a Table.',
);
export const TableCell = createTableCellBlok('TableCell', ShadTableCell, 'A cell of a Table.');

/* -------------------------------------------------------------------------- */
/* Avatar and Item                                                            */
/* -------------------------------------------------------------------------- */

export const Avatar = createBlokComponent(
  {
    name: 'Avatar',
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe('Image URL.'),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        fallback: BlokPropSchemas.DynamicString.optional().describe(
          'Initials shown while the image is missing.',
        ),
        size: z.enum(['default', 'sm', 'lg']).optional().describe('Avatar size.'),
        className: classNameSchema,
      })
      .describe('A user or entity avatar.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const src = useValue(blok.src);
    const alt = useValue(blok.alt);
    const fallback = useValue(blok.fallback);
    const size = useValue(blok.size);
    const className = useValue(blok.className);

    return (
      <ShadAvatar size={size ?? 'default'} className={className}>
        {src ? <ShadAvatarImage src={src} alt={alt} /> : null}
        <ShadAvatarFallback>{fallback ?? alt?.slice(0, 2).toUpperCase()}</ShadAvatarFallback>
      </ShadAvatar>
    );
  },
);

export const ItemGroup = createBlokComponent(
  {
    name: 'ItemGroup',
    schema: z
      .object({
        children: childListSchema.describe('Item children.'),
        className: classNameSchema,
      })
      .describe('A vertical list of Items.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadItemGroup className={className}>{renderChildList(children, buildChild)}</ShadItemGroup>
    );
  },
);

export const Item = createBlokComponent(
  {
    name: 'Item',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Item title.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown in the media slot.'),
        children: childListSchema.describe('Controls shown in the actions slot.'),
        variant: z
          .enum(['default', 'outline', 'muted'])
          .optional()
          .describe('Item appearance.'),
        size: z.enum(['default', 'sm']).optional().describe('Item density.'),
        onClick: actionProp('Runs when the item is clicked.'),
        className: classNameSchema,
      })
      .describe('A list row with a title, description and actions.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const size = useValue(blok.size);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);

    return (
      <ShadItem
        variant={variant ?? 'default'}
        size={size ?? 'default'}
        onClick={onClick}
        className={cn(onClick && 'cursor-pointer', className)}
      >
        {icon ? <ShadItemMedia variant="icon">{renderIcon(icon)}</ShadItemMedia> : null}
        <ShadItemContent>
          {title ? <ShadItemTitle>{title}</ShadItemTitle> : null}
          {description ? <ShadItemDescription>{description}</ShadItemDescription> : null}
        </ShadItemContent>
        {children ? (
          <ShadItemActions>{renderChildList(children, buildChild)}</ShadItemActions>
        ) : null}
      </ShadItem>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Carousel                                                                   */
/* -------------------------------------------------------------------------- */

export const Carousel = createBlokComponent(
  {
    name: 'Carousel',
    schema: z
      .object({
        children: childListSchema.describe('CarouselItem children.'),
        orientation: z
          .enum(['horizontal', 'vertical'])
          .optional()
          .describe('Scroll direction.'),
        showControls: boolSchema.describe('Show previous/next buttons. Defaults to true.'),
        className: classNameSchema,
      })
      .describe('A horizontally scrolling set of slides.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const orientation = useValue(blok.orientation);
    const showControls = useValue(blok.showControls);
    const className = useValue(blok.className);

    return (
      <ShadCarousel orientation={orientation ?? 'horizontal'} className={className}>
        <ShadCarouselContent>{renderChildList(children, buildChild)}</ShadCarouselContent>
        {showControls === false ? null : (
          <>
            <ShadCarouselPrevious />
            <ShadCarouselNext />
          </>
        )}
      </ShadCarousel>
    );
  },
);

export const CarouselItem = createBlokComponent(
  {
    name: 'CarouselItem',
    schema: z
      .object({
        children: childListSchema,
        className: classNameSchema,
      })
      .describe('One slide of a Carousel.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadCarouselItem className={className}>
        {renderChildList(children, buildChild)}
      </ShadCarouselItem>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Chart                                                                      */
/* -------------------------------------------------------------------------- */

const CHART_SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const chartSeriesSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

/**
 * The one component in the catalog that is configured by data rather than by
 * subcomponents: recharts series are options, not slots, and a `LineChart`
 * built out of per-series bloks would be a worse authoring experience than the
 * array it is really describing.
 */
export const Chart = createBlokComponent(
  {
    name: 'Chart',
    schema: z
      .object({
        type: z
          .enum(['line', 'bar', 'area', 'pie'])
          .optional()
          .describe('Chart kind. Defaults to "line".'),
        data: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe('One object per point, keyed by category and series key.'),
        categoryKey: z
          .string()
          .optional()
          .describe('Key holding the x-axis (or slice) label. Defaults to "name".'),
        series: z
          .array(chartSeriesSchema)
          .optional()
          .describe('Series to plot: {key, label?, color?} per entry.'),
        stacked: boolSchema.describe('Stack bar or area series.'),
        showGrid: boolSchema.describe('Draw the cartesian grid. Defaults to true.'),
        showLegend: boolSchema.describe('Show the legend.'),
        height: numberSchema.describe('Chart height in pixels.'),
        className: classNameSchema,
      })
      .describe('A line, bar, area or pie chart over tabular data.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const type = useValue(blok.type);
    const data = useValue(blok.data);
    const categoryKey = useValue(blok.categoryKey);
    const series = useValue(blok.series);
    const stacked = useValue(blok.stacked);
    const showGrid = useValue(blok.showGrid);
    const showLegend = useValue(blok.showLegend);
    const height = useValue(blok.height);
    const className = useValue(blok.className);

    const rows = data ?? [];
    const category = categoryKey ?? 'name';
    const resolvedSeries = (series ?? []).map((entry, index) => ({
      ...entry,
      color: entry.color ?? CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length],
    }));

    const config: ChartConfig = Object.fromEntries(
      resolvedSeries.map(entry => [entry.key, {label: entry.label ?? entry.key, color: entry.color}]),
    );

    if (rows.length === 0 || resolvedSeries.length === 0) {
      return null;
    }

    const grid = showGrid === false ? null : <CartesianGrid vertical={false} />;
    const legend = showLegend ? <ShadChartLegend content={<ShadChartLegendContent />} /> : null;
    const tooltip = <ShadChartTooltip content={<ShadChartTooltipContent />} />;
    const axes = (
      <>
        <XAxis dataKey={category} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
      </>
    );

    const body = (() => {
      switch (type) {
        case 'bar':
          return (
            <BarChart data={rows}>
              {grid}
              {axes}
              {tooltip}
              {legend}
              {resolvedSeries.map(entry => (
                <Bar
                  key={entry.key}
                  dataKey={entry.key}
                  fill={entry.color}
                  stackId={stacked ? 'stack' : undefined}
                  radius={4}
                />
              ))}
            </BarChart>
          );
        case 'area':
          return (
            <AreaChart data={rows}>
              {grid}
              {axes}
              {tooltip}
              {legend}
              {resolvedSeries.map(entry => (
                <Area
                  key={entry.key}
                  dataKey={entry.key}
                  stroke={entry.color}
                  fill={entry.color}
                  fillOpacity={0.25}
                  stackId={stacked ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          );
        case 'pie':
          return (
            <PieChart>
              {tooltip}
              {legend}
              <Pie data={rows} dataKey={resolvedSeries[0].key} nameKey={category}>
                {rows.map((_row, index) => (
                  <Cell
                    key={index}
                    fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          );
        case 'line':
        default:
          return (
            <LineChart data={rows}>
              {grid}
              {axes}
              {tooltip}
              {legend}
              {resolvedSeries.map(entry => (
                <Line key={entry.key} dataKey={entry.key} stroke={entry.color} dot={false} />
              ))}
            </LineChart>
          );
      }
    })();

    return (
      <ShadChartContainer config={config} className={className} style={{height}}>
        {body}
      </ShadChartContainer>
    );
  },
);

export const dataBlokComponents = [
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  Avatar,
  ItemGroup,
  Item,
  Carousel,
  CarouselItem,
  Chart,
];

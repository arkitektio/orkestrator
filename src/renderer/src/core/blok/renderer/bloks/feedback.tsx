import {
  Alert as ShadAlert,
  AlertDescription as ShadAlertDescription,
  AlertTitle as ShadAlertTitle,
} from '@/core/components/ui/alert';
import {Badge as ShadBadge} from '@/core/components/ui/badge';
import {
  Empty as ShadEmpty,
  EmptyContent as ShadEmptyContent,
  EmptyDescription as ShadEmptyDescription,
  EmptyHeader as ShadEmptyHeader,
  EmptyMedia as ShadEmptyMedia,
  EmptyTitle as ShadEmptyTitle,
} from '@/core/components/ui/empty';
import {Progress as ShadProgress} from '@/core/components/ui/progress';
import {Skeleton as ShadSkeleton} from '@/core/components/ui/skeleton';
import {Spinner as ShadSpinner} from '@/core/components/ui/spinner';
import * as z from 'zod';
import {BlokPropSchemas, createBlokComponent, useBlok, useValue} from '../runtime';
import {iconNameSchema, renderIcon} from './icons';
import {
  badgeVariantSchema,
  childListSchema,
  classNameSchema,
  contentSchema,
  numberSchema,
  renderChildList,
  renderContent,
  sizeSchema,
} from './shared';

/** Status, progress and empty-state bloks. */

export const Alert = createBlokComponent(
  {
    name: 'Alert',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Alert heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown beside the heading.'),
        children: childListSchema.describe('Extra content below the description.'),
        variant: z
          .enum(['default', 'destructive'])
          .optional()
          .describe('Alert appearance.'),
        className: classNameSchema,
      })
      .describe('A callout that draws attention to a message.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const variant = useValue(blok.variant);
    const className = useValue(blok.className);

    return (
      <ShadAlert variant={variant ?? 'default'} className={className}>
        {renderIcon(icon)}
        {title ? <ShadAlertTitle>{title}</ShadAlertTitle> : null}
        {description ? <ShadAlertDescription>{description}</ShadAlertDescription> : null}
        {renderChildList(children, buildChild)}
      </ShadAlert>
    );
  },
);

export const Badge = createBlokComponent(
  {
    name: 'Badge',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('Badge text.'),
        icon: iconNameSchema.describe('Icon rendered before the text.'),
        children: contentSchema,
        className: classNameSchema,
        variant: badgeVariantSchema,
      })
      .describe('A small status or count label.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);
    const variant = useValue(blok.variant);

    return (
      <ShadBadge variant={variant ?? 'default'} className={className}>
        {renderIcon(icon, 'size-3')}
        {renderContent(children ?? text, buildChild)}
      </ShadBadge>
    );
  },
);

export const Progress = createBlokComponent(
  {
    name: 'Progress',
    schema: z
      .object({
        value: numberSchema.describe('Completion between 0 and max.'),
        max: numberSchema.describe('Maximum value. Defaults to 100.'),
        className: classNameSchema,
      })
      .describe('A determinate progress bar.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const max = useValue(blok.max);
    const className = useValue(blok.className);

    const resolvedMax = max ?? 100;
    const percent = resolvedMax > 0 ? ((value ?? 0) / resolvedMax) * 100 : 0;

    return <ShadProgress value={Math.max(0, Math.min(100, percent))} className={className} />;
  },
);

export const Skeleton = createBlokComponent(
  {
    name: 'Skeleton',
    schema: z
      .object({
        width: sizeSchema,
        height: sizeSchema,
        className: classNameSchema,
      })
      .describe('A placeholder block shown while content loads.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const width = useValue(blok.width);
    const height = useValue(blok.height);
    const className = useValue(blok.className);

    return <ShadSkeleton className={className} style={{width, height}} />;
  },
);

export const Spinner = createBlokComponent(
  {
    name: 'Spinner',
    schema: z
      .object({
        className: classNameSchema,
      })
      .describe('An indeterminate loading indicator.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);

    return <ShadSpinner className={className} />;
  },
);

export const Empty = createBlokComponent(
  {
    name: 'Empty',
    schema: z
      .object({
        title: BlokPropSchemas.DynamicString.optional().describe('Empty-state heading.'),
        description: BlokPropSchemas.DynamicString.optional().describe('Supporting text.'),
        icon: iconNameSchema.describe('Icon shown above the heading.'),
        children: childListSchema.describe('Actions offered in the empty state.'),
        className: classNameSchema,
      })
      .describe('The placeholder shown when there is nothing to list.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const title = useValue(blok.title);
    const description = useValue(blok.description);
    const icon = useValue(blok.icon);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return (
      <ShadEmpty className={className}>
        <ShadEmptyHeader>
          {icon ? <ShadEmptyMedia variant="icon">{renderIcon(icon, 'size-6')}</ShadEmptyMedia> : null}
          {title ? <ShadEmptyTitle>{title}</ShadEmptyTitle> : null}
          {description ? <ShadEmptyDescription>{description}</ShadEmptyDescription> : null}
        </ShadEmptyHeader>
        {children ? (
          <ShadEmptyContent>{renderChildList(children, buildChild)}</ShadEmptyContent>
        ) : null}
      </ShadEmpty>
    );
  },
);

export const feedbackBlokComponents = [Alert, Badge, Progress, Skeleton, Spinner, Empty];

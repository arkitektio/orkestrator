import {Kbd as ShadKbd} from '@/core/ui/kbd';
import {Markdown as ShadMarkdown} from '@/core/ui/markdown';
import {cn} from '@/core/util/utils';
import * as React from 'react';
import * as z from 'zod';
import {dateText, relativeTime} from '../functions/v2';
import {BlokPropSchemas, createBlokComponent, useBlok, useBlokDataAttributes, useBlokRuntime, useValue} from '../runtime';
import {
  classNameSchema,
  contentSchema,
  headingLevelSchema,
  mapTextAlign,
  renderContent,
  textAlignSchema,
  textFields,
  textPresentationClasses,
  useTextPresentationProps,
} from './shared';

/** Text-bearing bloks. See `layout.tsx` for the naming convention. */

/**
 * `Text` and `p`/`span` differ only in the element they render, so they share
 * one factory over one schema.
 */
const textComponentSchema = z
  .object({
    text: BlokPropSchemas.DynamicString.optional().describe('The text to render.'),
    children: contentSchema,
    className: classNameSchema,
    ...textFields,
  })
  .describe('A run of text.');

const createTextComponent = (name: string, element: 'p' | 'span', description: string) =>
  createBlokComponent(
    {
      name,
      schema: textComponentSchema.describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const presentation = useTextPresentationProps(blok);
      const attributes = useBlokDataAttributes();
      const Element = element;

      return (
        <Element {...attributes} className={cn(...textPresentationClasses(presentation), className)}>
          {renderContent(children ?? text, buildChild)}
        </Element>
      );
    },
  );

export const Text = createTextComponent('Text', 'p', 'A paragraph of text.');
export const Paragraph = createTextComponent('p', 'p', 'An HTML paragraph.');
export const Span = createTextComponent('span', 'span', 'An inline run of text.');

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const headingFields = {
  text: BlokPropSchemas.DynamicString.optional().describe('The heading text.'),
  children: contentSchema,
  align: textAlignSchema,
  className: classNameSchema,
};

const headingClassName = (level: HeadingLevel, align?: 'start' | 'center' | 'end') =>
  cn(
    mapTextAlign(align),
    level === 'h1' && 'text-4xl font-extrabold tracking-tight',
    level === 'h2' && 'text-3xl font-bold tracking-tight',
    level === 'h3' && 'text-2xl font-semibold tracking-tight',
    level === 'h4' && 'text-xl font-semibold tracking-tight',
    level === 'h5' && 'text-lg font-semibold',
    level === 'h6' && 'text-base font-semibold uppercase tracking-wide text-muted-foreground',
  );

/**
 * `Heading` takes the level as a prop; `h1`…`h6` are the same renderer with
 * the level fixed, so a payload can use whichever reads better. The fixed ones
 * deliberately do not publish a `level` prop — it would have no effect.
 */
export const Heading = createBlokComponent(
  {
    name: 'Heading',
    schema: z
      .object({...headingFields, level: headingLevelSchema})
      .describe('A section heading at an author-chosen level.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const level = useValue(blok.level);
    const align = useValue(blok.align);
    const className = useValue(blok.className);

    const resolvedLevel = (level ?? 'h3') as HeadingLevel;
    const Element = resolvedLevel;
    const attributes = useBlokDataAttributes();

    return (
      <Element {...attributes} className={cn(headingClassName(resolvedLevel, align), className)}>
        {renderContent(children ?? text, buildChild)}
      </Element>
    );
  },
);

const createFixedHeading = (level: HeadingLevel) =>
  createBlokComponent(
    {
      name: level,
      schema: z.object(headingFields).describe(`An HTML ${level} heading.`),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const align = useValue(blok.align);
      const className = useValue(blok.className);
      const Element = level;

      return (
        <Element className={cn(headingClassName(level, align), className)}>
          {renderContent(children ?? text, buildChild)}
        </Element>
      );
    },
  );

export const H1 = createFixedHeading('h1');
export const H2 = createFixedHeading('h2');
export const H3 = createFixedHeading('h3');
export const H4 = createFixedHeading('h4');
export const H5 = createFixedHeading('h5');
export const H6 = createFixedHeading('h6');

export const Kbd = createBlokComponent(
  {
    name: 'Kbd',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('The key or chord to show.'),
        children: contentSchema,
        className: classNameSchema,
      })
      .describe('A keyboard key or shortcut.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const className = useValue(blok.className);

    return <ShadKbd className={className}>{renderContent(children ?? text, buildChild)}</ShadKbd>;
  },
);

export const Markdown = createBlokComponent(
  {
    name: 'Markdown',
    schema: z
      .object({
        content: BlokPropSchemas.DynamicString.optional().describe('Markdown source to render.'),
        className: classNameSchema,
      })
      .describe('Renders a Markdown document.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const content = useValue(blok.content);
    const className = useValue(blok.className);

    return <ShadMarkdown text={content ?? ''} className={className} />;
  },
);

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

const timeSchema = z
  .object({
    value: z.string().nullish().describe('The moment, an ISO 8601 datetime. Null renders nothing.'),
    relative: BlokPropSchemas.DynamicBoolean.optional().describe(
      'Show the distance to now (live) or to then (travelling) instead of the moment, ticking as it changes.',
    ),
    format: z.string().nullish().describe("How an absolute moment is written, as fmt.datetime's format."),
    className: classNameSchema,
  })
  .describe("A moment, shown absolute (format) or relative ('3 hours ago'). Relative time ticks inside the component.");

/** How long until a relative text can change: every second under a minute, then every half minute. */
const tickFor = (distanceMs: number): number => (Math.abs(distanceMs) < 60_000 ? 1_000 : 30_000);

/**
 * The wall clock, ticking while `active`: the one place a blok's view reads
 * it (the language never does). Measured from `then` while travelling, it
 * does not tick at all.
 */
const useClock = (active: boolean, target: number | null): number => {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        const current = Date.now();
        setNow(current);
        schedule(tickFor(target === null ? 0 : target - current));
      }, delay);
    };
    // Caught up at once (it may have been off while travelling), then on its own beat.
    schedule(0);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [active, target]);
  return now;
};

/**
 * `<Time value relative? format?>` (ui@1): a moment, absolute or relative.
 * Relative time is measured from the viewed moment: the wall clock live
 * (ticking here), `then` while travelling, so the past renders as it did.
 */
export const Time = createBlokComponent(
  {name: 'Time', schema: timeSchema},
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const relative = useValue(blok.relative) === true;
    const format = useValue(blok.format);
    const className = useValue(blok.className);
    const travelAt = useBlokRuntime(state => state.travelAt);
    const attributes = useBlokDataAttributes();
    const moment = typeof value === 'string' ? Date.parse(value) : Number.NaN;
    const known = !Number.isNaN(moment);
    const then = travelAt === null ? Number.NaN : Date.parse(travelAt);
    const live = Number.isNaN(then);
    const now = useClock(relative && known && live, known ? moment : null);
    if (!known || typeof value !== 'string') return null;
    const text = relative ? relativeTime((moment - (live ? now : then)) / 1000, undefined) : dateText(value, format ?? null, undefined, true);
    return (
      <time {...attributes} dateTime={value} title={relative ? dateText(value, null, undefined, true) : undefined} className={cn(className)}>
        {text}
      </time>
    );
  },
);

export const typographyBlokComponents = [
  Text,
  Paragraph,
  Span,
  Heading,
  Kbd,
  Markdown,
  Time,
];

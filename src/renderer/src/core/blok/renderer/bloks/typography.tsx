import {Kbd as ShadKbd} from '@/core/ui/kbd';
import {Markdown as ShadMarkdown} from '@/core/ui/markdown';
import {cn} from '@/core/util/utils';
import * as z from 'zod';
import {BlokPropSchemas, createBlokComponent, useBlok, useValue} from '../runtime';
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
      const Element = element;

      return (
        <Element className={cn(...textPresentationClasses(presentation), className)}>
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

    return (
      <Element className={cn(headingClassName(resolvedLevel, align), className)}>
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

export const typographyBlokComponents = [
  Text,
  Paragraph,
  Span,
  Heading,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Kbd,
  Markdown,
];

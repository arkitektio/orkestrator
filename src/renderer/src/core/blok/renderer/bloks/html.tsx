import {Image as ShadImage} from '@/core/components/ui/image';
import {cn} from '@/core/lib/utils';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useAction,
  useBlok,
  useValue,
} from '../runtime';
import {
  actionProp,
  boolSchema,
  buildLayoutStyle,
  classNameSchema,
  contentSchema,
  layoutFields,
  numberSchema,
  renderContent,
  textFields,
  textPresentationClasses,
  useBaseLayoutProps,
  useTextPresentationProps,
} from './shared';

/**
 * Raw HTML elements, registered under their exact lowercase tag names.
 *
 * These exist so a payload can express ordinary document structure — a list, a
 * link, a definition list, a semantic landmark — without reaching for a styled
 * shadcn component. The styled equivalents live in the other modules under
 * PascalCase names (`Table` vs `table`, `Separator` vs `hr`).
 *
 * `iframe` is deliberately absent: a blok payload is untrusted input from the
 * backend and must not be able to embed an arbitrary origin inside the app.
 */

type SimpleTag =
  | 'strong'
  | 'em'
  | 'small'
  | 'code'
  | 'pre'
  | 'mark'
  | 'sub'
  | 'sup'
  | 'blockquote'
  | 'ul'
  | 'ol'
  | 'li'
  | 'dl'
  | 'dt'
  | 'dd'
  | 'figure'
  | 'figcaption'
  | 'section'
  | 'article'
  | 'header'
  | 'footer'
  | 'main'
  | 'nav'
  | 'aside'
  | 'table'
  | 'thead'
  | 'tbody'
  | 'tfoot'
  | 'tr'
  | 'th'
  | 'td'
  | 'caption';

const DEFAULT_TAG_CLASSES: Partial<Record<SimpleTag, string>> = {
  ul: 'list-disc pl-5',
  ol: 'list-decimal pl-5',
  code: 'rounded bg-muted px-1 py-0.5 font-mono text-xs',
  pre: 'overflow-x-auto rounded bg-muted p-3 font-mono text-xs',
  blockquote: 'border-l-2 border-border pl-3 italic text-muted-foreground',
  mark: 'bg-yellow-200/60 dark:bg-yellow-500/30',
  dt: 'font-medium',
  dd: 'pl-4 text-muted-foreground',
  table: 'w-full border-collapse text-sm',
  th: 'border border-border px-2 py-1 text-left font-medium',
  td: 'border border-border px-2 py-1',
  caption: 'py-1 text-xs text-muted-foreground',
};

/**
 * One factory for every element that is "a tag with content": the props are
 * always text-or-children plus the shared layout and text vocabulary, so each
 * element costs one line of registration.
 */
const createElementBlok = (tag: SimpleTag, description: string) =>
  createBlokComponent(
    {
      name: tag,
      schema: z
        .object({
          text: BlokPropSchemas.DynamicString.optional().describe('Inline text content.'),
          children: contentSchema,
          className: classNameSchema,
          ...textFields,
          ...layoutFields,
        })
        .describe(description),
    },
    ({buildChild, component, schema}) => {
      const blok = useBlok(component, schema);
      const text = useValue(blok.text);
      const children = useValue(blok.children);
      const className = useValue(blok.className);
      const presentation = useTextPresentationProps(blok);
      const layoutProps = useBaseLayoutProps(blok);
      const Element = tag as 'div';

      return (
        <Element
          className={cn(
            DEFAULT_TAG_CLASSES[tag],
            ...textPresentationClasses(presentation),
            className,
          )}
          style={buildLayoutStyle(layoutProps)}
        >
          {renderContent(children ?? text, buildChild)}
        </Element>
      );
    },
  );

const ELEMENTS: ReadonlyArray<[SimpleTag, string]> = [
  ['strong', 'Strongly emphasised text.'],
  ['em', 'Emphasised text.'],
  ['small', 'Small print.'],
  ['code', 'An inline code span.'],
  ['pre', 'Preformatted text.'],
  ['mark', 'Highlighted text.'],
  ['sub', 'Subscript text.'],
  ['sup', 'Superscript text.'],
  ['blockquote', 'A block quotation.'],
  ['ul', 'An unordered list. Children should be li.'],
  ['ol', 'An ordered list. Children should be li.'],
  ['li', 'One list item.'],
  ['dl', 'A description list.'],
  ['dt', 'A description list term.'],
  ['dd', 'A description list definition.'],
  ['figure', 'A figure with optional caption.'],
  ['figcaption', 'A figure caption.'],
  ['section', 'A document section.'],
  ['article', 'A self-contained article.'],
  ['header', 'A header landmark.'],
  ['footer', 'A footer landmark.'],
  ['main', 'The main landmark.'],
  ['nav', 'A navigation landmark.'],
  ['aside', 'An aside landmark.'],
  ['table', 'A plain HTML table. Use Table for the styled shadcn version.'],
  ['thead', 'A table header group.'],
  ['tbody', 'A table body group.'],
  ['tfoot', 'A table footer group.'],
  ['tr', 'A table row.'],
  ['th', 'A table header cell.'],
  ['td', 'A table cell.'],
  ['caption', 'A table caption.'],
];

const elementBloks = ELEMENTS.map(([tag, description]) => createElementBlok(tag, description));

export const Anchor = createBlokComponent(
  {
    name: 'a',
    schema: z
      .object({
        href: BlokPropSchemas.DynamicString.optional().describe('Link target URL.'),
        text: BlokPropSchemas.DynamicString.optional().describe('Link text.'),
        children: contentSchema,
        newTab: boolSchema.describe('Open in a new tab.'),
        onClick: actionProp('Runs when the link is clicked.'),
        className: classNameSchema,
        ...textFields,
      })
      .describe('A hyperlink.'),
  },
  ({buildChild, component, schema}) => {
    const blok = useBlok(component, schema);
    const href = useValue(blok.href);
    const text = useValue(blok.text);
    const children = useValue(blok.children);
    const newTab = useValue(blok.newTab);
    const onClick = useAction(blok.onClick);
    const className = useValue(blok.className);
    const presentation = useTextPresentationProps(blok);

    return (
      <a
        href={href}
        target={newTab ? '_blank' : undefined}
        // `noreferrer` also implies `noopener`, which matters for any
        // externally authored href.
        rel={newTab ? 'noreferrer' : undefined}
        onClick={onClick}
        className={cn(
          'underline underline-offset-2 hover:no-underline',
          ...textPresentationClasses(presentation),
          className,
        )}
      >
        {renderContent(children ?? text, buildChild)}
      </a>
    );
  },
);

export const Img = createBlokComponent(
  {
    name: 'img',
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe('Image URL.'),
        alt: BlokPropSchemas.DynamicString.optional().describe('Alternative text.'),
        blurhash: BlokPropSchemas.DynamicString.optional().describe(
          'Blurhash shown while the image loads.',
        ),
        className: classNameSchema,
        width: layoutFields.width,
        height: layoutFields.height,
        maxWidth: layoutFields.maxWidth,
        maxHeight: layoutFields.maxHeight,
        radius: layoutFields.radius,
      })
      .describe('An image.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const src = useValue(blok.src);
    const alt = useValue(blok.alt);
    const blurhash = useValue(blok.blurhash);
    const className = useValue(blok.className);
    const width = useValue(blok.width);
    const height = useValue(blok.height);
    const maxWidth = useValue(blok.maxWidth);
    const maxHeight = useValue(blok.maxHeight);
    const radius = useValue(blok.radius);

    if (!src) {
      return null;
    }

    return (
      <ShadImage
        src={src}
        alt={alt}
        blurhash={blurhash}
        className={className}
        style={{width, height, maxWidth, maxHeight, borderRadius: radius}}
      />
    );
  },
);

const createMediaBlok = (tag: 'video' | 'audio', description: string) =>
  createBlokComponent(
    {
      name: tag,
      schema: z
        .object({
          src: BlokPropSchemas.DynamicString.optional().describe('Media URL.'),
          controls: boolSchema.describe('Show playback controls. Defaults to true.'),
          autoPlay: boolSchema.describe('Start playing on mount.'),
          loop: boolSchema.describe('Restart when finished.'),
          muted: boolSchema.describe('Start muted.'),
          className: classNameSchema,
        })
        .describe(description),
    },
    ({component, schema}) => {
      const blok = useBlok(component, schema);
      const src = useValue(blok.src);
      const controls = useValue(blok.controls);
      const autoPlay = useValue(blok.autoPlay);
      const loop = useValue(blok.loop);
      const muted = useValue(blok.muted);
      const className = useValue(blok.className);
      const Element = tag as 'video';

      if (!src) {
        return null;
      }

      return (
        <Element
          src={src}
          controls={controls ?? true}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          className={className}
        />
      );
    },
  );

export const Video = createMediaBlok('video', 'A video player.');
export const Audio = createMediaBlok('audio', 'An audio player.');

export const LineBreak = createBlokComponent(
  {
    name: 'br',
    schema: z.object({}).describe('A line break.'),
  },
  () => <br />,
);

export const HorizontalRule = createBlokComponent(
  {
    name: 'hr',
    schema: z
      .object({
        className: classNameSchema,
        margin: layoutFields.margin,
      })
      .describe('A thematic break. Use Separator for the styled shadcn version.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const className = useValue(blok.className);
    const margin = useValue(blok.margin);

    return <hr className={cn('border-border', className)} style={{margin}} />;
  },
);

export const Progressbar = createBlokComponent(
  {
    name: 'progress',
    schema: z
      .object({
        value: numberSchema.describe('Current value.'),
        max: numberSchema.describe('Maximum value. Defaults to 100.'),
        className: classNameSchema,
      })
      .describe('A native progress element. Use Progress for the styled version.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const value = useValue(blok.value);
    const max = useValue(blok.max);
    const className = useValue(blok.className);

    return <progress value={value} max={max ?? 100} className={className} />;
  },
);

export const htmlBlokComponents = [
  ...elementBloks,
  Anchor,
  Img,
  Video,
  Audio,
  LineBreak,
  HorizontalRule,
  Progressbar,
];


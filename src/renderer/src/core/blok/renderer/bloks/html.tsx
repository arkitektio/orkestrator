import {Image as ShadImage} from '@/core/ui/image';
import {cn} from '@/core/util/utils';
import * as z from 'zod';
import {
  BlokPropSchemas,
  createBlokComponent,
  useBlok,
  useBlokDataAttributes,
  usePendingAction,
  useValue,
} from '../runtime';
import {AssetSourceNotice, useAssetImageUrl} from '../assets';
import {
  actionProp,
  boolSchema,
  classNameSchema,
  contentSchema,
  layoutFields,
  renderContent,
  textFields,
  textPresentationClasses,
  useTextPresentationProps,
} from './shared';

/**
 * ui@1's links and media: `Link`, `Image` and `Code`. Raw HTML tags are not
 * part of the language; html@1 keeps only `div`, `p` and `span`, the
 * containers that translate directly to React Native (View, Text).
 */

export const Link = createBlokComponent(
  {
    name: 'Link',
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
    const {run: onClick, pending: busy} = usePendingAction(blok.onClick);
    const attributes = useBlokDataAttributes({busy});
    const className = useValue(blok.className);
    const presentation = useTextPresentationProps(blok);

    return (
      <a
        {...attributes}
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

export const Image = createBlokComponent(
  {
    name: 'Image',
    schema: z
      .object({
        src: BlokPropSchemas.DynamicString.optional().describe(
          'Image URL, or an image its app registered as an asset: `{self.assets.logo}`.',
        ),
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
    const url = useValue(blok.src);
    const asset = useAssetImageUrl(component, 'src');
    const src = asset.named ? asset.url : url;
    const alt = useValue(blok.alt);
    const blurhash = useValue(blok.blurhash);
    const className = useValue(blok.className);
    const width = useValue(blok.width);
    const height = useValue(blok.height);
    const maxWidth = useValue(blok.maxWidth);
    const maxHeight = useValue(blok.maxHeight);
    const radius = useValue(blok.radius);
    const dataAttributes = useBlokDataAttributes();

    if (!src) {
      // An image its app only says where to fetch: whoever may add it is offered to.
      return asset.source ? <AssetSourceNotice source={asset.source} kind="IMAGE" /> : null;
    }

    return (
      <span {...dataAttributes} className="contents">
      <ShadImage
        src={src}
        alt={alt}
        blurhash={blurhash}
        className={className}
        style={{width, height, maxWidth, maxHeight, borderRadius: radius}}
      />
      </span>
    );
  },
);


export const Code = createBlokComponent(
  {
    name: 'Code',
    schema: z
      .object({
        text: BlokPropSchemas.DynamicString.optional().describe('The code to show.'),
        block: boolSchema.describe('A block of its own (preformatted), rather than inline.'),
        className: classNameSchema,
        ...textFields,
      })
      .describe('Code, in a monospaced face: inline, or as a block.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const text = useValue(blok.text);
    const block = useValue(blok.block) === true;
    const className = useValue(blok.className);
    const presentation = useTextPresentationProps(blok);
    const attributes = useBlokDataAttributes();
    if (block) {
      return (
        <pre
          {...attributes}
          className={cn('overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs', ...textPresentationClasses(presentation), className)}
        >
          <code>{text}</code>
        </pre>
      );
    }
    return (
      <code {...attributes} className={cn('rounded bg-muted px-1 py-0.5 font-mono text-xs', ...textPresentationClasses(presentation), className)}>
        {text}
      </code>
    );
  },
);

export const htmlBlokComponents = [Link, Image, Code];

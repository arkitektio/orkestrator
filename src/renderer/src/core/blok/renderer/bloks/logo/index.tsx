import * as React from 'react';
import * as z from 'zod';
import {
  BlokNodeErrorSurface,
  createBlokComponent,
  useBlok,
  useBlokDataAttributes,
  usePendingAction,
  useValue,
  type Blok,
  type BlokComponentPlacement,
  type BlokNodeErrorProps,
  type BlokObjectSchema,
  type BlokRenderArgs,
} from '../../runtime';
import {loadVocabulary} from '../../../spec/vocabulary';
import {actionProp, describedString} from '../shared/schemas';

/**
 * The `logo@1` module of the blok language: the `AgentLogo` and `ActionLogo`
 * roots and the classic SVG elements as components.
 *
 * A logo root sits in html like `Scene` does and opens the `logo` context, so a
 * `Path` or a `Circle` is only ever placed inside one. The root names the
 * blok's context: an `AgentLogo` root is a LOGO blok, an `ActionLogo` root an
 * ACTION_LOGO blok (it reads `task`, the viewer's last task of the action); any
 * html blok may draw either too.
 *
 * A logo paints with the viewer's pens only (vocabulary `theme.logo_pens`:
 * `ink`, `brand`, ..., the status roles `success`, `warning`, `info`), drawn
 * from the brand hue as `var(--logo-*)`, or with `url(#id)` into the drawing.
 * Anything else is drawn in `ink`; the server refuses it at save.
 *
 * A shape may `animate`. It plays while the logo is hovered, and while an
 * action logo's task runs (`[data-logo-active]`); see `index.css`.
 *
 * Names are capitalised like the rest of the catalog and props are camelCase
 * (`strokeWidth`, not `stroke-width`). `Text` is the typography component, so
 * SVG text is `SvgText`.
 *
 * A node's id is the BSX `id`, and that is what a gradient or a clip path is
 * referenced by: `fill="url(#sky)"` names `<LinearGradient id="sky">`. Ids are
 * made unique per drawing, so two logos on one page never share a gradient.
 */

/** Which drawing a node is in: the prefix that makes its ids unique on the page. */
const SvgDrawingContext = React.createContext<string | null>(null);

const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_');

/** The element id of node `id` inside the drawing. */
const useElementId = (id: string) => {
  const prefix = React.useContext(SvgDrawingContext);
  return `${prefix ?? 'svg'}-${safeId(id)}`;
};

const URL_REFERENCE = /^url\(\s*#([^)\s]+)\s*\)$/;

/** `url(#name)` pointed at the element `name` became in this drawing; anything else as it was. */
const useReference = (value: string | undefined) => {
  const prefix = React.useContext(SvgDrawingContext);
  if (value === undefined) return undefined;
  const match = URL_REFERENCE.exec(value.trim());
  return match ? `url(#${prefix ?? 'svg'}-${safeId(match[1])})` : value;
};

/** The pens: what `var(--logo-<pen>)` in `index.css` draws from the brand hue (vocabulary `theme.logo_pens`). */
export const LOGO_PAINT_TOKENS: readonly string[] = loadVocabulary().theme.logoPens;

/** What a shape may play: a class `logo-anim-<name>` the stylesheet animates. */
export const LOGO_ANIMATIONS = ['spin', 'pulse', 'float', 'draw', 'march', 'blink'] as const;
type LogoAnimation = (typeof LOGO_ANIMATIONS)[number];

const isPaletteToken = (value: string) => LOGO_PAINT_TOKENS.includes(value);

/** A paint as drawn: a pen, a reference into the drawing; anything else in `ink`. */
const usePaint = (value: string | undefined) => {
  const reference = useReference(value);
  if (value === undefined || value === null) return undefined;
  const paint = String(value).trim();
  if (paint === 'none') return 'none';
  if (isPaletteToken(paint)) return `var(--logo-${paint})`;
  if (URL_REFERENCE.test(paint)) return reference;
  return 'var(--logo-ink)';
};

const length = (description: string) =>
  z.union([z.number(), z.string()]).optional().describe(description);

export const AGENT_LOGO_ROOT = 'AgentLogo';
export const ACTION_LOGO_ROOT = 'ActionLogo';
export const LOGO_ROOTS = [AGENT_LOGO_ROOT, ACTION_LOGO_ROOT];

const IN_SVG: BlokComponentPlacement = {context: 'logo', downstreamOf: LOGO_ROOTS};

/* -------------------------------------------------------------------------- */
/* Presentation: what every shape and group may set                           */
/* -------------------------------------------------------------------------- */

const PAINT_HELP = `${LOGO_PAINT_TOKENS.join(', ')} (the viewer's pens), or url(#gradient)`;

const presentationFields = {
  fill: describedString(`Fill paint: ${PAINT_HELP}.`),
  fillOpacity: length('Fill opacity, 0 to 1.'),
  fillRule: z.enum(['nonzero', 'evenodd']).optional().describe('Which parts of a self-intersecting shape are inside.'),
  stroke: describedString(`Stroke paint: ${PAINT_HELP}.`),
  strokeWidth: length('Stroke width, in user units.'),
  strokeOpacity: length('Stroke opacity, 0 to 1.'),
  strokeLinecap: z.enum(['butt', 'round', 'square']).optional().describe('How open line ends are drawn.'),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).optional().describe('How corners are drawn.'),
  strokeDasharray: describedString('Dash pattern, e.g. "4 2".'),
  opacity: length('Opacity of the whole element, 0 to 1.'),
  transform: describedString('SVG transform, e.g. "rotate(45 12 12)".'),
  clipPath: describedString('url(#clip) of a ClipPath to clip by.'),
  title: describedString('Tooltip text (an SVG <title>).'),
  onClick: actionProp('Runs when the element is clicked.'),
  animate: z
    .enum(LOGO_ANIMATIONS)
    .optional()
    .describe(
      'Plays while the logo is hovered, and while an action logo\'s task runs: spin, pulse, float, draw (traces the stroke), march (moves a dashed stroke) or blink.',
    ),
  animateDelay: length('Seconds before the animation starts, to stagger shapes.'),
};

type PresentationBlok = Blok<z.ZodObject<typeof presentationFields>>;

const usePresentation = (blok: PresentationBlok) => {
  const fill = usePaint(useValue(blok.fill));
  const stroke = usePaint(useValue(blok.stroke));
  const clipPath = useReference(useValue(blok.clipPath));
  // Busy while the call it started runs: a shape cannot dispatch twice (`data-busy`).
  const {run: onClick, pending} = usePendingAction(blok.onClick);
  const requested = useValue(blok.animate);
  // A bound or computed value may name anything: only a known animation plays.
  const animate = (LOGO_ANIMATIONS as readonly string[]).includes(requested as string)
    ? (requested as LogoAnimation)
    : undefined;
  const delay = useValue(blok.animateDelay);
  const style: React.CSSProperties = {};
  if (onClick) style.cursor = 'pointer';
  if (animate && delay !== undefined) style.animationDelay = `${Number(delay)}s`;
  return {
    animate,
    props: {
      'data-busy': pending ? '' : undefined,
      fill,
      fillOpacity: useValue(blok.fillOpacity),
      fillRule: useValue(blok.fillRule),
      stroke,
      strokeWidth: useValue(blok.strokeWidth),
      strokeOpacity: useValue(blok.strokeOpacity),
      strokeLinecap: useValue(blok.strokeLinecap),
      strokeLinejoin: useValue(blok.strokeLinejoin),
      strokeDasharray: useValue(blok.strokeDasharray),
      opacity: useValue(blok.opacity),
      transform: useValue(blok.transform),
      clipPath,
      onClick,
      className: animate ? `logo-anim logo-anim-${animate}` : undefined,
      style: Object.keys(style).length ? style : undefined,
    },
    title: useValue(blok.title),
  };
};

const childrenOf = ({component, buildChild}: BlokRenderArgs) =>
  (component.children ?? []).map(child => (
    <React.Fragment key={child.id}>{buildChild(child.id)}</React.Fragment>
  ));

/**
 * A shape: one SVG element, its geometry props passed through as they are,
 * plus the shared presentation.
 */
const createShape = (
  name: string,
  tag: 'path' | 'circle' | 'ellipse' | 'rect' | 'line' | 'polyline' | 'polygon',
  description: string,
  geometry: Record<string, z.ZodTypeAny>,
) => {
  const schema: BlokObjectSchema = z.object({...geometry, ...presentationFields}).describe(description);
  const keys = Object.keys(geometry);
  return createBlokComponent({name, placement: IN_SVG, schema}, ({component, schema}) => {
    const blok = useBlok(component, schema);
    const {props, title, animate} = usePresentation(blok as unknown as PresentationBlok);
    // The geometry keys are fixed per component, so the hooks run in the same order every render.
    const values = keys.map(key => [key, useValue(blok[key])] as const);
    const Element = tag as 'path';
    return (
      // `draw` traces the stroke from 0 to 1 of its length, whatever the shape's size.
      <Element {...props} {...Object.fromEntries(values)} pathLength={animate === 'draw' ? 1 : undefined}>
        {title ? <title>{title}</title> : null}
      </Element>
    );
  });
};

/* -------------------------------------------------------------------------- */
/* The root                                                                   */
/* -------------------------------------------------------------------------- */

/** Inside an `<svg>` nothing can render a `div`: a node that fails is drawn as nothing, and said so. */
const SvgNodeError = ({componentId, title, detail}: BlokNodeErrorProps) => (
  <g data-blok-error={componentId}>
    <title>{detail ? `${title}: ${detail}` : title}</title>
  </g>
);

const rootSchema = (description: string) =>
  z
    .object({
      viewBox: describedString('The user coordinate system, "minX minY width height", e.g. "0 0 24 24".'),
      width: length('Width; fills its box when left out.'),
      height: length('Height; fills its box when left out.'),
      preserveAspectRatio: describedString('How the viewBox fits the box, e.g. "xMidYMid meet".'),
      title: describedString('What the drawing shows, for screen readers and as a tooltip.'),
    })
    .describe(description);

/** A drawing's root: an `<svg>` whose shapes paint with the pens. */
const logoRoot = (name: string, description: string) =>
  createBlokComponent(
    {
      name,
      acceptsChildren: true,
      placement: {childrenContext: 'logo', notDownstreamOf: LOGO_ROOTS},
      schema: rootSchema(description),
    },
    args => {
      const blok = useBlok(args.component, args.schema);
      const viewBox = useValue(blok.viewBox);
      const width = useValue(blok.width);
      const height = useValue(blok.height);
      const preserveAspectRatio = useValue(blok.preserveAspectRatio);
      const title = useValue(blok.title);
      const prefix = `svg${React.useId().replace(/[^A-Za-z0-9]/g, '')}`;
      const attributes = useBlokDataAttributes();

      return (
        <svg
          {...attributes}
          viewBox={viewBox}
          width={width ?? '100%'}
          height={height ?? '100%'}
          preserveAspectRatio={preserveAspectRatio}
          role={title ? 'img' : undefined}
          aria-label={title}
          data-blok-svg={args.component.id}
          data-blok-prefix={prefix}
          data-logo-palette=""
        >
          {title ? <title>{title}</title> : null}
          <SvgDrawingContext.Provider value={prefix}>
            <BlokNodeErrorSurface.Provider value={SvgNodeError}>{childrenOf(args)}</BlokNodeErrorSurface.Provider>
          </SvgDrawingContext.Provider>
        </svg>
      );
    },
  );

export const AgentLogoBlok = logoRoot(
  AGENT_LOGO_ROOT,
  "The root of an agent's logo: a drawing in the viewer's pens. Its children are SVG shapes.",
);

export const ActionLogoBlok = logoRoot(
  ACTION_LOGO_ROOT,
  "The root of an action's logo: a drawing in the viewer's pens that reads task (the viewer's last task of the action, idle until they run it). Its children are SVG shapes.",
);

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export const PathBlok = createShape('Path', 'path', 'An SVG path.', {
  d: describedString('Path data, e.g. "M2 12h20".'),
});

export const CircleBlok = createShape('Circle', 'circle', 'An SVG circle.', {
  cx: length('Centre x.'),
  cy: length('Centre y.'),
  r: length('Radius.'),
});

export const EllipseBlok = createShape('Ellipse', 'ellipse', 'An SVG ellipse.', {
  cx: length('Centre x.'),
  cy: length('Centre y.'),
  rx: length('Horizontal radius.'),
  ry: length('Vertical radius.'),
});

export const RectBlok = createShape('Rect', 'rect', 'An SVG rectangle.', {
  x: length('Left edge.'),
  y: length('Top edge.'),
  width: length('Width.'),
  height: length('Height.'),
  rx: length('Corner radius, horizontal.'),
  ry: length('Corner radius, vertical.'),
});

export const LineBlok = createShape('Line', 'line', 'An SVG line.', {
  x1: length('Start x.'),
  y1: length('Start y.'),
  x2: length('End x.'),
  y2: length('End y.'),
});

export const PolylineBlok = createShape('Polyline', 'polyline', 'An open SVG polyline.', {
  points: describedString('Points, e.g. "0,0 10,5 20,0".'),
});

export const PolygonBlok = createShape('Polygon', 'polygon', 'A closed SVG polygon.', {
  points: describedString('Points, e.g. "0,0 10,5 20,0".'),
});

export const SvgTextBlok = createBlokComponent(
  {
    name: 'SvgText',
    placement: IN_SVG,
    schema: z
      .object({
        text: describedString('The text to draw.'),
        x: length('Anchor x.'),
        y: length('Baseline y.'),
        fontSize: length('Font size, in user units.'),
        fontFamily: describedString('Font family.'),
        fontWeight: describedString('Font weight, e.g. "bold" or "600".'),
        textAnchor: z.enum(['start', 'middle', 'end']).optional().describe('Where x is on the text.'),
        dominantBaseline: z
          .enum(['auto', 'middle', 'central', 'hanging', 'alphabetic'])
          .optional()
          .describe('Where y is on the text.'),
        ...presentationFields,
      })
      .describe('Text in an SVG drawing (the SVG <text> element).'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    const {props, title} = usePresentation(blok as unknown as PresentationBlok);
    return (
      <text
        {...props}
        x={useValue(blok.x)}
        y={useValue(blok.y)}
        fontSize={useValue(blok.fontSize)}
        fontFamily={useValue(blok.fontFamily)}
        fontWeight={useValue(blok.fontWeight)}
        textAnchor={useValue(blok.textAnchor)}
        dominantBaseline={useValue(blok.dominantBaseline)}
      >
        {title ? <title>{title}</title> : null}
        {useValue(blok.text)}
      </text>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Structure: groups, definitions, gradients, clip paths                      */
/* -------------------------------------------------------------------------- */

export const GroupBlok = createBlokComponent(
  {
    name: 'G',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object(presentationFields).describe('A group of SVG elements, which share its presentation and transform.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    const {props, title} = usePresentation(blok);
    return (
      <g {...props}>
        {title ? <title>{title}</title> : null}
        {childrenOf(args)}
      </g>
    );
  },
);

export const DefsBlok = createBlokComponent(
  {
    name: 'Defs',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z.object({}).describe('Definitions (gradients, clip paths) that are referenced, not drawn.'),
  },
  args => <defs>{childrenOf(args)}</defs>,
);

const gradientUnits = z
  .enum(['objectBoundingBox', 'userSpaceOnUse'])
  .optional()
  .describe('Whether the coordinates are fractions of the shape (the default) or user units.');

export const LinearGradientBlok = createBlokComponent(
  {
    name: 'LinearGradient',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        x1: length('Start x.'),
        y1: length('Start y.'),
        x2: length('End x.'),
        y2: length('End y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A linear gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    return (
      <linearGradient
        id={useElementId(args.component.id)}
        x1={useValue(blok.x1)}
        y1={useValue(blok.y1)}
        x2={useValue(blok.x2)}
        y2={useValue(blok.y2)}
        gradientUnits={useValue(blok.gradientUnits)}
        gradientTransform={useValue(blok.gradientTransform)}
      >
        {childrenOf(args)}
      </linearGradient>
    );
  },
);

export const RadialGradientBlok = createBlokComponent(
  {
    name: 'RadialGradient',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        cx: length('Centre x.'),
        cy: length('Centre y.'),
        r: length('Radius.'),
        fx: length('Focal point x.'),
        fy: length('Focal point y.'),
        gradientUnits,
        gradientTransform: describedString('Transform of the gradient.'),
      })
      .describe('A radial gradient, filled by its Stop children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    return (
      <radialGradient
        id={useElementId(args.component.id)}
        cx={useValue(blok.cx)}
        cy={useValue(blok.cy)}
        r={useValue(blok.r)}
        fx={useValue(blok.fx)}
        fy={useValue(blok.fy)}
        gradientUnits={useValue(blok.gradientUnits)}
        gradientTransform={useValue(blok.gradientTransform)}
      >
        {childrenOf(args)}
      </radialGradient>
    );
  },
);

export const StopBlok = createBlokComponent(
  {
    name: 'Stop',
    placement: {context: 'logo', downstreamOf: ['LinearGradient', 'RadialGradient']},
    schema: z
      .object({
        offset: length('Where along the gradient, 0 to 1 or a percentage.'),
        stopColor: describedString(`The colour at this stop: ${PAINT_HELP}.`),
        stopOpacity: length('The opacity at this stop, 0 to 1.'),
      })
      .describe('One colour stop of a gradient.'),
  },
  ({component, schema}) => {
    const blok = useBlok(component, schema);
    return (
      <stop offset={useValue(blok.offset)} stopColor={usePaint(useValue(blok.stopColor))} stopOpacity={useValue(blok.stopOpacity)} />
    );
  },
);

export const ClipPathBlok = createBlokComponent(
  {
    name: 'ClipPath',
    acceptsChildren: true,
    placement: IN_SVG,
    schema: z
      .object({
        clipPathUnits: z
          .enum(['userSpaceOnUse', 'objectBoundingBox'])
          .optional()
          .describe('Whether its shapes are in user units (the default) or fractions of the clipped shape.'),
      })
      .describe('A clip path made of its shape children. Referenced as url(#id) by its BSX id.'),
  },
  args => {
    const blok = useBlok(args.component, args.schema);
    return (
      <clipPath id={useElementId(args.component.id)} clipPathUnits={useValue(blok.clipPathUnits)}>
        {childrenOf(args)}
      </clipPath>
    );
  },
);

/** The `logo@1` module: the root, seven shapes, text, and what shapes reference. */
export const logoBlokComponents = [
  AgentLogoBlok,
  ActionLogoBlok,
  PathBlok,
  CircleBlok,
  EllipseBlok,
  RectBlok,
  LineBlok,
  PolylineBlok,
  PolygonBlok,
  SvgTextBlok,
  GroupBlok,
  DefsBlok,
  LinearGradientBlok,
  RadialGradientBlok,
  StopBlok,
  ClipPathBlok,
];

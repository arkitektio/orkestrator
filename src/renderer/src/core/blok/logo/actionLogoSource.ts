/**
 * The pen this app draws its action logos with: logo bloks in v2 BSX (an
 * `ActionLogo` root, the action-logo kind), on a 24 px grid, painted with the viewer's pens
 * only (vocabulary `theme.logo_pens`: `ink muted brand brand-strong brand-soft
 * surface none`, the status pens `success warning info` and the spectral pens
 * `spectrum-violet` ... `spectrum-red`, for a logo of something that has a
 * colour of its own, such as a laser line): the server refuses any other colour.
 * Strokes are ink and round unless a shape says otherwise; fills are off, since
 * SVG's own default fill is black. `animate` plays on hover and while the
 * action runs.
 *
 * Shared by the agent's logos (`core/agent/logos.ts`, declared to rekuest) and
 * the local actions' (`Action.logo`, drawn here only).
 */

export const ACTION_LOGO_PEN =
  'fill="none" stroke="ink" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"';

/** An attribute literal: in v2 BSX `"..."` is always a string, so only the markup needs escaping. */
const attribute = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** An `ActionLogo` of `body`, drawn with the pen. */
export const actionLogoSource = (title: string, body: string): string =>
  `<ActionLogo viewBox="0 0 24 24" title="${attribute(title)}"><G ${ACTION_LOGO_PEN}>${body}</G></ActionLogo>`;

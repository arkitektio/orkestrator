/**
 * The pen this app draws its action logos with: ACTION_LOGO bloks in BSX, on
 * a 24 px grid, painted with the viewer's palette only (`ink muted brand
 * brand-strong brand-soft surface none`): the server refuses any other colour.
 * Strokes are ink and round unless a shape says otherwise; fills are off, since
 * SVG's own default fill is black. `animate` plays on hover and while the
 * action runs.
 *
 * Shared by the agent's logos (`core/agent/logos.ts`, declared to rekuest) and
 * the local actions' (`Action.logo`, drawn here only).
 */

export const ACTION_LOGO_PEN =
  'fill="none" stroke="ink" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"';

/** An ActionLogo of `body`, drawn with the pen. */
export const actionLogoSource = (title: string, body: string): string =>
  `<ActionLogo viewBox="0 0 24 24" title="${title}"><G ${ACTION_LOGO_PEN}>${body}</G></ActionLogo>`;

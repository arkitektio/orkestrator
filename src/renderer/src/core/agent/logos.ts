/**
 * The action logos this app draws its agent's actions with: ACTION_LOGO bloks,
 * declared with the agent and named by its implementations (`logo`).
 *
 * BSX on a 24 px grid, painted with the viewer's palette only (`ink muted brand
 * brand-strong brand-soft surface none`): the server refuses any other colour.
 * Strokes are ink and round unless a shape says otherwise; fills are off, since
 * SVG's own default fill is black. `animate` plays on hover and while the
 * viewer's task of the action runs.
 *
 * Blok keys are organization-wide, so every one is named for this app.
 */

export type ActionLogoDeclaration = {
  /** The blok's key: what `ImplementationInput.logo` names. */
  key: string;
  description: string;
  source: string;
};

const PEN = 'fill="none" stroke="ink" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"';

const actionLogo = (interfaceName: string, title: string, body: string): ActionLogoDeclaration => ({
  key: `orkestrator_${interfaceName}_logo`,
  description: `${title}.`,
  source: `<ActionLogo viewBox="0 0 24 24" title="${title}"><G ${PEN}>${body}</G></ActionLogo>`,
});

/** By the interface of the action each one draws. */
export const ACTION_LOGOS: Record<string, ActionLogoDeclaration> = {
  // A release (a box) beside the seal a person puts on it: the check draws itself.
  request_approval: actionLogo(
    "request_approval",
    "Ask you to approve a release",
    '<Path d="M2.5 10.5L9 7l6.5 3.5v7L9 21l-6.5-3.5z" fill="surface" />' +
      '<Path d="M2.5 10.5L9 14l6.5-3.5M9 14v7" stroke="muted" strokeWidth="1.4" />' +
      '<Path d="M17.5 2.5l4 1.5v3.7c0 2.6-1.7 4.6-4 5.4-2.3-.8-4-2.8-4-5.4V4z" fill="brand-soft" stroke="brand-strong" />' +
      '<Path d="M15.7 7.7l1.3 1.3 2.6-2.8" stroke="brand-strong" strokeWidth="2" animate="draw" />',
  ),
  // The main window behind, and an image lifting out of it into a window of its own.
  open_in_separate_window: actionLogo(
    "open_in_separate_window",
    "Open an image in its own window",
    '<Rect x="2.5" y="3" width="13" height="10" rx="1.5" fill="surface" stroke="muted" />' +
      '<Path d="M2.5 6h13" stroke="muted" />' +
      '<G animate="float">' +
      '<Rect x="8.5" y="9" width="13" height="12" rx="1.5" fill="surface" />' +
      '<Path d="M8.5 12h13" />' +
      '<Path d="M10.5 19l3-3.2 2.2 2.2 1.6-1.6 2.2 2.6" stroke="brand-strong" strokeWidth="1.5" />' +
      '<Circle cx="18" cy="14.6" r="1.1" fill="brand" stroke="none" />' +
      "</G>",
  ),
  // A folder with an eye on it, blinking while it watches.
  watch_directory: actionLogo(
    "watch_directory",
    "Watch a folder for new files",
    '<Path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h4.5l2 2.2H20a1.5 1.5 0 0 1 1.5 1.5v10.3A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19z" fill="surface" />' +
      '<Path d="M6.5 14s2.2-3.3 5.5-3.3 5.5 3.3 5.5 3.3-2.2 3.3-5.5 3.3S6.5 14 6.5 14z" fill="brand-soft" stroke="brand-strong" strokeWidth="1.6" />' +
      '<Circle cx="12" cy="14" r="1.6" fill="brand-strong" stroke="none" animate="blink" />',
  ),
};

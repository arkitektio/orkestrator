import { actionLogoSource } from "@arkitektio/bsx/logo/actionLogoSource";

/**
 * The logos of the host's own local actions (`registry.tsx`): v2 logo BSX (`ActionLogo`),
 * drawn with the same pen as the agent's (`core/agent/logos.ts`), but never
 * declared to rekuest: `SourceLogo` draws them from here.
 */
export const HOST_ACTION_LOGOS = {
  // An arrow going into a page.
  navigate: actionLogoSource(
    "Open",
    '<Rect x="7" y="3" width="14.5" height="18" rx="2" fill="surface" />' +
      '<Path d="M13 8h5.5M13 11.5h5.5M13 15h3" stroke="muted" strokeWidth="1.4" />' +
      '<Path d="M2.5 12h9M8.5 8.5L12 12l-3.5 3.5" stroke="brand-strong" strokeWidth="2" animate="draw" />',
  ),
  // A window's tab strip, and a new tab rising beside the open one.
  newtab: actionLogoSource(
    "Open in new tab",
    '<Path d="M2.5 8.5h19V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19z" fill="surface" />' +
      '<Path d="M2.5 8.5V5.5A1.5 1.5 0 0 1 4 4h4.5l1.5 4.5" stroke="muted" />' +
      '<Path d="M11 8.5l1.1-3.3A1.8 1.8 0 0 1 13.8 4h4.2l1.5 4.5z" fill="brand-soft" stroke="brand-strong" animate="float" />' +
      '<Path d="M12 11.8v5.4M9.3 14.5h5.4" stroke="brand-strong" strokeWidth="1.6" />',
  ),
  // A page split in two, the structure coming in on the right.
  opentotheside: actionLogoSource(
    "Open to the side",
    '<Rect x="2.5" y="4" width="19" height="16" rx="1.5" fill="surface" />' +
      '<Path d="M5 12h4.2M7.4 10l2 2-2 2" stroke="muted" strokeWidth="1.4" />' +
      '<Rect x="12.5" y="6" width="7" height="12" rx="1" fill="brand-soft" stroke="brand-strong" strokeWidth="1.5" animate="pulse" />',
  ),
  // The main window behind, and a window lifting out of it.
  popout: actionLogoSource(
    "Open in new window",
    '<Rect x="2.5" y="3" width="13" height="10" rx="1.5" fill="surface" stroke="muted" />' +
      '<Path d="M2.5 6h13" stroke="muted" />' +
      '<G animate="float">' +
      '<Rect x="8.5" y="9" width="13" height="12" rx="1.5" fill="surface" />' +
      '<Path d="M8.5 12h13" />' +
      '<Path d="M12.5 18.5l5-4.2M14.2 14.3h3.3v3.3" stroke="brand-strong" strokeWidth="1.6" />' +
      "</G>",
  ),
  // Two links of a chain, the one handed on in the brand.
  copylink: actionLogoSource(
    "Copy link",
    '<Path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" />' +
      '<Path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" stroke="brand-strong" animate="pulse" />',
  ),
  // A link, and a lock over it: the link names no server and no organization.
  copyprivatelink: actionLogoSource(
    "Copy private link",
    '<Path d="M9 11.5a4.2 4.2 0 0 0 6.3.4l2.5-2.5a4.2 4.2 0 0 0-5.9-5.9l-1.4 1.4" />' +
      '<Path d="M12.4 9.8a4.2 4.2 0 0 0-6.3-.4l-2.5 2.5a4.2 4.2 0 0 0 5.9 5.9" stroke="muted" />' +
      '<Path d="M15.8 15v-1.5a2.2 2.2 0 0 1 4.4 0V15" stroke="brand-strong" strokeWidth="1.6" />' +
      '<Rect x="14" y="15" width="8" height="6.5" rx="1.5" fill="brand-soft" stroke="brand-strong" strokeWidth="1.6" />' +
      '<Circle cx="18" cy="18.2" r="0.9" fill="brand-strong" stroke="none" animate="blink" />',
  ),
  // Down into a tray, the arrow bobbing.
  exporttofile: actionLogoSource(
    "Export to file",
    '<Path d="M3.5 15.5v3a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3" />' +
      '<G stroke="brand-strong" strokeWidth="2" animate="float">' +
      '<Path d="M12 3.5v10.5M7.5 9.5l4.5 4.5 4.5-4.5" />' +
      "</G>",
  ),
  // A lens over what was handed over: its identifier and id.
  debugdescribe: actionLogoSource(
    "Debug describe",
    '<Circle cx="10.5" cy="10.5" r="6.5" fill="brand-soft" stroke="brand-strong" />' +
      '<Path d="M15.3 15.3l5.2 5.2" strokeWidth="2.4" />' +
      '<Path d="M8 9h5M8 12h3.2" stroke="brand-strong" strokeWidth="1.4" animate="blink" />',
  ),
} as const;

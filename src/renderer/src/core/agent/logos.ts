/**
 * The action logos this app draws its agent's actions with: ACTION_LOGO bloks,
 * declared with the agent and named by its implementations (`logo`). Drawn
 * with the shared pen (`core/blok/logo/actionLogoSource.ts`).
 *
 * Blok keys are organization-wide, so every one is named for this app.
 */

import { actionLogoSource } from "@/core/blok/logo/actionLogoSource";

export type ActionLogoDeclaration = {
  /** The blok's key: what `ImplementationInput.logo` names. */
  key: string;
  description: string;
  source: string;
};

const actionLogo = (interfaceName: string, title: string, body: string): ActionLogoDeclaration => ({
  key: `orkestrator_${interfaceName}_logo`,
  description: `${title}.`,
  source: actionLogoSource(title, body),
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
  // A tray, and an arrow lifting out of it.
  upload_file: actionLogo(
    "upload_file",
    "Upload a file you choose",
    '<Path d="M3.5 15.5v3a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3" />' +
      '<G stroke="brand-strong" strokeWidth="2" animate="float">' +
      '<Path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />' +
      "</G>",
  ),
  // A file, and an arrow carrying it down into a tray.
  download_file: actionLogo(
    "download_file",
    "Save a file to your disk",
    '<Path d="M3.5 15.5v3a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3" />' +
      '<Path d="M8.5 2.5h5l2.5 2.5v4.5h-7.5z" fill="surface" stroke="muted" strokeWidth="1.4" />' +
      '<G stroke="brand-strong" strokeWidth="2" animate="float">' +
      '<Path d="M12 7v9M8.5 12.5L12 16l3.5-3.5" />' +
      "</G>",
  ),
  // A bell, its dot pulsing.
  notify: actionLogo(
    "notify",
    "Show you a message",
    '<Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" fill="surface" />' +
      '<Path d="M10 20.5a2.2 2.2 0 0 0 4 0" />' +
      '<Circle cx="18" cy="5.5" r="2.6" fill="brand" stroke="brand-strong" strokeWidth="1.4" animate="pulse" />',
  ),
  // A folder, and the check of the one chosen drawing itself.
  choose_directory: actionLogo(
    "choose_directory",
    "Ask you to choose a folder",
    '<Path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h4.5l2 2.2H20a1.5 1.5 0 0 1 1.5 1.5v10.3A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19z" fill="surface" />' +
      '<Circle cx="12" cy="14" r="4" fill="brand-soft" stroke="brand-strong" strokeWidth="1.5" />' +
      '<Path d="M10.2 14l1.3 1.3 2.4-2.6" stroke="brand-strong" strokeWidth="1.8" animate="draw" />',
  ),
};

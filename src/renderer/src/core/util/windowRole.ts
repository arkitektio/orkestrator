/**
 * Which window this renderer is.
 *
 * `app` is every ordinary window (the main one and pop-outs). `quick` is the
 * floating quick bar main opens with `?role=quick` (QuickPaletteWindow): the
 * same providers, but it renders only the palette and forwards navigation to
 * the main window. Fixed for the document's lifetime.
 */
export type WindowRole = "app" | "quick";

export const windowRoleFrom = (search: string): WindowRole =>
  new URLSearchParams(search).get("role") === "quick" ? "quick" : "app";

export const windowRole = (): WindowRole =>
  typeof location === "undefined" ? "app" : windowRoleFrom(location.search);

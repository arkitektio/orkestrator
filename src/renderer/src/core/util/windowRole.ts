/**
 * Which window this renderer is.
 *
 * `app` is the main window. `popout` is a window opened beside it
 * (`openSecondWindow`, `?role=popout`): everything works there, but it is not
 * this app's agent — one window answers what other apps ask of it. `quick` is
 * the floating quick bar main opens with `?role=quick` (QuickPaletteWindow): the
 * same providers, but it renders only the palette and forwards navigation to
 * the main window. Fixed for the document's lifetime.
 */
export type WindowRole = "app" | "popout" | "quick";

export const windowRoleFrom = (search: string): WindowRole => {
  const role = new URLSearchParams(search).get("role");
  return role === "quick" || role === "popout" ? role : "app";
};

export const windowRole = (): WindowRole =>
  typeof location === "undefined" ? "app" : windowRoleFrom(location.search);

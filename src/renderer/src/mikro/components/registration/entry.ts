/**
 * How the rest of the app gets INTO the registration workspace.
 *
 * Registration is its own PAGE, not part of the scene page: the scene viewer
 * stays a viewer, and aligning layers is something a user opts into from a
 * scene (the "Align Layers…" local action). The route is the scene's own with
 * `/register` appended, so it reads as what it is — that scene, in another
 * mode — and needs no id of its own.
 *
 * A module of its own (no React, no scene imports) so the action map can link
 * here without pulling the viewer into every page that lists scenes.
 */
export const REGISTRATION_ROUTE_SUFFIX = "register";

/** `/mikro/scenes/:id/register`. */
export const sceneRegistrationLink = (sceneId: string): string =>
  `/mikro/scenes/${encodeURIComponent(sceneId)}/${REGISTRATION_ROUTE_SUFFIX}`;

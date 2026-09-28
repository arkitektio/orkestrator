/**
 * Compositor capacity constants, in a leaf module of their own.
 *
 * These live apart from `channelUniforms.ts` because that file pulls in the
 * GraphQL API types (and through them the app's browser-only constants), which
 * makes it unimportable from a plain node test. The merge planner needs the
 * same numbers and is pure, so the constants sit where both can reach them.
 * `channelUniforms` re-exports them, so existing importers are unaffected.
 */

/** Compositor slots (channels + phasor sources) one material can address. */
export const MAX_CHANNELS = 16;
/** Phasor cursors across all sources of one material. */
export const MAX_CURSORS = 16;
/** Vertices a polygon cursor may carry (packed 2 per texel). */
export const MAX_CURSOR_POINTS = 24;

/**
 * appIdentity.ts — how kabinet turns a row into a visual identity.
 *
 * An app's identity is spread thin across the schema: `App` carries only an
 * identifier and an embedding, the logo hangs off releases and flavours, and
 * there is no display name anywhere — it has to be derived from the
 * reverse-domain identifier. Every surface that shows an app needs the same
 * four things, so they are assembled here rather than in each card.
 *
 * These helpers were the store's, back when the store was the only surface with
 * an icon. `storeModel.ts` still re-exports them.
 */

/** What `AppIcon` and `AppMarkCanvas` need to draw an app. */
export interface AppIdentity {
  /** The `App` row's id, where one was selected — what its page is keyed by. */
  id?: string;
  /** Reverse-domain identifier. Seeds the mark's pose and its fallback plate. */
  identifier: string;
  /** Display name. Only its first character reaches the mark, as the letter. */
  name: string;
  /** A real logo, if one was ever uploaded. Beats the generated mark. */
  logo?: string | null;
  /** Kabinet's `Embedding` scalar. Null until the backend has indexed the app. */
  embedding?: string | null;
  /** Falls back to `hueFor(identifier)`. */
  hue?: number;
}

const isUrl = (value?: string | null): value is string =>
  !!value && /^(https?:|data:|blob:)/.test(value);

/**
 * Logos are stored per release and per flavour, and either field may hold a
 * bare storage key rather than something an `<img>` can load — hence the URL
 * test rather than a plain null check.
 */
export const logoFor = (entity: {
  logo?: string | null;
  originalLogo?: string | null;
}): string | null =>
  isUrl(entity.logo) ? entity.logo : isUrl(entity.originalLogo) ? entity.originalLogo : null;

/** Stable hue per identifier, so every app keeps its colour across renders. */
export const hueFor = (identifier: string): number => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

/** `org.example.napari-viewer` → name "Napari Viewer", publisher "org.example". */
export const splitIdentifier = (
  identifier: string,
): { name: string; publisher: string | null } => {
  const parts = identifier.split(/[./]/).filter(Boolean);
  const last = parts.pop() ?? identifier;
  const name = last
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return { name: name || identifier, publisher: parts.length ? parts.join(".") : null };
};

/**
 * The identity of the app a release belongs to.
 *
 * The release's own logo wins over its flavours': a flavour logo describes one
 * build of the app, and all of them are the same app.
 */
export const releaseIdentity = (release: {
  logo?: string | null;
  originalLogo?: string | null;
  app: { id?: string; identifier: string; embedding?: unknown };
  flavours?: readonly { logo?: string | null; originalLogo?: string | null }[];
}): AppIdentity => ({
  id: release.app.id,
  identifier: release.app.identifier,
  name: splitIdentifier(release.app.identifier).name,
  logo: logoFor(release) ?? release.flavours?.map(logoFor).find(Boolean) ?? null,
  // Codegen types the Embedding scalar as `any`; it is a string on the wire and
  // the decoder is the only thing that reads it, so narrow it at the boundary.
  embedding: typeof release.app.embedding === "string" ? release.app.embedding : null,
  hue: hueFor(release.app.identifier),
});

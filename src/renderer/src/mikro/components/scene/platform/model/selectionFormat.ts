import { instanceHue } from "../gpu/instanceColormaps";

/**
 * How selections are LABELLED, shared by the surfaces that show them: the
 * annotations sidebar and the meshes sidebar. A mesh must carry the same hue
 * chip and the same "#42 · 12.4k v" shorthand wherever it appears, or two
 * surfaces read as two different objects.
 */

/** Compact magnitudes for catalog counts: "980", "12.4k", "1.2M". */
export const formatCount = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : String(value);

/** The instance's own hue — the color the shader actually draws it in. */
export const hueStyle = (ordinal: number) => ({
  background: `hsla(${instanceHue(ordinal) * 360}, 70%, 45%, 0.5)`,
  border: `1px solid hsla(${instanceHue(ordinal) * 360}, 80%, 60%, 0.7)`,
});

/** `POLYGON` → `Polygon`. */
export const formatAnnotationKind = (kind: string): string =>
  kind.charAt(0) + kind.slice(1).toLowerCase();

/**
 * Annotations are shown by their INDEX in their collection ("#3"), never by
 * name or id — the labels are machine-minted and unreadable, while the index
 * matches how the shapes read in the scene ("the third one I drew").
 */
export const indexLabel = (index: number) => `#${index + 1}`;

/**
 * Objects are shown by their object id; the ordinal is the fallback for the
 * window before the catalog answers (a probe click knows only the ordinal).
 */
export const objectLabel = (objectId: number | null, ordinal: number) =>
  objectId !== null ? `#${objectId}` : `ord ${ordinal}`;

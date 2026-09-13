import { TermKind } from "@/kraph/api/graphql";

/**
 * A term's kind is part of its identity: 'AIS' as an entity and 'AIS' as a
 * relation are two different terms, not one word used two ways.
 */
const TERM_KIND_LABELS: Partial<Record<TermKind, string>> = {
  [TermKind.Entity]: "Entity",
  [TermKind.NaturalEvent]: "Natural Event",
  [TermKind.ProtocolEvent]: "Protocol Event",
  [TermKind.Measurement]: "Measurement",
  [TermKind.Relation]: "Relation",
  [TermKind.StructureRelation]: "Structure Relation",
};

/**
 * The set of kinds is still moving on the backend, so unmapped values fall back
 * to title-casing the enum value rather than breaking the build.
 */
export const termKindLabel = (kind: TermKind) =>
  TERM_KIND_LABELS[kind] ??
  String(kind)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Terms carry an optional RGBA list; fall back to the muted border colour. */
export const termTint = (color?: readonly number[] | null) => {
  if (!color || color.length < 3) return "hsl(var(--border))";
  const [r, g, b, a] = color;
  return `rgba(${r}, ${g}, ${b}, ${a === undefined ? 1 : a / 255})`;
};

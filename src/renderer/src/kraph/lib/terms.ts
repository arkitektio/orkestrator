import { useCallback } from "react";
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

/** Every kind, in the order the explorer and the create dialog list them. */
export const TERM_KINDS: readonly TermKind[] = [
  TermKind.Entity,
  TermKind.ProtocolEvent,
  TermKind.NaturalEvent,
  TermKind.Relation,
  TermKind.Measurement,
  TermKind.StructureRelation,
];

/** One line on what a word of each kind names, for the create dialog. */
export const TERM_KIND_HINTS: Record<TermKind, string> = {
  [TermKind.Entity]: "A thing you track — a cell, a mouse, an AIS",
  [TermKind.ProtocolEvent]: "A step you performed — stained, imaged, treated with",
  [TermKind.NaturalEvent]: "Something that happened — mitosis, a spike",
  [TermKind.Relation]: "How two things relate — is part of, is connected to",
  [TermKind.Measurement]: "What a datum measures about a thing",
  [TermKind.StructureRelation]: "How two data relate — is a crop of, is derived from",
};

type TermSearchQuery = (x: {
  variables: { search?: string; values?: string[]; hidden?: boolean | null };
}) => Promise<{ data?: { options: { label: string; value: string }[] }; errors?: unknown }>;

/**
 * A word is never deleted, only hidden — and a hidden word must not be offered.
 * But the same picker query also resolves the label of a word already chosen
 * (`values`), which may have been hidden since; so the filter goes on the
 * search path only. Stable while `query` is, like the lazy query it wraps.
 */
export const useOfferedTermSearch = <Q extends TermSearchQuery>(query: Q) =>
  useCallback(
    (x: { variables: { search?: string; values?: string[] } }) =>
      query({
        variables: {
          ...x.variables,
          // `undefined`, not `null`: an omitted variable leaves the filter field
          // out entirely, whatever the server makes of an explicit null.
          hidden: x.variables.values?.length ? undefined : false,
        },
      }),
    [query],
  );

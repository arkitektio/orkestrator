import type { StructureInput } from "@/lovekit/api/graphql";

/**
 * Lovekit names the object a call is about by a numeric id (`object: Int`),
 * while the app's `Structure` carries `id` as a string. Every hand-over goes
 * through here so the coercion, and the "not a number" case, live in one
 * place: a structure without a numeric id cannot be called about.
 */
export const toStructureInput = (structure: {
  identifier: string;
  id?: string | number | null;
}): StructureInput | null => {
  const raw = structure.id;
  if (raw == null || raw === "") return null;
  const object = Number(raw);
  return Number.isInteger(object) ? { identifier: structure.identifier, object } : null;
};

export const toStructureInputs = (
  structures: readonly { identifier: string; id?: string | number | null }[],
): StructureInput[] =>
  structures.map(toStructureInput).filter((s): s is StructureInput => s !== null);

/**
 * What a call is talking about now. Lovekit lists `about` in the order the
 * call took things on, so the last entry is the newest; the earlier ones are
 * what it was about before.
 */
export const currentTopic = <T,>(call: { about: readonly T[] }): T | undefined => call.about[call.about.length - 1];

/** The app-level structure for one of a call's `about` entries. */
export const fromCallStructure = (structure: { identifier: string; object: number }) => ({
  identifier: structure.identifier,
  id: String(structure.object),
});

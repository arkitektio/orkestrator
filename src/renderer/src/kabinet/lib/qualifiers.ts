/**
 * A resource's qualifiers as label/value rows. The field is `UntypedParams`, so
 * it may arrive as a list of `{ key, value }` pairs or as a plain object; both
 * read the same here, and anything else reads as nothing.
 */
export const qualifierRows = (qualifiers: unknown): [string, string][] => {
  if (!qualifiers || typeof qualifiers !== "object") return [];
  if (Array.isArray(qualifiers)) {
    return qualifiers.flatMap((entry) =>
      entry && typeof entry === "object" && "key" in entry
        ? [[String(entry.key), String((entry as { value?: unknown }).value ?? "")] as [string, string]]
        : [],
    );
  }
  return Object.entries(qualifiers).map(([key, value]) => [
    key,
    typeof value === "object" ? JSON.stringify(value) : String(value),
  ]);
};

import { CategoryChipFragment } from "../../api/graphql";

/** Whether every, some or none of the mail is in a category. */
export type Membership = "all" | "some" | "none";

type Categorized = { categories: readonly Pick<CategoryChipFragment, "id">[] };

export const membership = (mail: readonly Categorized[], category: string): Membership => {
  const inIt = mail.filter((m) => m.categories.some((c) => c.id === category)).length;
  return inIt === 0 ? "none" : inIt === mail.length ? "all" : "some";
};

/**
 * What to send to `categorizeMessages` so the mail ends up as `wanted` says:
 * a category that became "all" is added, one that became "none" is removed,
 * one left as it was (or at "some") is not touched.
 */
export const categorizeDelta = (
  mail: readonly Categorized[],
  wanted: Readonly<Record<string, Membership>>,
): { add: string[]; remove: string[] } => {
  const add: string[] = [];
  const remove: string[] = [];
  for (const [category, want] of Object.entries(wanted)) {
    const now = membership(mail, category);
    if (want === now || want === "some") continue;
    (want === "all" ? add : remove).push(category);
  }
  return { add, remove };
};

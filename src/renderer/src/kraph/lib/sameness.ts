import type { Structure } from "@/types";
import type { ApolloClient } from "@apollo/client";
import {
  AssertEntityExistsDocument,
  AssertSameInstanceDocument,
  InstanceKind,
  KnowledgeForStructureDocument,
  type KnowledgeForStructureQuery,
  type KnowledgeForStructureQueryVariables,
  type KnowledgeInstanceFragment,
} from "../api/graphql";
import { isNotKnownYetErrors } from "./knowledgeErrors";

/**
 * "This is the same X as that one" — resolved once, used by both the local
 * action (drop anywhere on the panel, context menu, `ObjectButton`) and the
 * per-label drop target, so the decision is tested in one place.
 *
 * Sameness is organization-grain: it is a claim between two *instances*, and
 * needs no graph. What it does need is to find the instance on each side, and
 * that is where the cases come from — a datum may carry no label yet, one, or
 * several.
 */
export type SamenessPlan =
  /** Both sides already share a component: nothing to write. */
  | { kind: "already-same"; term: string }
  /** Both sides carry the word: one `assertSameInstance` over the two. */
  | { kind: "same-instance"; term: string; instances: [string, string] }
  /**
   * Only one side carries the word. The other gets claimed as it *and* the
   * same as the known instance, in a single assertion (`assertEntityExists`
   * with `sameAs`), because "this is also an X, that X" is one act.
   */
  | { kind: "claim-with-same-as"; term: string; evidence: Structure; sameAs: string }
  /** Neither side is labelled, so there is no word to claim sameness under. */
  | { kind: "needs-term" }
  /** Several words could be meant and none was named. */
  | { kind: "ambiguous"; terms: string[] };

/**
 * The slice of an Apollo client the resolver needs. Cache shape is irrelevant
 * to `query` / `mutate`, so any service client fits, and a test can fake it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SamenessClient = Pick<ApolloClient<any>, "query" | "mutate">;

export type PlanSamenessInput = {
  client: SamenessClient;
  /** This datum — the page, or the drop target. */
  left: Structure;
  /** The other datum — the dragged partner. */
  right: Structure;
  /** When invoked from a label card, the word that card is about. */
  term?: string;
};

export const isSameDatum = (a: Structure, b: Structure) =>
  a.identifier === b.identifier && a.object.id === b.object.id;

/** The ENTITY instances a datum is evidence for; an unseen datum has none. */
export const readLabels = async (
  client: SamenessClient,
  structure: Structure,
): Promise<KnowledgeInstanceFragment[]> => {
  const result = await client.query<
    KnowledgeForStructureQuery,
    KnowledgeForStructureQueryVariables
  >({
    query: KnowledgeForStructureDocument,
    variables: { identifier: structure.identifier, object: structure.object.id },
    errorPolicy: "all",
    fetchPolicy: "network-only",
  });
  const informs = result.data?.structureByIdentifier?.informs;
  if (!informs) {
    if (isNotKnownYetErrors(result.errors)) return [];
    throw new Error(
      result.errors?.[0]?.message ?? "Could not read what is known about this",
    );
  }
  return informs.filter((instance) => instance.kind === InstanceKind.Entity);
};

/**
 * One instance per word: a datum claimed twice under the same word is two
 * instances, and the newest is the one a person means. If someone already
 * merged them the two are one component and either id addresses it.
 */
export const newestByTerm = (instances: KnowledgeInstanceFragment[]) => {
  const byTerm = new Map<string, KnowledgeInstanceFragment>();
  for (const instance of instances) {
    const key = instance.term.key;
    const current = byTerm.get(key);
    if (!current || Date.parse(instance.createdAt) > Date.parse(current.createdAt)) {
      byTerm.set(key, instance);
    }
  }
  return byTerm;
};

export const planSameness = async ({
  client,
  left,
  right,
  term,
}: PlanSamenessInput): Promise<SamenessPlan> => {
  if (isSameDatum(left, right)) {
    throw new Error("Drop a different datum: this one cannot be the same as itself");
  }

  const [leftLabels, rightLabels] = await Promise.all([
    readLabels(client, left),
    readLabels(client, right),
  ]);
  const leftByTerm = newestByTerm(leftLabels);
  const rightByTerm = newestByTerm(rightLabels);

  const candidates = term
    ? [term]
    : Array.from(new Set([...leftByTerm.keys(), ...rightByTerm.keys()]));

  if (candidates.length === 0) return { kind: "needs-term" };
  if (candidates.length > 1) return { kind: "ambiguous", terms: candidates };

  const [key] = candidates;
  const l = leftByTerm.get(key);
  const r = rightByTerm.get(key);

  if (l && r) {
    const merged =
      l.id === r.id || l.component.includes(r.id) || r.component.includes(l.id);
    return merged
      ? { kind: "already-same", term: key }
      : { kind: "same-instance", term: key, instances: [l.id, r.id] };
  }
  if (l) return { kind: "claim-with-same-as", term: key, evidence: right, sameAs: l.id };
  if (r) return { kind: "claim-with-same-as", term: key, evidence: left, sameAs: r.id };
  return { kind: "needs-term" };
};

/** Records the plan. Only the two writing kinds do anything. */
export const executeSameness = async (
  client: SamenessClient,
  plan: SamenessPlan,
): Promise<void> => {
  if (plan.kind === "same-instance") {
    await client.mutate({
      mutation: AssertSameInstanceDocument,
      variables: { input: { instances: plan.instances } },
    });
    return;
  }
  if (plan.kind === "claim-with-same-as") {
    await client.mutate({
      mutation: AssertEntityExistsDocument,
      variables: {
        input: {
          term: plan.term,
          supportingEvidence: [
            { identifier: plan.evidence.identifier, object: plan.evidence.object.id },
          ],
          sameAs: [plan.sameAs],
        },
      },
    });
  }
};

/** The copy a person sees when a plan cannot be carried out. */
export const explainSameness = (plan: SamenessPlan): string | null => {
  if (plan.kind === "needs-term") {
    return "Neither datum is labelled yet. Type a word in the Knowledge panel of either one, then try again.";
  }
  if (plan.kind === "ambiguous") {
    return `These carry several labels (${plan.terms.join(", ")}). Open the label you mean and drop onto its card, which is scoped to that word.`;
  }
  return null;
};

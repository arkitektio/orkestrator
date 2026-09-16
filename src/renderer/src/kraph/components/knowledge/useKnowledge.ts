import {
  InstanceKind,
  useAssertEntityExistsMutation,
  useKnowledgeForStructureQuery,
  type KnowledgeInstanceFragment,
  type KnowledgeStructureFragment,
} from "@/kraph/api/graphql";
import { isNotKnownYet } from "@/kraph/lib/knowledgeErrors";
import type { Identifier, Object } from "@/types";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/** A label the person just typed, shown before the log has answered. */
export type PendingLabel = { key: string; state: "pending" | "failed" };

export type Knowledge = {
  structure: KnowledgeStructureFragment | null;
  /** The ENTITY instances this datum is evidence for — its labels. */
  labels: KnowledgeInstanceFragment[];
  pending: PendingLabel[];
  metrics: KnowledgeStructureFragment["metrics"];
  loading: boolean;
  /** Nobody has claimed anything about this datum: an ordinary, empty state. */
  notKnownYet: boolean;
  /** The read itself failed (network, auth, a fault elsewhere in the query). */
  failed: boolean;
  errorMessage: string | null;
  claim: (term: string) => Promise<void>;
  refetch: () => Promise<unknown>;
};

/**
 * Everything the Knowledge sidebar knows about a datum, read on mount — no
 * write happens from viewing. Labelling is one call: `claim(word)` shows the
 * chip at once and lets the refetch confirm it; only a failure gets a toast,
 * since the chip appearing *is* the success signal.
 */
export const useKnowledge = (identifier: Identifier, object: Object): Knowledge => {
  const { data, error, loading, refetch } = useKnowledgeForStructureQuery({
    variables: { identifier, object: object.id },
    // A datum nobody has claimed about answers with an error on the root
    // field (the backend has not made it nullable yet); `all` keeps that from
    // masquerading as a failed read. See `kraph/lib/knowledgeErrors.ts`.
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
  });

  const structure = data?.structureByIdentifier ?? null;
  const notKnownYet = !structure && !loading && isNotKnownYet(error);
  const failed = !structure && !loading && !!error && !notKnownYet;

  const [pending, setPending] = useState<PendingLabel[]>([]);
  const [assertEntity] = useAssertEntityExistsMutation();

  const labels =
    structure?.informs.filter((instance) => instance.kind === InstanceKind.Entity) ?? [];

  const claim = useCallback(
    async (term: string) => {
      const key = term.trim();
      if (!key) return;
      setPending((current) => [
        ...current.filter((label) => label.key !== key),
        { key, state: "pending" },
      ]);
      try {
        await assertEntity({
          variables: {
            input: {
              term: key,
              supportingEvidence: [{ identifier, object: object.id }],
            },
          },
        });
        await refetch();
        setPending((current) => current.filter((label) => label.key !== key));
      } catch (e) {
        setPending((current) =>
          current.map((label) =>
            label.key === key ? { ...label, state: "failed" } : label,
          ),
        );
        toast.error(`Could not claim “${key}”: ${(e as Error).message}`);
      }
    },
    [assertEntity, identifier, object.id, refetch],
  );

  return {
    structure,
    labels,
    pending,
    metrics: structure?.metrics ?? [],
    loading: loading && !structure,
    notKnownYet,
    failed,
    errorMessage: failed ? (error?.message ?? "Could not read") : null,
    claim,
    refetch,
  };
};

import type { ApolloClient, NormalizedCacheObject, TypedDocumentNode } from "@apollo/client";
import {
  PreflightDeleteAnnotationCollectionDocument,
  PreflightDeleteAnnotationDocument,
  PreflightDeleteArrayDatasetDocument,
  PreflightDeleteFileDocument,
  PreflightDeleteFixtureDocument,
  PreflightDeleteMeshCollectionDocument,
  PreflightDeleteNetworkCollectionDocument,
  PreflightDeleteSparseDatasetDocument,
  PreflightDeleteTableDatasetDocument,
  type DeletePreflightFragment,
} from "@/mikro/api/graphql";
import type { DeletePreflightSummary } from "@/core/smart/localactions/builders/deleteAction";
import { KIND_LABEL } from "@/mikro/components/lineage/lineageGraph";

/**
 * Ask before every delete what it would cost (`preflightDelete<Model>`): mikro
 * refuses to delete anything something was made from unless the delete says
 * `cascade`, so the UI asks first, lists what would go with it, and only then
 * sends the delete — with `cascade: true` when there is anything to take along.
 */

export type PreflightKind =
  | "ArrayDataset"
  | "TableDataset"
  | "SparseDataset"
  | "MeshCollection"
  | "NetworkCollection"
  | "AnnotationCollection"
  | "Fixture"
  | "File"
  | "Annotation";

type AnyPreflightQuery = TypedDocumentNode<Record<string, DeletePreflightFragment>, { id: string }>;

const QUERIES: Record<PreflightKind, { document: AnyPreflightQuery; field: string }> = {
  ArrayDataset: { document: PreflightDeleteArrayDatasetDocument as AnyPreflightQuery, field: "preflightDeleteArrayDataset" },
  TableDataset: { document: PreflightDeleteTableDatasetDocument as AnyPreflightQuery, field: "preflightDeleteTableDataset" },
  SparseDataset: { document: PreflightDeleteSparseDatasetDocument as AnyPreflightQuery, field: "preflightDeleteSparseDataset" },
  MeshCollection: { document: PreflightDeleteMeshCollectionDocument as AnyPreflightQuery, field: "preflightDeleteMeshCollection" },
  NetworkCollection: { document: PreflightDeleteNetworkCollectionDocument as AnyPreflightQuery, field: "preflightDeleteNetworkCollection" },
  AnnotationCollection: { document: PreflightDeleteAnnotationCollectionDocument as AnyPreflightQuery, field: "preflightDeleteAnnotationCollection" },
  Fixture: { document: PreflightDeleteFixtureDocument as AnyPreflightQuery, field: "preflightDeleteFixture" },
  File: { document: PreflightDeleteFileDocument as AnyPreflightQuery, field: "preflightDeleteFile" },
  Annotation: { document: PreflightDeleteAnnotationDocument as AnyPreflightQuery, field: "preflightDeleteAnnotation" },
};

/** One object's preflight, always fresh: what was made from it changes under us. */
export async function preflightDelete(
  client: ApolloClient<NormalizedCacheObject> | ApolloClient<unknown>,
  kind: PreflightKind,
  id: string,
): Promise<DeletePreflightFragment> {
  const { document, field } = QUERIES[kind];
  const { data } = await (client as ApolloClient<unknown>).query({ query: document, variables: { id }, fetchPolicy: "network-only" });
  return data[field];
}

/** The node key the server's lineage walk gives an object, for telling targets from casualties. */
const keyOf = (preflight: DeletePreflightFragment) => preflight.target;

/**
 * Several preflights (a multi-select) as one answer. A target that is itself
 * a casualty of another target is not deleted on its own (`skipIds`): the
 * other's cascade takes it, and its own delete would find nothing.
 */
export function summarizePreflights(
  entries: readonly { id: string; preflight: DeletePreflightFragment }[],
  shown = 5,
): DeletePreflightSummary {
  const targetKeys = new Set(entries.map((entry) => keyOf(entry.preflight)));
  const casualties = new Map<string, DeletePreflightFragment["casualties"][number]>();
  const counts = new Map<string, number>();
  const blockers: string[] = [];
  let truncated = false;
  for (const { preflight } of entries) {
    truncated ||= preflight.truncated;
    for (const casualty of preflight.casualties) if (!casualties.has(casualty.key)) casualties.set(casualty.key, casualty);
    for (const blocker of preflight.blockers) blockers.push(blocker.reason);
    for (const { label, count } of preflight.cascadeCounts) counts.set(label, (counts.get(label) ?? 0) + count);
  }
  const outside = [...casualties.values()].filter((casualty) => !targetKeys.has(casualty.key));
  const skipIds = entries.filter((entry) => casualties.has(keyOf(entry.preflight))).map((entry) => entry.id);

  const named = outside.slice(0, shown).map((casualty) => `${casualty.name || casualty.id} (${KIND_LABEL[casualty.kind].toLowerCase()})`);
  const more = outside.length > shown ? ` and ${outside.length - shown} more` : "";
  const alsoGoes = [...counts.entries()].map(([label, count]) => `${count} ${label}${count === 1 ? "" : "s"}`);
  const description =
    outside.length === 0
      ? ""
      : `This also deletes ${outside.length} thing${outside.length === 1 ? "" : "s"} made from it: ${named.join(", ")}${more}.` +
        (alsoGoes.length > 0 ? ` With them go ${alsoGoes.join(", ")}.` : "");

  return {
    blockers: [...new Set(blockers)],
    casualtyCount: outside.length,
    description,
    truncated,
    skipIds,
    casualtyKeys: outside.map((casualty) => casualty.key),
  };
}

/** Preflight every target of one kind and summarise. */
export async function preflightDeletes(
  client: ApolloClient<NormalizedCacheObject> | ApolloClient<unknown>,
  kind: PreflightKind,
  ids: readonly string[],
): Promise<DeletePreflightSummary> {
  const entries = await Promise.all(ids.map(async (id) => ({ id, preflight: await preflightDelete(client, kind, id) })));
  return summarizePreflights(entries);
}

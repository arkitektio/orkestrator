import type { ApolloClient, NormalizedCacheObject, TypedDocumentNode } from "@apollo/client";
import { Kind, type DocumentNode, type FieldNode, type OperationDefinitionNode, type VariableDefinitionNode } from "graphql";
import {
  PreflightDeleteAnnotationCollectionDocument,
  PreflightDeleteAnnotationDocument,
  PreflightDeleteArrayDatasetDocument,
  PreflightDeleteDerivedDocument,
  PreflightDeleteFileDocument,
  PreflightDeleteFixtureDocument,
  PreflightDeleteMeshCollectionDocument,
  PreflightDeleteNetworkCollectionDocument,
  PreflightDeleteSparseDatasetDocument,
  PreflightDeleteTableDatasetDocument,
  type LineageNodeKind,
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
  /** "also": the targets go and these with them; "derived": the targets stay and only these go. */
  wording: "also" | "derived" = "also",
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
      : `${wording === "derived" ? "Deletes" : "This also deletes"} ${outside.length} thing${outside.length === 1 ? "" : "s"} made from it: ${named.join(", ")}${more}.` +
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

/** How many targets one batched request asks about. */
export const PREFLIGHT_BATCH = 50;

/**
 * One request asking a one-target preflight query of many targets: its field
 * repeated under an alias per target (`t0`, `t1`, ...), each with its own `$id`
 * (`$id0`, `$id1`, ...); every other variable (`$kind`) is shared. Built from
 * the generated document, so the selection is exactly the one-target query's.
 * A multi-select delete used to send one request per target.
 */
export const batchedPreflightDocument = (document: DocumentNode, count: number): DocumentNode => {
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (!operation) throw new Error("A preflight document without an operation");
  const field = operation.selectionSet.selections.find((selection): selection is FieldNode => selection.kind === Kind.FIELD);
  if (!field) throw new Error("A preflight document without a field");
  const shared = (operation.variableDefinitions ?? []).filter((definition) => definition.variable.name.value !== "id");
  const idDefinition = (operation.variableDefinitions ?? []).find((definition) => definition.variable.name.value === "id");
  if (!idDefinition) throw new Error("A preflight document without an $id");
  const ids: VariableDefinitionNode[] = Array.from({ length: count }, (_, index) => ({
    ...idDefinition,
    variable: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: `id${index}` } },
  }));
  const fields: FieldNode[] = Array.from({ length: count }, (_, index) => ({
    ...field,
    alias: { kind: Kind.NAME, value: `t${index}` },
    arguments: (field.arguments ?? []).map((argument) =>
      argument.value.kind === Kind.VARIABLE && argument.value.name.value === "id"
        ? { ...argument, value: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: `id${index}` } } }
        : argument,
    ),
  }));
  return {
    ...document,
    definitions: [
      {
        ...operation,
        name: { kind: Kind.NAME, value: `${operation.name?.value ?? "Preflight"}Batch${count}` },
        variableDefinitions: [...shared, ...ids],
        selectionSet: { ...operation.selectionSet, selections: fields },
      },
      ...document.definitions.filter((definition) => definition !== operation),
    ],
  };
};

/** Every target's preflight, `PREFLIGHT_BATCH` targets a request, always fresh. */
const batchedPreflights = async (
  client: ApolloClient<NormalizedCacheObject> | ApolloClient<unknown>,
  document: DocumentNode,
  ids: readonly string[],
  shared: Record<string, unknown> = {},
): Promise<{ id: string; preflight: DeletePreflightFragment }[]> => {
  const chunks: string[][] = [];
  for (let start = 0; start < ids.length; start += PREFLIGHT_BATCH) chunks.push(ids.slice(start, start + PREFLIGHT_BATCH));
  const answers = await Promise.all(
    chunks.map(async (chunk) => {
      const variables = { ...shared, ...Object.fromEntries(chunk.map((id, index) => [`id${index}`, id])) };
      const { data } = await (client as ApolloClient<unknown>).query<Record<string, DeletePreflightFragment>>({
        query: batchedPreflightDocument(document, chunk.length),
        variables,
        fetchPolicy: "network-only",
      });
      return chunk.map((id, index) => ({ id, preflight: data[`t${index}`] }));
    }),
  );
  return answers.flat();
};

/** Preflight every target of one kind and summarise. */
export async function preflightDeletes(
  client: ApolloClient<NormalizedCacheObject> | ApolloClient<unknown>,
  kind: PreflightKind,
  ids: readonly string[],
): Promise<DeletePreflightSummary> {
  return summarizePreflights(await batchedPreflights(client, QUERIES[kind].document, ids));
}

/**
 * What `deleteDerived` would delete for each target (the target itself kept):
 * the same summary, worded for what stays. A target made from another target
 * is in `skipIds` -- deleting the other's derived data would delete it.
 */
export async function preflightDeleteDerived(
  client: ApolloClient<NormalizedCacheObject> | ApolloClient<unknown>,
  kind: LineageNodeKind,
  ids: readonly string[],
): Promise<DeletePreflightSummary> {
  const entries = await batchedPreflights(client, PreflightDeleteDerivedDocument, ids, { kind });
  return summarizePreflights(entries, 5, "derived");
}

/**
 * The cache `__typename` behind each key prefix the server answers with
 * (`<kind>:<id>`, mikro's internal kind names -- not the enum's), to evict
 * what a delete took.
 */
const TYPENAME_BY_KEY_KIND: Record<string, string> = {
  dataset: "ArrayDataset",
  tabledataset: "TableDataset",
  sparsedataset: "SparseDataset",
  meshcollection: "MeshCollection",
  networkcollection: "NetworkCollection",
  annotationcollection: "AnnotationCollection",
  fixture: "Fixture",
  file: "File",
  annotation: "Annotation",
};

/** A `<kind>:<id>` key as the server answers it, as the cache id of that row. */
export const cacheIdOfKey = (key: string): { __typename: string; id: string } | null => {
  const at = key.indexOf(":");
  const typename = at > 0 ? TYPENAME_BY_KEY_KIND[key.slice(0, at)] : undefined;
  return typename ? { __typename: typename, id: key.slice(at + 1) } : null;
};

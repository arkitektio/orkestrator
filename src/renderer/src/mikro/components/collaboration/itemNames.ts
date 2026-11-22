import type {
  CollaborationItemNamesQuery,
  CollaborationItemNamesQueryVariables,
  CollaborationItemFragment,
} from "@/mikro/api/graphql";
import { describeLens } from "@/mikro/lenses";

/**
 * What a page of collaboration items is called, asked once per kind
 * (`CollaborationItemNames`) instead of once per row: a row used to be a
 * display widget, and every widget ran its own detail query.
 */

type Kind = keyof typeof LIST_OF;

/** The structure identifier, by the list of `CollaborationItemNames` that names it. */
const LIST_OF = {
  datasets: ["@mikro/arraydataset"],
  tables: ["@mikro/tabledataset"],
  sparse: ["@mikro/sparsedataset"],
  files: ["@mikro/file"],
  folders: ["@mikro/folder"],
  scenes: ["@mikro/scene"],
  charts: ["@mikro/chart"],
  grids: ["@mikro/grid"],
  meshes: ["@mikro/meshcollection"],
  fixtures: ["@mikro/fixture"],
  lenses: [
    "@mikro/arraylens",
    "@mikro/tablelens",
    "@mikro/sparselens",
    "@mikro/meshlens",
    "@mikro/networklens",
    "@mikro/annotationlens",
    "@mikro/fixturelens",
  ],
  annotations: ["@mikro/annotation"],
} as const;

const KIND_OF = new Map<string, Kind>(
  (Object.entries(LIST_OF) as [Kind, readonly string[]][]).flatMap(([kind, identifiers]) =>
    identifiers.map((identifier) => [identifier, kind] as const),
  ),
);

const HAS: Record<Kind, keyof CollaborationItemNamesQueryVariables> = {
  datasets: "hasDatasets",
  tables: "hasTables",
  sparse: "hasSparse",
  files: "hasFiles",
  folders: "hasFolders",
  scenes: "hasScenes",
  charts: "hasCharts",
  grids: "hasGrids",
  meshes: "hasMeshes",
  fixtures: "hasFixtures",
  lenses: "hasLenses",
  annotations: "hasAnnotations",
};

/** Whether a row of this identifier is named by `CollaborationItemNames` (else it keeps its display widget). */
export const isNameable = (identifier: string | null | undefined): boolean =>
  identifier != null && KIND_OF.has(identifier);

/** The variables naming one page of items: each kind's ids, and which lists to ask at all. */
export const itemNameVariables = (
  items: readonly Pick<CollaborationItemFragment, "identifier" | "objectId">[],
): CollaborationItemNamesQueryVariables => {
  const ids = Object.fromEntries((Object.keys(LIST_OF) as Kind[]).map((kind) => [kind, [] as string[]])) as Record<
    Kind,
    string[]
  >;
  for (const item of items) {
    const kind = item.identifier ? KIND_OF.get(item.identifier) : undefined;
    if (kind && !ids[kind].includes(item.objectId)) ids[kind].push(item.objectId);
  }
  const limit = Math.max(1, ...Object.values(ids).map((list) => list.length));
  const has = Object.fromEntries((Object.keys(HAS) as Kind[]).map((kind) => [HAS[kind], ids[kind].length > 0]));
  return { ...ids, ...has, limit } as CollaborationItemNamesQueryVariables;
};

/** What the answer calls each object, keyed `<identifier kind>:<id>`. */
export const itemNamesFrom = (data: CollaborationItemNamesQuery | undefined): Map<string, string> => {
  const names = new Map<string, string>();
  if (!data) return names;
  const put = (kind: Kind, id: string, name: string | null | undefined) => {
    if (name?.trim()) names.set(`${kind}:${id}`, name);
  };
  for (const row of data.arrayDatasets ?? []) put("datasets", row.id, row.name);
  for (const row of data.tableDatasets ?? []) put("tables", row.id, row.name);
  for (const row of data.sparseDatasets ?? []) put("sparse", row.id, row.name);
  for (const row of data.files ?? []) put("files", row.id, row.name);
  for (const row of data.folders ?? []) put("folders", row.id, row.name);
  for (const row of data.scenes ?? []) put("scenes", row.id, row.name);
  for (const row of data.charts ?? []) put("charts", row.id, row.name);
  for (const row of data.grids ?? []) put("grids", row.id, row.name);
  for (const row of data.meshCollections ?? []) put("meshes", row.id, row.label || row.name);
  for (const row of data.fixtures ?? []) put("fixtures", row.id, row.label || row.name);
  for (const row of data.lenses ?? []) {
    const { title, container } = describeLens(row);
    put("lenses", row.id, `${title} · ${container.name}`);
  }
  for (const row of data.annotations ?? []) put("annotations", row.id, row.name || `${row.kind.toLowerCase()} annotation`);
  return names;
};

/** The name of one item, once its page's names have come; undefined until then, or when it is gone. */
export const itemName = (
  names: ReadonlyMap<string, string>,
  item: Pick<CollaborationItemFragment, "identifier" | "objectId">,
): string | undefined => {
  const kind = item.identifier ? KIND_OF.get(item.identifier) : undefined;
  return kind ? names.get(`${kind}:${item.objectId}`) : undefined;
};

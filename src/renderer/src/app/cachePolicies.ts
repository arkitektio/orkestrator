import type { TypePolicies } from "@apollo/client";
import {
  buildOffsetPaginationPolicies,
  portsByKeyPolicy,
  type PaginatedFieldMap,
} from "@/lib/arkitekt/builders/cachePolicies";

/**
 * Root `Query` fields that take a `pagination` argument, per service, mapped
 * to the arguments that identify the list (every argument EXCEPT
 * `pagination`). See `lib/arkitekt/builders/cachePolicies.ts` for what the
 * policies do and why.
 *
 * Enumerated from `graphql/schemas/<service>.graphql`. After re-pulling a
 * schema, regenerate the map for it with (from the repo root):
 *
 *   python3 - <<'EOF'
 *   import re; s = open("graphql/schemas/rekuest.graphql").read()
 *   body = re.search(r'^type Query\s*\{(.*?)^\}', s, re.S | re.M).group(1)
 *   body = re.sub(r'"""[\s\S]*?"""|"[^"\n]*"', "", body)
 *   for m in re.finditer(r'(\w+)\s*\(([^)]*)\)\s*:', body):
 *       args = re.findall(r'(\w+)\s*:', m.group(2))
 *       if "pagination" in args:
 *           print(f'  {m.group(1)}: {[a for a in args if a != "pagination"]},')
 *   EOF
 *
 * `omero_ark` and `dokuments` have no schema under `graphql/schemas/`, so they
 * keep Apollo's default (whole-argument) keying.
 */

/** `alpaka.graphql` */
export const ALPAKA_PAGINATED_FIELDS: PaginatedFieldMap = {
  chromaCollections: ["filters", "ordering"],
  defaultUses: ["filters", "ordering"],
  llmModels: ["filters", "ordering"],
  messages: ["filters", "ordering"],
  providers: ["filters", "ordering"],
  rooms: ["filters", "ordering"],
};

/** `elektro.graphql` */
export const ELEKTRO_PAGINATED_FIELDS: PaginatedFieldMap = {
  annotationCollections: ["filters", "ordering"],
  annotations: ["filters", "ordering"],
  arrayDatasets: ["filters", "ordering"],
  children: ["filters", "order", "parent"],
  coordinateAnchors: ["filters"],
  coordinateSystems: ["filters", "ordering"],
  dataArrays: ["filters", "ordering"],
  experiments: ["filters", "ordering"],
  fileLinks: ["filters", "ordering"],
  files: ["filters", "ordering"],
  folders: ["filters", "ordering"],
  layers: ["filters"],
  lenses: ["filters", "ordering"],
  mechanisms: ["filters", "ordering"],
  modEnvironments: ["filters", "ordering"],
  modelCollections: ["filters", "ordering"],
  modelWorkspaces: ["filters", "ordering"],
  myfiles: ["filters", "ordering"],
  myfolders: ["filters", "ordering"],
  neuronModels: ["filters", "ordering"],
  sparseDatasets: ["filters", "ordering"],
  tableDatasets: ["filters", "ordering"],
  workspaceMappings: ["filters", "ordering"],
};

/** `fluss.graphql` */
export const FLUSS_PAGINATED_FIELDS: PaginatedFieldMap = {
  flows: ["filters", "ordering"],
  reactiveTemplates: ["filters", "ordering"],
  runs: ["filters", "ordering"],
  snapshots: ["filters", "ordering"],
  workspaces: ["filters", "ordering"],
};

/** `kabinet.graphql` */
export const KABINET_PAGINATED_FIELDS: PaginatedFieldMap = {
  backends: ["filters", "ordering"],
  definitions: ["filters", "ordering"],
  deployments: ["filters", "ordering"],
  flavours: ["filters", "ordering"],
  githubRepos: ["filters", "ordering"],
  pods: ["filters", "ordering"],
  releases: ["filters", "ordering"],
  resources: ["filters", "ordering"],
};

/** `kraph.graphql` */
export const KRAPH_PAGINATED_FIELDS: PaginatedFieldMap = {
  entities: ["entityCategoryId", "filters", "ordering"],
  entityCategories: ["filters", "ordering"],
  graphTableQueries: ["filters", "ordering"],
  graphs: ["filters", "ordering"],
  inputParticipations: ["filters", "graph", "ordering"],
  measurementCategories: ["filters", "ordering"],
  measurements: ["filters", "measurementCategoryId", "ordering"],
  metricKinds: ["filters"],
  naturalEventCategories: ["filters", "ordering"],
  naturalEvents: ["filters", "naturalEventCategoryId", "ordering"],
  nodes: ["filters", "graph", "ordering"],
  outputParticipations: ["filters", "graph", "ordering"],
  protocolEventCategories: ["filters", "ordering"],
  protocolEvents: ["filters", "ordering", "protocolEventCategoryId"],
  relationCategories: ["filters", "ordering"],
  relations: ["filters", "ordering", "relationCategoryId"],
  renderGraphTable: ["filters", "order", "query"],
  scatterPlots: ["filters", "ordering"],
  structureKinds: ["filters"],
  structureRelationCategories: ["filters", "ordering"],
  structureRelations: ["filters", "ordering", "structureRelationCategoryId"],
  structures: ["filters", "ordering", "structureKindId"],
  terms: ["filters"],
};

/** `lok-next.graphql` */
export const LOK_PAGINATED_FIELDS: PaginatedFieldMap = {
  apps: ["filters", "ordering"],
  clients: ["filters", "ordering"],
  deviceGroups: ["filters", "ordering"],
  devices: ["filters", "ordering"],
  groups: ["filters", "ordering"],
  invites: ["filters", "ordering"],
  layers: ["filters", "ordering"],
  organizations: ["filters", "ordering"],
  redeemTokens: ["filters", "ordering"],
  roles: ["filters", "ordering"],
  serviceInstances: ["filters", "ordering"],
  serviceReleases: ["filters", "ordering"],
  services: ["filters", "ordering"],
  users: ["filters", "ordering"],
};

/** `lovekit.graphql` */
export const LOVEKIT_PAGINATED_FIELDS: PaginatedFieldMap = {
  collaborativeBroadcasts: ["filters"],
  soloBroadcasts: ["filters"],
  streams: ["filters"],
};

/** `mikro.graphql` */
export const MIKRO_PAGINATED_FIELDS: PaginatedFieldMap = {
  animations: ["filters", "ordering"],
  annotationCollections: ["filters", "ordering"],
  annotations: ["filters", "ordering"],
  arrayDatasets: ["filters", "ordering"],
  children: ["filters", "order", "parent"],
  colorByOptions: ["filters", "maxJoinDepth", "meshCollection"],
  coordinateSystems: ["filters", "ordering"],
  dataArrays: ["filters", "ordering"],
  files: ["filters", "ordering"],
  filterByOptions: ["filters", "maxJoinDepth", "meshCollection"],
  folders: ["filters", "ordering"],
  labelColorByOptions: ["filters", "lens", "maxJoinDepth"],
  labelFilterByOptions: ["filters", "lens", "maxJoinDepth"],
  layers: ["filters", "ordering"],
  lenses: ["filters", "ordering"],
  meshCollections: ["filters"],
  myfiles: ["filters", "ordering"],
  myfolders: ["filters", "ordering"],
  networkCollections: ["filters"],
  networkColorByOptions: ["filters", "maxJoinDepth", "networkCollection"],
  networkFilterByOptions: ["filters", "maxJoinDepth", "networkCollection"],
  sceneSnapshots: ["filters", "ordering"],
  scenes: ["filters", "ordering"],
  sparseDatasets: ["filters", "ordering"],
  tableDatasets: ["filters", "ordering"],
  tasks: ["filters", "ordering"],
  transformations: ["filters", "ordering"],
};

/** `rekuest.graphql` */
export const REKUEST_PAGINATED_FIELDS: PaginatedFieldMap = {
  actions: ["filters", "ordering"],
  agents: ["filters", "ordering"],
  clients: ["filters", "ordering"],
  hardwareRecords: ["filters"],
  implementations: ["filters", "ordering"],
  materializedBloks: ["filters", "ordering"],
  memoryDrawers: ["filters"],
  memoryShelves: ["filters", "ordering"],
  placements: ["filters", "ordering"],
  protocols: ["filters", "ordering"],
  resolutions: ["filters"],
  sessions: ["filters", "ordering"],
  shortcuts: ["filters", "ordering"],
  spaces: ["filters", "ordering"],
  tasks: ["filters", "ordering"],
  testCases: ["filters"],
  testResults: ["filters"],
  threedModels: ["filters", "ordering"],
  toolboxes: ["filters", "ordering"],
};

export const ALPAKA_TYPE_POLICIES = buildOffsetPaginationPolicies(ALPAKA_PAGINATED_FIELDS);
/**
 * A neuron model's cells and sections carry the id from the model's config,
 * which is unique only WITHIN a model — every model has a `soma`. Keyed on
 * that, Apollo merged one model's sections into another's. `compoundId`
 * (`model:cell[:section]`) is the global one. An object fetched without it (a
 * selection that doesn't ask for it) is left un-normalized — embedded in its
 * parent — rather than merged under a key it doesn't have.
 */
export const compoundKey = (object: Readonly<Record<string, unknown>>): string | false =>
  typeof object.compoundId === "string" && object.compoundId.length > 0
    ? `${String(object.__typename)}:${object.compoundId}`
    : false;

export const ELEKTRO_TYPE_POLICIES: TypePolicies = {
  ...buildOffsetPaginationPolicies(ELEKTRO_PAGINATED_FIELDS),
  Cell: { keyFields: compoundKey },
  Section: { keyFields: compoundKey },
};
export const FLUSS_TYPE_POLICIES = buildOffsetPaginationPolicies(FLUSS_PAGINATED_FIELDS);
export const KABINET_TYPE_POLICIES = buildOffsetPaginationPolicies(KABINET_PAGINATED_FIELDS);
export const KRAPH_TYPE_POLICIES = buildOffsetPaginationPolicies(KRAPH_PAGINATED_FIELDS);
export const LOK_TYPE_POLICIES = buildOffsetPaginationPolicies(LOK_PAGINATED_FIELDS);
export const LOVEKIT_TYPE_POLICIES = buildOffsetPaginationPolicies(LOVEKIT_PAGINATED_FIELDS);
export const MIKRO_TYPE_POLICIES = buildOffsetPaginationPolicies(MIKRO_PAGINATED_FIELDS);
export const REKUEST_TYPE_POLICIES: TypePolicies = {
  ...buildOffsetPaginationPolicies(REKUEST_PAGINATED_FIELDS),
  // Ports are embedded (no id): the slim `LiveTask` selection of `Action.args`
  // must not wipe the full `...Ports` a detail view holds on the same
  // `Action:<id>` — merge by `key` instead (see `portsByKeyPolicy`).
  Action: {
    fields: {
      args: portsByKeyPolicy,
      returns: portsByKeyPolicy,
    },
  },
};

import type { FieldPolicy, StoreObject, TypePolicies } from "@apollo/client";
import {
  buildOffsetPaginationPolicies,
  mergeOffsetPage,
  offsetPaginationPolicy,
  portsByKeyPolicy,
  type PaginatedFieldMap,
} from "@/core/connection/arkitekt/builders/cachePolicies";

/**
 * The most rows a strawberry_django service returns for one page
 * (`PAGINATION_MAX_LIMIT`, 100 by default and not raised by any service). A
 * larger `limit` is cut to it without a word.
 */
export const SERVER_PAGE_CAP = 100;

type PageArgs = { pagination?: { offset?: number | null; limit?: number | null } | null } | null | undefined;

/** The page as the server answers it: a `limit` past the cap is the cap. */
const cappedArgs = (args: PageArgs): PageArgs => {
  const limit = args?.pagination?.limit;
  if (typeof limit !== "number" || limit <= SERVER_PAGE_CAP) return args;
  return { ...args, pagination: { ...args?.pagination, limit: SERVER_PAGE_CAP } };
};

/**
 * `offsetPaginationPolicy` for a service that caps pages: a window refetched
 * whole (a `refetchQueries`, a reconnect) that comes back at the cap is a
 * full page, not the end of the list, so the rows after it that "Show more"
 * fetched stay in the window.
 */
export const cappedOffsetPaginationPolicy = (keyArgs: readonly string[]): FieldPolicy<unknown[]> => ({
  ...offsetPaginationPolicy(keyArgs),
  merge: (existing, incoming, { args }) => mergeOffsetPage(existing, incoming ?? [], cappedArgs(args as PageArgs)),
});

/**
 * A collaboration is named by its key everywhere: one across all of the organization's
 * services, and what every lookup takes. lok and mikro select it as `id: key` (lok keeps its
 * own id as `lokId`), so the stored `key` names the entry; a bare `{ __typename, id }` (an
 * evict by a smart object's id, which is the key) lands on the same one.
 */
export const collaborationKey = (object: Readonly<StoreObject>): string | false => {
  const key = object.key ?? object.id;
  return typeof key === "string" && key.length > 0 ? `Collaboration:${key}` : false;
};

/** `buildOffsetPaginationPolicies` with `cappedOffsetPaginationPolicy`. */
export const buildCappedOffsetPaginationPolicies = (fields: PaginatedFieldMap): TypePolicies => ({
  Query: {
    fields: Object.fromEntries(Object.entries(fields).map(([name, keyArgs]) => [name, cappedOffsetPaginationPolicy(keyArgs)])),
  },
});

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
 *   for m in re.finditer(r'(\w+)\s*\(([^)]*)\)\s*:\s*(\[?)', body):
 *       args = re.findall(r'(\w+)\s*:', m.group(2))
 *       # Lists only: a field that pages inside ONE object (kraph's
 *       # `renderGraphTable`) must keep Apollo's default keying.
 *       if "pagination" in args and m.group(3):
 *           print(f'  {m.group(1)}: {[a for a in args if a != "pagination"]},')
 *   EOF
 *
 * `omero_ark` and `dokuments` have no schema under `graphql/schemas/`, so they
 * keep Apollo's default (whole-argument) keying.
 */

/** `alpaka.graphql` */
export const ALPAKA_PAGINATED_FIELDS: PaginatedFieldMap = {
  budgets: ["filters", "ordering"],
  chromaCollections: ["filters", "ordering"],
  defaultUses: ["filters", "ordering"],
  llmModels: ["filters", "ordering"],
  memories: ["filters", "ordering"],
  messages: ["filters", "ordering"],
  providers: ["filters", "ordering"],
  rooms: ["filters", "ordering"],
  usageRecords: ["filters", "ordering"],
};

/** `bank.graphql` */
export const BANK_PAGINATED_FIELDS: PaginatedFieldMap = {
  bankAccounts: ["filters", "ordering"],
  bankConnections: ["filters"],
  budgets: ["filters", "ordering"],
  categories: ["filters", "ordering"],
  categoryRules: ["filters"],
  recurringPayments: ["filters", "ordering"],
  transactions: ["filters", "ordering"],
};

/** `lokate.graphql` */
export const LOKATE_PAGINATED_FIELDS: PaginatedFieldMap = {
  devices: ["filters", "ordering"],
  places: ["filters", "ordering"],
  points: ["filters", "ordering"],
  trips: ["filters", "ordering"],
  visits: ["filters", "ordering"],
};

/** `kuvert.graphql` */
export const KUVERT_PAGINATED_FIELDS: PaginatedFieldMap = {
  categories: ["filters"],
  mailAccounts: ["filters"],
  mailChanges: ["filters"],
  mailFolders: ["filters"],
  mailProviders: ["filters"],
  messages: ["filters", "ordering"],
  outbox: ["filters"],
  taskLists: ["filters"],
  tasks: ["filters", "ordering"],
  threads: ["filters", "ordering"],
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
  // Not `renderGraphTable`, though it takes `pagination`: it answers one object
  // (rows and columns), not a list, so an offset merge stored a page as `[]` and
  // threw on an unpaged render. Apollo's default keying (every argument) is right.
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
  bugReports: ["filters", "ordering"],
  clients: ["filters", "ordering"],
  collaborations: ["filters"],
  deviceGroups: ["filters", "ordering"],
  devices: ["filters", "ordering"],
  groups: ["filters", "ordering"],
  hubs: ["filters", "ordering"],
  invites: ["filters", "ordering"],
  layers: ["filters", "ordering"],
  mandates: ["filters", "ordering"],
  membershipRequests: ["filters", "ordering"],
  organizations: ["filters", "ordering"],
  releases: ["filters", "ordering"],
  roles: ["filters", "ordering"],
  serviceInstances: ["filters", "ordering"],
  serviceReleases: ["filters", "ordering"],
  services: ["filters", "ordering"],
  users: ["filters", "ordering"],
};

/** `lovekit.graphql` */
export const LOVEKIT_PAGINATED_FIELDS: PaginatedFieldMap = {
  agents: ["filters"],
  calls: ["filters", "order"],
  streams: ["filters", "order"],
};

/** `mikro.graphql` */
export const MIKRO_PAGINATED_FIELDS: PaginatedFieldMap = {
  animations: ["filters", "ordering"],
  annotationCollections: ["filters", "ordering"],
  annotations: ["filters", "ordering"],
  arrayDatasets: ["filters", "ordering"],
  chartLayers: ["filters", "ordering"],
  charts: ["filters", "ordering"],
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
  bloks: ["filters"],
  clients: ["filters", "ordering"],
  dashboards: [],
  firings: ["filters", "ordering"],
  implementations: ["filters", "ordering"],
  interfaces: ["search"],
  materializedBloks: ["filters", "ordering"],
  memoryDrawers: ["filters"],
  memoryShelves: ["filters", "ordering"],
  placements: ["filters", "ordering"],
  protocols: ["filters", "ordering"],
  resolutions: ["filters"],
  schedules: ["filters", "ordering"],
  sessions: ["filters", "ordering"],
  shortcuts: ["filters", "ordering"],
  signals: ["filters", "ordering"],
  spaces: ["filters", "ordering"],
  structurePackages: ["search"],
  structures: ["search"],
  tasks: ["filters", "ordering"],
  testCases: ["filters"],
  testResults: ["filters"],
  toolboxes: ["filters", "ordering"],
  triggers: ["filters", "ordering"],
  wiregrams: [],
};

export const ALPAKA_TYPE_POLICIES = buildCappedOffsetPaginationPolicies(ALPAKA_PAGINATED_FIELDS);
export const BANK_TYPE_POLICIES = buildOffsetPaginationPolicies(BANK_PAGINATED_FIELDS);
export const KUVERT_TYPE_POLICIES = buildCappedOffsetPaginationPolicies(KUVERT_PAGINATED_FIELDS);
export const LOKATE_TYPE_POLICIES = buildOffsetPaginationPolicies(LOKATE_PAGINATED_FIELDS);
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
const lokPagination = buildCappedOffsetPaginationPolicies(LOK_PAGINATED_FIELDS);
/**
 * `user(id)` answers from the normalized `User:<id>` when it holds what the
 * query asks for: a user already known from a list, a chip batch
 * (`lok/lib/userChips.ts`) or another page is not fetched again.
 */
export const LOK_TYPE_POLICIES: TypePolicies = {
  ...lokPagination,
  Collaboration: { keyFields: collaborationKey },
  // The Team page pages one organization's members by role, a page at a time
  // ("Show more" fetches the next one): the same offset window as a root list.
  Organization: {
    fields: {
      memberships: cappedOffsetPaginationPolicy(["filters", "ordering"]),
    },
  },
  Query: {
    ...lokPagination.Query,
    fields: {
      ...lokPagination.Query?.fields,
      user: {
        read: (existing, { args, toReference }) =>
          existing ?? (args?.id ? toReference({ __typename: "User", id: args.id }) : undefined),
      },
    },
  },
};
export const LOVEKIT_TYPE_POLICIES = buildCappedOffsetPaginationPolicies(LOVEKIT_PAGINATED_FIELDS);
export const MIKRO_TYPE_POLICIES: TypePolicies = {
  ...buildOffsetPaginationPolicies(MIKRO_PAGINATED_FIELDS),
  // A lineage node's `id` is its object's id in ITS table, so `file:4` and
  // `dataset:4` would normalize to one `LineageNode:4`; and its `depth` and
  // `hasMore*` are relative to the walk's root, so a second walk would rewrite
  // the first's. Embedded in each answer instead (the node's `key` is what is
  // unique, and only within the graph the view merges).
  LineageNode: { keyFields: false },
  // The same for `roots`: `id` alone would merge a file and a dataset that
  // share one into a single `RootNode`, listing it twice. `key` is
  // `<kind>:<id>` and unique.
  RootNode: { keyFields: ["key"] },
  Collaboration: { keyFields: collaborationKey },
};
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

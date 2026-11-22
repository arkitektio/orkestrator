# Query audit (2026-11-22)

A read-only pass over every GraphQL operation the app sends (~790 queries, 40
subscriptions, ~1,000 fragments across 14 services), each checked against its
call sites and the published schema. **Client-only** means the schema already
offers what is needed; **server** means it needs a backend field or fix.
**Verified** marks findings re-checked by hand after the audit; the rest cite
file:line evidence but were not re-run.

Paths: `.graphql` under `graphql/<svc>/`, code under `src/renderer/src/`.

**Status (2026-11-22): implemented.** Every finding below was fixed on the
client and, where marked server, in the service (released: lokate, omero-ark,
elektro, kraph, rekuest, dokuments, kabinet, mikro, lok, kuvert, bank, alpaka).
Pages past 100 rows go through offset `fetchMore` with
`cappedOffsetPaginationPolicy` (`core/connection/graphql/cachePolicies.ts`).
Deliberately not done, with the reason:

- **elektro** scene annotations windowed by `intersects`: a rewrite of the
  renderer's per-collection annotation store, not a query change.
- **lokate** a stored point counter on `Device`: it would drift after a
  rollback; the detail pages no longer ask for the count at all.
- **mikro** a collaboration "contains" filter and `CollaborationItem` label:
  collaborations live in the shared `arkitekt-service` package (every service
  would take the release); the collaboration page names items with one batched
  query per kind meanwhile. `ArrayDataset.scenes` and the derived-lens list stay
  unpaged (no server argument; truncating would mislabel groups).
  `preflightDelete*(ids)`: client alias batching already makes it one request.
- **rekuest** `ListAction.implementations` stays (chat, kabinet and search read
  it); `OrgTasksUpdater` still refetches, now one page per list.
- **kabinet** logo-tree batching (each logo is fetched once anyway), per-status
  counts, and `pods(resource:)` on the resource page (it would keep a pod that
  moved to another resource).
- **fluss** a min/max field for snapshots (the range slider marks every one).
- **kuvert** `ids` filters for categories and folders (user-triggered,
  cache-first); the `CHANGE_VIEWS` refetch (its subscription is mounted only on
  the changes page).
- **bank** `previous` totals are still built (the server needs them for
  `changes`); `MerchantRule.transactionCount` still matches in Python.
- **lok** media access grants and mesh alias push (deferred, see
  `SERVER_SIDE_SUGGESTIONS.md`).

---

## Cross-cutting

1. **Every server caps a page at 100 rows** (strawberry_django defaults
   `PAGINATION_DEFAULT_LIMIT = PAGINATION_MAX_LIMIT = 100`, no override in any
   service; verified in rekuest, kuvert, lok). A query with no `pagination`
   argument is unlimited. Consequences:
   - "Load more" that grows `limit` from offset 0 stops at 100 and the button
     vanishes (or stays and does nothing): rekuest Automations / Signals /
     Firings, kuvert mail lists and tasks, lok TeamMembers and BugReports.
     **Verified** (rekuest).
   - Constants above 100 silently return 100: rekuest BindingClients (500),
     RoomHost scene bloks (500), ExportWiregram (200); kuvert ChangesPage (500),
     MoveMessages folders (500), task lists (200); lokate PlacesPage (500);
     fluss PythonFlows (200).
   - Fix (client-only): page by offset with `fetchMore` and the existing
     `mergeOffsetPage` policy; add the missing fields to the per-service
     `*_PAGINATED_FIELDS` maps (`core/connection/graphql/cachePolicies.ts`).
2. **Lists with no `pagination` are unbounded**, often as a first fetch before
   `ListRender` refetches a page: rekuest TaskList/AgentList/ShortcutList/
   SpacesList/ToolboxList/BlokList, kraph HomePage graphs and ScatterPlotList,
   lok Mandates/Releases/UserOptions/GroupOptions, kabinet RepoBloks/ListRepos,
   dokuments FilesPage, alpaka room messages, mikro GetSparseDatasets.
3. **Paged lists without an order** come back oldest-first or arbitrary:
   rekuest "last 10 tasks" (AgentTasksSidebar, ImplementationPage), fluss
   RunCarousel "Latest Run" and the Runs/Workspaces/Flows pages, omero "Latest
   Datasets".
4. **Display widgets run detail queries to draw a chip.** They render once per
   row in task cards, firings and the command pill, so the cost multiplies:
   mikro Scene/Lens/Annotation/Table/Sparse/File displays, elektro Experiment
   (the whole scene) and NeuronModel, kraph Graph and category displays, kuvert
   Message/MailAccount/Task, bank Merchant/Account, omero Dataset/Project (all
   children to count them; `imageCount`/`datasetCount` exist), dokuments
   Document/Page, kabinet Pod. Fix: slim by-id queries (mikro already has
   `GetListArrayDataset` as the pattern).
5. **Subscriptions trigger full refetches** instead of cache writes: mikro
   scene (every layer save, own edits included — **verified**), kraph todos
   (six lists per change, org-wide), kuvert mailbox syncs (ignores the event's
   `folders`), rekuest rules and signals, fluss PythonRuns and Home "Running
   now", lovekit participants. Mutations often add their own `refetchQueries`
   on top, so the echo refetches twice.
6. **Refetches that do nothing** (wrong name or variables): kraph
   PropertyEditor (`GetEntity` without `$graph`, **verified**), kraph
   EntityCategoryPage (`entityCategory` instead of `category`), lok
   AnswerMembershipRequest (`MembershipRequests` → `PendingMembershipRequests`),
   alpaka chat (`DetailRoom` → `GetRoom`), lok share/revoke links.
7. **mikro defaults every generated `useQuery` to `cache-and-network`**
   (`mikro/api/funcs.tsx:44-56`), so every mount goes to the network: hover
   cards, annotation lists on every show/hide.
8. **~110 dead operations** (no call site): rekuest 21, kraph 31, lok 16, mikro
   8, alpaka 6, fluss 5, dokuments 5, elektro 4, kuvert 4, lovekit 4, kabinet 3,
   bank 2, lokate 1, omero 1. Several are `GlobalSearch` documents for modules
   that register no search.

---

## Correctness bugs (fix first)

| Service | Bug | Fix | Kind |
|---|---|---|---|
| dokuments | `files`/`documents`/`pages` return **every organization's rows** (`dokuments_server/schema.py:49-51`, no scoping in `core/types.py`). **Verified.** | org-scoped `get_queryset` | server, security |
| dokuments | `Page.content` is `String!` but the column is nullable: one empty page breaks `GetDocument` | nullable or `""` | server |
| dokuments | `DocumentFilter.search` filters `name`, which Document lacks (unused today) | fix field | server |
| lokate | PlacePage visits always empty: filters by `place.id`, server matches `clientId` (`PlacePage.tsx:22`). **Verified.** | pass `place.clientId` | client |
| kraph | `renderGraphTable` listed as a paginated field: tables read back empty, unpaged scatter plot throws `RangeError` (`cachePolicies.ts:136`). **Verified.** | remove the entry | client |
| kraph | Property edits don't show (`PropertyEditor.tsx:25`). **Verified.** | refetch `"GetEntity"` by name | client |
| kraph | Quick-created entity doesn't appear (`EntityCategoryPage.tsx:38`) | `refetchQueries: ["EntityNodes"]` | client |
| kraph | Graph "Plots" tab shows every scatter plot in the org (`GraphPage.tsx:85`) | `Graph.queries … scatterPlots` | client |
| kraph | SetAsMeasurement picks a category from any graph (`SetAsMeasurement.tsx:91-101`) | add `graph` filter | client |
| kraph | CreateEntityCategoryForm without a graph refetches the wrong list (`:493`) | refetch `ListEntityCategory` | client |
| rekuest | "Last 10 tasks" are the oldest (no ordering) | `ordering: [{createdAt: DESC}]` | client |
| rekuest | Nested workflows show grandchildren as direct children (`ChildTaskUpdater.tsx:41-45`) | skip creates whose `parent !== taskId` | client |
| rekuest | New agents are inserted into every cached `agents(...)` list, filters ignored (`AgentUpdater.tsx:64-75`) | refetch instead of insert | client |
| rekuest | TaskBloks stops refetching after 25 events (`TaskBloks.tsx:141`) | key on newest event id | client |
| kabinet | Org with only registry imports sees "No repos yet" (`HomePage.tsx:33`) | `appStoreTotals { apps }` | client |
| kabinet | "More from publisher" shows other publishers' apps (hybrid search) | prefix check now; `AppFilter.publisher` | client + server |
| kabinet | Installed apps: a running app can fall off the 12-row page | `AppOrder` by running | server |
| fluss | Run page never sees the run finish (`TaskFlow.tsx:37-42`) | subscribe `run(id)` (exists) | client |
| lok | Approving a request leaves member lists stale (wrong refetch name) | `PendingMembershipRequests` + member queries | client |
| kuvert | Unread dot stays after reading (`ThreadReader.tsx`) | update `Thread.unreadCount` in cache | client |
| kuvert | Pinned tasks are only first within a page | `TaskOrder.pinned` | server |
| alpaka | Structure chat sidebar can open the wrong room (20 unordered rooms) | `RecentRooms` (`lastMessageAt`) | client |
| elektro | ExperimentDisplay lacks `errorPolicy: all`, so lookup-timed scenes show nothing | slim query | client |
| elektro | HomePage "nothing yet" ignores datasets | add `arrayDatasets(limit 1)` | client |
| omero | "Latest Datasets" are the oldest | rename, or ordering | client / server |
| omero | `EnsureOmeroUser` brings the OMERO password into the cache | drop `omeroPassword` | client |

---

## Biggest waste on hot paths

- **mikro**
  - `GetScene` refetched in full on every layer event, twice on create/delete, N times in result-sink loops (`sceneHost.ts:370-377`). Subscribe with `create/update { ...SceneLayer } delete` and write the cache. **Verified.** client
  - `GetFile` → `BigFileStore.accessGrant` makes the server call STS AssumeRole on every read; nothing uses it (downloads use `RequestBigfileAccess`). **Verified.** client
  - FolderPage loads every file and subfolder unpaginated; only a count is read. `childrenCounts(parent:)` exists. client
  - Collaboration page: one display query per item, up to 2,000 "brought" items. client (a `CollaborationItem` label field would be server)
  - Staging a lens re-runs the whole Add Layer engine network-only per lens; server `placeable_container_ids` isn't memoized. client + server
  - `CoordinateSystem.residents` (about 10 prefetches per system) is spread into scene and detail payloads that never read it. client
- **rekuest**
  - `ListAction.latestTask` is a per-row server query on every action list and search; only chat reads it. client
  - PodActions runs one full `DetailImplementation` per button. client
  - Org task lists refetch every mounted `ListTasks` on each org task. client
  - Blok dependency pickers: the 10 s poll is fully replaced by the existing `WatchAgents`; the 15 s poll by refetching on agent create/delete/update. client
- **kraph**
  - `EntityCategory.latest` (three full entities with org-wide connections) is never read. client
  - Todo subscription plus mutation refetches: six lists per change on every datum page. client (+ a scoped `todoChanged` would be server)
  - GlobalSearch: 40 heavy rows per keystroke, shows 12. client
- **lokate**
  - `Visit`/`Trip` select `device.pointCount`, a count over every point the device ever uploaded. client
  - Places list: two queries per place × 500. server (annotate, index)
- **kuvert**
  - Mailbox sync events refetch every list; the event carries `folders`. client
  - Reading pane downloads every body in the conversation. client
  - Bulk actions run one query per thread. server (`threads:` on the inputs)
- **bank**
  - `withSuggestions` runs pgvector ranking for every row; chips only show on unsettled rows. server
  - `PortfolioPage` builds the full valuation history twice. client
- **alpaka**: room lists carry every message of every room. client (count needs `Room.messageCount`)
- **kabinet**
  - `GetPod` ships the whole backend tree; log refresh polls it every 1.5 s. client (a pod event on log dump is server)
  - `GetApp` loads every release in full. client
- **dokuments**: one `requestMediaAccess` mutation per page thumbnail; `requestGeneralMediaAccess` exists. client
- **elektro**: `ListArrayDataset` rows cost 4–5 server queries each. server. Unbounded scene annotations; `AnnotationFilter.intersects` exists. client
- **omero**: list pagination is applied in Python after loading everything from OMERO. server

---

## Per-service detail

The six full reviewer reports, with file:line evidence for every item, are
condensed above. Per-service counts:

| Service | Ops | Findings | Dead | Fine |
|---|---|---|---|---|
| mikro | 120 | ~42 | 8 | ~70 |
| rekuest | 143 | ~37 | 21 | ~85 |
| kraph | 113 | 35 | 31 | ~47 |
| lok | 64 | 20 | 16 | 28 |
| bank | 58 | 18 | 2 | 38 |
| kabinet | 38 | 20 | 3 | 10 (+5 not fully checked) |
| elektro | 37 | 13 | 4 | 20 |
| kuvert | 36 | 15 | 4 | 17 |
| fluss | 28 | 15 | 5 | 8 |
| alpaka | 19 | 4 | 6 | 9 |
| lovekit | 15 | 5 | 4 | 6 |
| lokate | 12 | 9 | 1 | 2 |
| dokuments | 10 | 3 | 5 | 2 |
| omero-ark | 8 | 5 | 1 | 2 |

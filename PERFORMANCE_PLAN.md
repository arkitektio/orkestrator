# Performance plan — high-impact, high-frequency offenders

Audit date: 2026-09-01. Implementation: 2026-09-02 (branch `new-stuff`,
uncommitted). Scope: `src/renderer/src`. Items were ranked by
(cost per execution × how often it fires × how many places mount it).
Verification per change set: `pnpm typecheck` (clean) and `pnpm test`
(242 files / 2962 tests passing); the Electron app is not launched from agent
sessions, so the render-count claims below still want a React Profiler
recording by a human (see "Verify by hand").

Already good, do not re-audit: zustand selector discipline outside
`reaktion/` (498 selector calls, 2 without), all `setInterval`s cleaned up,
no Apollo client or socket built inside components, no `console.log` inside
`useFrame`, scene camera/canvas sync, quality adapter, rAF coalescers, brick
residency probe path, Arkitekt provider context, `linkers.tsx` registry.
The worker RPC `pending` map is NOT leaked on abort: the abort path disposes
the worker, which rejects and clears every pending request.

---

## Done

### Every list page (cards, grids, smart objects)
- **auto-animate re-init per render** — `components/layout/ContainerGrid.tsx`
  now attaches once via `useAutoAnimate` (was re-run on every render,
  stacking per-child observers and 2 s intervals).
- **Smart-model ref callback churn** — `providers/smart/useSmartModel.tsx`:
  drag state read through `useLatestRef`, so the ref callback is stable and
  a drag starting anywhere no longer re-registers every card;
  `data-object` carries `object.id` instead of the serialized fragment; the
  `[object Object]` URL/key bugs are fixed. Same treatment in
  `useSmartDropZone.tsx` (also keyed on `object.id`).
- **Selection store O(n²) registration** — `providers/selection/store.tsx`:
  node-keyed `Map`, microtask-batched register/unregister (one store
  notification per commit), `flushSelectables()`, and a marquee rect cache
  (`beginMarquee`/`endMarquee`, invalidated on scroll). `SelectionProvider`
  reads `selectables` on demand instead of subscribing. Tests extended.
- **Dialog / display / debug / widget-registry context values** memoized
  (`lib/generic/providers/DialogProvider.tsx`, `lib/display/registry.tsx`,
  `providers/debug/DebugProvider.tsx`, `rekuest/widgets/WidgetsProvider.tsx`).
- **Card memoization** — 80 card components under `**/components/cards/`
  export `React.memo(...)`; `createList` memoizes the merged `cardProps`.
- **`ListRender` duplicate refetch** skipped when the parent already
  paginated; `createList` serializes filters once per identity and honours a
  new `fetchPolicy` option.
- **Console logging** removed from `useResolve`, `useKraphMediaResolve`,
  `mikroAccess`, `rekuestAccess`, the four reaktion contextuals,
  `ReactiveWidget`, `TrackFlow`, `LiveTracker`, `RangeTracker`.
- **Snapshot backdrops** — `lib/datalayer/mikroAccess.tsx`: shared,
  ref-counted blob-URL cache (`acquireBlobUrl`) with a 30 s release grace,
  and `WithMikroMediaUrl` defers the fetch until the element nears the
  viewport.

### App-root subscriptions and data layer
- `ConnectedGuard` uses the new shallow `useConnectionStatus()`;
  `WardRegistrar`, `ConnectingFallback`, `TaskHookRunner` use narrow hooks;
  `AgentProvider` reads the Arkitekt store imperatively and pushes context
  refreshes through a store subscription (no whole-store rerender);
  `useAgent` is shallow-compared.
- `AgentUpdater` inserts/deletes through `cache.modify` on the root field
  (reaches every paginated `agents` variant).
- `TaskFlow` retries with exponential backoff and a ceiling.
- `chat.tsx` and `TaskEventLog` sort once per input identity with string
  comparison (no `Date` per comparison).
- `RoomPage` dedupes redelivered subscription messages.

### Action forms and widgets
- `HideEffect`: one shared `ShadowRealm`, compiled functions cached per
  source string, subscribed via `useWatch` to the port and its dependencies.
- `useWidgetDependencies`: `useWatch` on the resolved dependency paths;
  `values` only changes when a dependency value changes (no search request
  per unrelated keystroke).
- `form.watch()` removed from `ActionAssignForm`, `ShortcutForm`,
  `CreateShortcutDialog`; the description is a `FormActionDescription` leaf.
- `ActionDescription` caches compiled Handlebars templates and derives text
  with `useMemo`.
- `ArgsContainer` resolves widgets/paths/effects once per port set, keys by
  `port.key`, and no longer mutates its `groups` prop.
- `SearchField` holds `search` in a ref, debounces queries (200 ms) and
  guards against out-of-order responses; `ChoicesField` and
  `StateChoiceWidget` memoize their search inputs.

### Reaktion flow editor
- `useEditRiver()` is gone; all 22 call sites use atomic
  `useEditFlowStore(s => s.field)` selectors or the new `useEditTemporal()`.
- `useEditNodeErrors` is shallow-compared; `LabeledShowEdge` looks the target
  node up through `nodeLookup` instead of scanning `useNodes()`.
- zundo history: a node drag is recorded as ONE undo step from the pre-drag
  state (intermediate ticks skipped). Test: `reaktion/edit/store.drag.test.ts`.
- `LiveTracker` / `RangeTracker` collapse events per source in O(n)
  (`latestEvents.ts`), and the live list is capped at 2000 events.

### Scene per-frame residuals
- `passVisibility.ts`: no per-leaf array/closure in the classifier;
  allocation-free `hideObjectsInto` / `disableColorWriteInto` used by
  `VolumeCompositor` with persistent scratch.
- `layersPlanKey` memoized per `layers` array identity; `layerIndexOf`
  gives selectors an id→index map (used by `BrickVolumeLayer`).
- `getMetaId` has an identity fast path (no stringify per chunk).
- `useBrickPlaneProbe` memoizes the probe geometry context and uses scratch
  matrices; `AnimationPlayer` / `readDimSelections` no longer allocate per
  frame; `FabriksCollectionLayer` pointer moves use a scratch vector and
  numeric dedupe; `drainUploads` reuses one progress object;
  `CanvasHueProbe` throttles during streaming too; `PointsLayer` mutates the
  cull-bounds uniforms in place; `AnnotationLayerCard` counts without
  allocating.

---

## Not done (and why)

- **`MyTasks` unpaginated at app root** (`TaskUpdater` /
  `rekuest/api/graphql.ts`): `graphql/schemas/rekuest.graphql` declares
  `myTasks: [Task!]!` with no arguments. Needs the server to add pagination
  first; then add `$pagination` to `graphql/rekuest-next/queries/task.graphql`,
  regenerate with `pnpm rekuest`, and window the cache in
  `rekuest/lib/taskCache.ts`.
- **Radix `ContextMenu`/`HoverCard` roots on every card**
  (`providers/smart/SmartModel.tsx`): optional; measure after the above.
- **`AnnotationLayerRenderer` 5 s poll per annotation layer**: already
  skipped mid-gesture; hoisting one poll per collection needs a structural
  change and was left out.
- **`useFilteredTasks` per-consumer filtering** (`rekuest/hooks/useTasks.tsx`).
- **`mergedChannelUniforms` builds/disposes textures per member per rebuild**:
  per structural edit only; refactor deferred.

## Verify by hand (React Profiler in dev)

- List page with two lists: opening a dialog, starting a drag, and typing in
  a filter should commit only the affected components.
- Action form with two search ports: one request per search-port change,
  none for unrelated keystrokes.
- 30-node flow: dragging a node commits only that node and its edges; the
  undo stack gains one entry per drag.
- Scene: existing vitest suites under `mikro-next/components/scene/**` and
  `lib/zarr/**`; debug panel frame stats while streaming.

## Conventions introduced

- `hooks/useLatestRef.ts`: read a changing value from a stable callback
  without a ref write during render (the React Compiler lint rules reject
  `ref.current = x` in the render body).
- Selection registration is batched; call `flushSelectables()` before a
  synchronous read of `selectables`.
- Flow-store consumers select fields; there is intentionally no
  whole-state hook.

---

# Pass II — 2026-09-02 (branch `new-stuff`)

Three fresh audits (Apollo data layer; React render paths outside the scene;
workers / IPC / zarr / main process) after Pass I. Same verification rule:
`pnpm typecheck` clean and `pnpm test` green; render-count and frame-time
claims still want a human with the React Profiler / DebugPanel.

## Done

### Data layer
- **Forced `nextFetchPolicy: "network-only"`** on every generated rekuest and
  mikro hook (`lib/rekuest/hooks.tsx`, `lib/mikro/funcs.tsx`) is gone. The
  wrappers now default to `fetchPolicy: "cache-and-network"` +
  `nextFetchPolicy: "cache-first"` and let call sites override — hover cards'
  and `useTasks`' `cache-first` are honoured again, and a variables change
  (page, filter, route param) serves from cache when present. Trade-off: a
  page revisited within one mount shows cached rows without a refetch;
  mutations already `refetchQueries`.
- **Smart context menu** debounces its search (200 ms,
  `providers/smart/extensions/context.tsx`) before fanning out to ten query
  children; the kraph relation candidates dropped `network-only`.
- **`useDescriptorProbe`** dedupes probes per distinct (end, descriptor) pair
  (`kraph/lib/applicableCategories.ts`). True one-query-per-side batching
  needs a schema change (`matchesDescriptor` is a single input) — see Not done.
- **Focus refetch** (`hooks/use-refetch-on-reactivate.ts`): 10 s cooldown,
  skipped when the window was away < 2 s, `MyTasks` excluded.
- **Per-card `useImplementationsQuery`** in the kabinet release/flavour cards
  runs only once the install dropdown opens.
- `ResourcePage` polls at 15 s and not while hidden; `AgentUpdater` log line
  removed; `FolderListExplorer` sort and `useTask` lookup memoized.

### React render paths
- **One delegated context menu and one hover card for every smart card**
  (`providers/smart/SmartSurface.tsx`, mounted in `AppProvider`; cards
  register their node + structure in `providers/smart/nodeRegistry.ts`).
  A card no longer mounts Radix `ContextMenu` + `HoverCard` roots (~15
  component instances and a capture-phase document `keydown` listener each —
  60-200 per list page). `hoverGroup.ts` is gone; the warm-group delay lives
  in the surface.
- `useSmartModel`: floating-ui middleware hoisted to module scope (it was
  deep-compared, down to `fn.toString()`, every render), `floatingRef` stable.
- **`key={index}` → `key={item.id}`** in 48 list sites + the panes and the
  Gantt bars, so the Pass I card memos actually hold when a list prepends.
- `react-timestamp` wrapped in `React.memo` (`components/ui/timestamp.tsx`),
  all 32 importers repointed.
- Command palette provider value memoized; `usePerformAction` reads modifier
  keys from one shared window tracker (`app/hooks/modifierTracker.ts`) instead
  of five listeners per action row; shortcut rows no longer rebind keydown per
  render; local-action sort memoized.
- `TaskTimeline` pan/wheel coalesced to one store write per frame;
  `GanttTimeline` uses a `Set` for highlights and mounts a `Popover` only for
  the clicked bar; kraph `EntityList` / `StructureList` / `GraphTable`
  memoize columns, rows and filters; `fancy-input` caches its rect; kraph
  display images and `ClientAvatar` load lazily.
- **Route-level code splitting** (`app/App.tsx`): the 13 module roots are
  `React.lazy`, so three.js, DuckDB, Monaco, the flow editor and dockview
  leave the entry chunk.
- **Chat**: `ChatList` renders a `React.memo` `ChatMessage` per row, the
  rereply callback is stable, message times use one `Intl.DateTimeFormat`,
  and the per-message `layout` animation is gone. `Markdown` parses once per
  `text` (module-level regexes, `useMemo`, `React.memo`) — 24 rendering
  snapshots recorded against the old parser pin the output.
- **Task event log**: `TaskLogEntry` is memoized on the event, times come
  from a module-level formatter, and the log windows to the newest 200 events
  with a "show earlier" button.
- **Slim `MyTasks`** (`fragment LiveTask`, `graphql/rekuest-next`): the live
  task list and its single-task hydration no longer carry `...Ports` per task
  (only `args { key kind identifier }`, which `useFilteredTasks` reads);
  detail pages, `DetailTask.children` hydration and task hooks use a new
  `FullTask` query. `useHashActionWithProgress` asks for `ActionIdByHash`
  instead of the full ports tree per install row.
- **DuckDB tables** (`useDuckDbTable.ts`): one long-lived connection per
  table (httpfs + secret once per grant), 200 ms debounced search, superseded
  runs ticketed and `cancelSent()`, `COUNT(*)` cached per search/filter so
  page and sort changes issue one statement.
- **`FolderTableExplorer`** paginates and searches server-side (the
  `Children` document already accepted both), like the list explorer.

### Workers / main process
- `onHeadersReceived` is filtered to the app and dev-server origins, so S3
  chunk GETs from the codec workers no longer round-trip through the main
  process (COOP/COEP dedupe unchanged — see the SAB note in `src/main/index.ts`).
- `app://` handler streams files and sets `Cache-Control` (immutable for
  hashed assets, `no-cache` for `index.html`); zoom factor applied on resize
  only when it changed; drag-start writes async; machine id memoized;
  gateway `initialize()` resets its implementation list.
- Zarr telemetry: per-chunk timing payloads are built only when
  `__ZARR_TIMING__` is on (`lib/zarr/runner/timing.ts`); codec workers stop
  scanning the Resource Timing buffer per fetch.
- Default chunk cache is byte-bounded (256 MB) and attribute probes use their
  own 128 MB `ByteBudgetChunkCache` (`exactSampleSource.ts`).
- Blurhash placeholders memoized per hash; updater IPC listeners are
  disposable; `fabriksBake` bbox no longer boxes the whole position array.
- **Thumbnails and GLTF assets** (`lib/datalayer/s3request.tsx`,
  `mikroAccess.tsx`, `rekuestAccess.tsx`): the second SigV4 implementation
  now delegates to the zarr path's memoized signing key and hour-pinned
  presigned URLs (credential identity in the key), and `<img>` / `useGLTF`
  consumers get the presigned URL directly — no blob download, no object URL,
  Chromium's cache dedupes. The rekuest media grant is cached per store.
- **Worker dispatch on a free list** (`repackDispatcher.ts`,
  `fabriksDecodeDispatcher.ts`): idle worker first, capped in-flight per
  worker (2 for repack, 1 for fabriks decodes), FIFO overflow queue, and a
  queued job whose `signal` aborts is dropped instead of posted. Wired at
  both call sites: bricks pass the fetch controller's signal; the fabriks
  manager aborts queued decodes on every generation bump.

### Cache and subscriptions
- **Apollo `typePolicies`** (`lib/arkitekt/builders/cachePolicies.ts`,
  `app/cachePolicies.ts`, wired in `app/Arkitekt.tsx`): every root `Query`
  field with a `pagination` argument is keyed on its other arguments and
  stored as ONE offset-indexed window per filter/order — `read` returns
  exactly the requested `[offset, offset+limit)` slice or goes to the network,
  so a search prefix or a page no longer becomes a permanent separate
  `ROOT_QUERY` entry. `Action.args` / `Action.returns` merge ports by `key`
  (field union), so the slim `LiveTask` write cannot clobber a full-ports
  `Action` a detail view is showing. `GcOnNavigate` runs `cache.gc()` on all
  clients at most once per minute on route change.
- **`useAgentLiveState`** reads from one module-level store per
  `agent:interface` (`rekuest/hooks/liveStateStore.ts`): one `WatchState`
  subscription shared by all widgets, refcounted, patches coalesced to one
  publish per animation frame.

## Not done (and why)

- **`pnpm rekuest` against the live server fails on pre-existing drift**:
  `fragments/blok.graphql` (`Blok.uiComponents` → `components`),
  `fragments/ports.graphql` (`StateAccessor.subPath` → `path`;
  `hook`/`ward` on the custom widget/effect types replaced by
  `component`/`props`). The `LiveTask` / `FullTask` / `ActionIdByHash`
  documents were generated against the checked-in SDL with a scratch config;
  `src/renderer/src/rekuest/api/graphql.ts` and `src/main/schemas/rekuest.ts`
  are additive only. Reconcile those documents with the server before the
  next real `pnpm rekuest`.
- **`useDescriptorProbe` one-query-per-side batching** needs a kraph schema
  change (`matchesDescriptor` takes a single input); the client dedupes per
  distinct (end, descriptor) pair instead.
- **`FolderTableExplorer` server-side ordering**: the `Children` document does
  not declare the `order` argument the schema offers; needs `pnpm mikro`.
- **`MyTasks` pagination** still needs the server change from Pass I.
- **`exportAsCsv`** still materializes the table in JS; a `COPY … TO` path
  needs a registered wasm-FS file.
- `omero_ark` / `dokuments` have no schema under `graphql/schemas/`, so their
  caches keep default keying.
- Worker dispatchers still reuse a worker after `onerror` (no respawn).
- `AnnotationLayerRenderer` poll hoisting and `mergedChannelUniforms` texture
  churn remain from Pass I.

## Verify by hand (Pass II)

- List page: typing in the filter commits no card; right-click on a
  multi-selection acts on the whole selection; hover cards open with the
  warm-group delay and close when the pointer leaves card and card content.
- Chat with a running replyer stays smooth; the task log shows "show earlier"
  above 200 events.
- DuckDB table: typing issues one query per pause; page/sort changes issue a
  single statement.
- `pnpm build`: three.js, DuckDB, Monaco, the flow editor and dockview are
  not in the entry chunk. Checked on 2026-09-02: entry went from 10.9 MB to
  7.9 MB; `MikroNextModule` (4.4 MB, the scene) and `NeuronRenderer` are
  their own chunks. The remaining entry weight is the generated GraphQL
  modules, forms and the dialog registry (`app/dialog.tsx` statically imports
  forms from every module) — the next split, if wanted.
- Scene streaming: DebugPanel frame stats unchanged, no main-process CPU
  spike while chunks stream (the header listener no longer sees S3).

# Pass III — 2026-09-04 (branch `refactor/task-system`)

Whole-codebase audit after Passes I/II; the three highest cost × frequency ×
breadth offenders still present, verified in code before fixing.

## Done

- **Codec worker pool shared workers** (`lib/zarr/pool/workerpool.ts`,
  `runner/worker-rpc.ts`, `runner/codec-worker.ts`, `runner/get-worker.ts`,
  `mikro-next/workers/pool.ts`). Exclusive one-task-per-worker checkout
  capped HTTP concurrency at the pool size (8 on a laptop) while residency
  asks for `maxInflightBricks × 2` bricks × chunks — and a worker's slot was
  held for the whole socket wait, so decodes queued behind idle threads.
  The pool now has slots `{worker, inFlight}` with `maxInFlightPerWorker`
  (default 4 → 32 concurrent fetches on 8 workers), least-loaded pick, an
  owning `factory`, and `retire(worker)`. Consequence handled: cancellation
  and per-request errors used to `terminate()` the worker, which would now
  kill siblings — so cancellation is a per-request `{type:'cancel', id}`
  message (worker-side `AbortController` into `fetchS3Path`, decode skipped
  once aborted), per-request failures keep the worker, and only a
  worker-level `error` event (`WorkerCrashedError`) disposes + retires.
  `insertTask`/`removeQueuedTask` are binary searches (were O(n) scans per
  insert → O(n²) on a big replan). `prewarm()` fills the whole pool (the
  literal 8 left half cold on 16+ cores). `openSceneArrays` opens stores in
  parallel (was one serial metadata RTT per store on the cold-open path).
  Tests: `pool/workerpool.test.ts`.
- **Annotation selection no longer re-uploads outlines**
  (`annotations/layer/placedAnnotations.ts`, `AnnotationLayerRenderer.tsx`).
  `selectedRoiIds` was a dep of the point/shape split, whose fresh `others`
  array re-ran `buildOutlineBatches` (new Float32Arrays) and the batch's
  `setPositions` GPU upload on every click — exactly the cost the batch
  exists to avoid. Split into selection-independent `partitionEntries` and
  `pointGroupsOf` (styling); the outline batches memo on `[others,
  flattenToPlane]`. `shownEntries` also returns a value-stable array so a
  z-scrub tick that keeps the same visible set skips the whole chain. The
  repair/prune effect reads the selection via the store api instead of
  listing it as a dep (four O(N) passes per click).
- **Command palette queries debounced** (`command/Menu.tsx`). The four
  result lists received the raw `context.query` as the GraphQL filter — 4–5
  requests across two services per keystroke; they now get
  `debouncedContext.query` (the input keeps the raw value), and
  `objects={props.objects || []}` is one memo instead of a fresh literal per
  child.

## Not done (verified runners-up)

- Task fan-out hydrate is N+1 (`rekuest/lib/taskCache.ts` `fetchTask`,
  `network-only` per created task); `TaskFilter.ids` exists, so a 50 ms
  buffer + one `tasks(filters:{ids})` would batch it.
- `LayerRenderer.tsx` `map().join()` selectors per store write;
  `layerPlanKey.ts` already has the memoized key.
- `codec-worker.ts` raw16 passthrough memcpy + scalar `copySubRegion`.
- `TrackFlow.tsx` unmemoized edges/context; `spaces/task/store.tsx` fresh
  Sets at 3 Hz feeding `CallingPathTubes`; `CameraController.tsx` React
  subscription to the HOT `probedCoordinate`.

## Verify by hand (Pass III)

- `globalThis.__ZARR_TIMING__ = true`, open a large sharded volume:
  `queueWaitMs` collapses and the DebugPanel in-flight brick count reaches
  the tier's `maxInflightBricks` instead of pinning at the worker count.
  Cancel mid-stream (scrub away): no worker respawn, siblings finish.
- Click through ROIs in a large collection with a perf recording armed: no
  `setPositions` upload per click; only the batch's color effect runs.
- Palette with the Network panel on graphql: one burst per 100 ms pause.

# Server-side suggestions

Backend fields, filters, aggregates and events the app needs and does not have.

Each entry says what to add, where the client works around the gap today (or
which feature waits for it), and the impact:

- **correctness**: the user sees wrong or missing things. Usually a client-side
  filter over a paginated list, where a page comes back short or empty, or
  something past the page is never shown.
- **perf**: the client over-fetches, scans, issues N+1 queries or polls.
- **cosmetic**: a count, a label or a setting that is lost on reload.

New code must not add workarounds (no scanning, no N+1, no client-side
filtering of a paginated list). It waits for the field, and the field is
listed here. Remove an entry once the field has shipped and the client uses it
(regenerate with `pnpm <service>`).

Paths are relative to `src/renderer/src/`. Audit of existing workarounds:
2026-11-22.

---

## mikro

### Folder children: `FolderChildrenFilter.kinds`, more `ChildrenOrderField`s, a total (correctness)
- **Add:** `FolderChildrenFilter.kinds: [FolderChildKind!]`, `SIZE` and `KIND` in `ChildrenOrderField` (today only `CREATED_AT`, `NAME`), and a total (`Folder.childrenCount`, or per-kind counts).
- **Workaround:** `mikro/components/explorer/FolderListExplorer.tsx` filters one 30-row `children` page by type, sorts it and counts types on that page. `FolderTableExplorer.tsx` sorts columns within a 20-row page and guesses `hasNextPage` from a full page.
- **Impact:** a "Tables" filter can show an empty page while tables exist; sorting and counts cover one page.
- **Also:** `FolderChild` has no `SparseDataset` or `NetworkCollection`, so folders cannot list them. `ArrayDataset.sizeBytes` would replace summing `dataArrays[].store.sizeBytes` for the size column.

### `CoordinateSystemFilter.physical: Boolean` (blocks a feature)
- **Add:** a filter for physical (unit-carrying) spaces: `true` for systems whose axes carry units (a calibration, a stage frame, a world), `false` for unitless index spaces (pixel grid, pyramid level, lens grid). Ideally also `CoordinateSystem.physical: Boolean!` for cards.
- **Blocks:** the coordinate system list (`/mikro/coordinatesystems`) should show only physical spaces by default. Its filter row has search, "Holds data" / "Reference frames", creator, date and sort, but no physical toggle. The client cannot tell the two apart (`components/coordinates/residents.ts`). `ArrayDatasetFilter.hasPhysicalSpace` already exists for datasets.

### Pixel size of a coordinate system (correctness)
- **Add:** `CoordinateSystem.voxelSizes` (or `pixelSizes`), ranked the way `ArrayLens.voxelSizes` already is.
- **Workaround:** `mikro/components/sidebars/CoordinateSystemInfoSidebar.tsx` parses the one-hop calibration edge (`components/coordinates/pixelSize.ts`), so it misses calibrations more than one step away. The dataset section already uses `fullLens.voxelSizes`.

### Collaborations: item counts, pagination, stats (perf)
- **Add:** `Collaboration.itemCount(brought: Boolean)`, pagination on `Collaboration.items` and on root `collaborations`, and `collaborationsStats`.
- **Workaround:** `mikro/components/cards/CollaborationCard.tsx` (`GetCollaborations`) pulls every item of every collaboration to count them. `HomeOverviewSidebar.tsx` counts collaborations with `list.length`.

### Column statistics and row count (perf)
- **Add:** `Column.stats { min max nullCount distinctCount histogram(bins) distinctValues(limit) }` and `TableDataset.rowCount`.
- **Workaround:**
  - `mikro/components/scene/platform/layerui/ColumnEntryEditor.tsx` scans the parquet with DuckDB for min/max, histogram and distinct values every time the editor opens.
  - `useDuckDbTable.ts` runs `COUNT(*)` for the row count.
- **Impact:** S3 egress and time.

### `File.derivedContainers`: pagination, kind filter, count (perf)
- **Add:** `pagination` and a container-kind field on `FileLinkFilter`, plus `File.derivedContainersCount(kind)`. The same count is wanted for `derivedResidents`.
- **Workaround:**
  - `mikro/components/home/RecentData.tsx` fetches every derived container of each home file, with full `ListArrayDataset`, to show 5 tiles and a count. A 40-series LIF ships 40 datasets.
  - `MeshFloat.tsx` and `MeshObjectInfoCard.tsx` count `derivedResidents` the same way.

### `coordinateGraph(direction:)` (perf)
- **Add:** `direction: INCOMING | OUTGOING | BOTH` on `coordinateGraph`.
- **Workaround:** `graphql/mikro-next/queries/addlayer.graphql` (used by `mikro/forms/AddLayerForm.tsx`) pulls the whole undirected component to depth 6. The client then walks it directed and throws away spaces reached through other worlds.

### `createdAt` where the type sorts by it but doesn't return it (cosmetic)
- **Add:** `File.createdAt`, `TableDataset.createdAt`, `ArrayDataset.createdAt`, `SparseDataset.createdAt`. All of them order by `createdAt` already.
- **Add:** `createdAt` plus `createdAfter`/`createdBefore` on `Scene` and `Annotation`.
- **Workaround:**
  - `mikro/pages/FilePage.tsx` reads `createdThrough.createdAt`, falling back to the provenance `Create` entry.
  - The home overview can show no "new this week" for scenes or annotations (`homepage.graphql`).

### `activeAnchors(within:, pagination:)` in the anchor overlays (perf, unverified)
- **Add:** nothing new: mikro's `activeAnchors` takes a window like elektro's. The overlays should ask for the viewport.
- **Workaround:** the mikro anchor overlays (`SparseAnchorsOverlay.tsx`, `TableAnchorsOverlay.tsx`, `AnchorMetadata.tsx`) fetch all anchors (viewport filtering unverified).

### Smaller mikro gaps
- **Pyramid level scale (low):** `DataArray.relativeScale` (or the old `scaleFactors`). `core/data/scene/coords/levelScale.ts` rebuilds it from `toParent` edges.
- **Lens delete events (perf, minor):** a `__typename` or kind on `LensEvent.delete`. `lib/lenses/useLiveLenses.ts` evicts a deleted id under all 6 lens typenames.
- **Landmark registration (feature):** a server `registerByLandmarks`. `mikro/components/registration/math/solvers.ts` fits the affine on the client.
- **Settings lost on reload (cosmetic):**
  - `tailWindow` on `UpdateTrackLayerInput` (`scene/platform/stores/sceneStore.ts`).
  - Transfer `colorStops` (`scene/platform/model/renderGraph.ts`).
  - `valueMin` / `valueMax` on `UpdateTraceChartLayerInput` and `UpdateChartLayerInput` (`chart/platform/edits/useChartAutoscale.ts`).

---

## rekuest

### Action grouping by availability (correctness, low)
- **Add:** an ordering (or facet count) by availability: runnable now, recently active, offline, no implementation.
- **Workaround:** `rekuest/pages/ActionsPage.tsx` with `components/lists/actionGroupings.tsx` groups by availability over the loaded page only (limit 100). Grouping by app, collection and kind is ordered on the server.

### Fit changes for blok dependency pickers (perf, unverified)
- **Workaround:** `components/blokDependencyBindings.tsx` polls candidate agents every 15 s and picked agents every 10 s. That may be to catch changes in which agents fit, which no event reports (unverified).

### Live task events need the new takt (note)
- `rekuest/run/useRun.ts` follows another person's run with `taskEvents(task, after)`. takt publishes those events from the release that added them; a hub on an older takt image only replays the recorded history, so such a run stops moving until it is reloaded.

---

## fluss

### `RunFilter.status` and a run-status event (correctness)
- **Add:** `RunFilter.status: [RunStatus!]` and a run-status subscription (only `events(run)` exists).
- **Workaround:** `fluss/pages/Home.tsx` takes the latest 30 runs, keeps the running ones and polls every 5 s. A run older than those 30 that is still running is never shown.

### `PythonFlowFilter.latest: Boolean` (correctness)
- **Add:** a filter for each flow's newest version (or `isHead`).
- **Workaround:** `fluss/pages/PythonFlows.tsx` loads up to 200 versions and removes duplicate lineages. Past 200 the list is silently cut, and status and search apply to versions, not to each flow's newest one.

### PythonRun subscription (perf)
- **Add:** `Subscription.pythonRun(id)` / `pythonRuns`.
- **Workaround:**
  - `sections/TaskPythonRun.tsx` polls every 5 s and `pages/PythonRuns.tsx` every 10 s.
  - `sections/TaskFlow.tsx` retries with backoff until the run exists.

### `WorkspaceFilter.creator: ID` (blocks a feature)
- **Blocks:** flows in a member's profile feed.

---

## kabinet

### App-level store fields (perf)
- **Add:** `App.latestRelease`, `App.deploymentCount` / `runningCount` / `status`, `AppFilter.deployed`, `hardware` and `service`, and `AppOrder.releasedAt`.
- **Workaround:** `components/store/storeModel.ts` (behind `AppStorePage.tsx`, `InstalledApps.tsx`, `StoreShelf.tsx`) fetches every release with flavours and deployments, with no pagination. It then groups them into apps, works out deployment, running, pod, hardware and service facts, and filters and sorts on the client.

### Smaller kabinet gaps
- **App by identifier (correctness, low):** `app(identifier:)` or `AppFilter.identifier`. `pages/AppStoreRedirect.tsx` uses substring `search` (limit 20), then matches exactly.
- **Approvals (low):** `ReleaseApprovalFilter.approver` and `active`. `components/store/StoreParts.tsx` and `lib/approvals.ts` work out "installed by me" from all approvals of a release.
- **Repos by member (blocks a feature):** a creator filter taking a lok sub. `GithubRepoFilter.user` is a GitHub name. This keeps repos out of the profile feed.

---

## kraph

### Mentions: filters, pagination, count (correctness)
- **Add:** `myMentions(resolved: Boolean, pagination:)` and `myMentionCount`.
- **Workaround:** `kraph/dashboard/MentionNotifications.tsx` badges `myMentions.length`. That is every mention ever, resolved ones included, so the badge never clears.

### Projects by member (correctness)
- **Add:** `ProjectFilter.member: ID` (or `creator`), or `Project.members`.
- **Workaround:** `kraph/profile/sections.tsx` takes a member's "Projects" from their newest 24 assigned todo lists. Projects beyond those lists, or without a list assigned to them, are missing.

### `Instance.evidence` (perf)
- **Add:** `Instance.evidence` / `informingStructures: [Structure!]!`.
- **Workaround:** `components/knowledge/SameAsList.tsx` runs one `informingStructures` query per sameness member (N+1).

### Applicable relation categories in one query (perf)
- **Add:** `applicableRelationCategories(source, target)` or `RelationCategoryFilter.admits { source target }`.
- **Workaround:** `lib/applicableCategories.ts` runs one `matchesDescriptor` probe per distinct descriptor per side.

### Graphs by creator (blocks a feature)
- **Add:** `GraphFilter.creator: ID`, with `Graph.createdAt` and `GraphOrder.createdAt`.
- **Blocks:** graphs in a member's profile feed.

---

## alpaka

### `Room.talkingAbout: [Structure!]!` (correctness)
- **Add:** the field. It can be written (`CreateRoomInput.talkingAbout`) and filtered on (`RoomFilter.talkingAbout`) but not read.
- **Workaround:** `alpaka/roomTalkingAbout.ts` keeps it in localStorage, so it is lost on other devices.

### `RoomOrder.lastMessageAt` / `Room.lastActivity` (correctness)
- **Workaround:** `alpaka/recentRooms.ts` loads 50 rooms by `createdAt` and re-sorts them by latest message. An old room with new activity outside those 50 is missed.

---

## lovekit

### Call ended/delete and participant events (perf)
- **Add:** `CallEvent.ended` / `delete`, `Subscription.callParticipants(call)`, and an invite `delete` sent when a call ends.
- **Workaround:** polls every 10–30 s:
  - `pages/Calls.tsx`
  - `call/JoinCallsSection.tsx`
  - `call/StructureCallsSection.tsx`
  - `call/CallAnnouncementsWatcher.tsx`
  - `call/invites.tsx` (so invites to ended calls stop ringing)
  - `call/CallPanel.tsx`

### Agent and stream liveness (perf)
- **Add:** an agents subscription with live changes, or liveness on `StreamEvent`.
- **Workaround:** `displays/AgentDisplay.tsx`, `displays/StreamDisplay.tsx`, `pages/AgentPage.tsx` and `pages/StreamPage.tsx` poll every 15 s, once per mounted display.

---

## lok

### Devices: lookup by device id, group filter (correctness)
- **Add:** `DeviceFilter.deviceIds: [ID!]` and `DeviceFilter.deviceGroup: ID`, and rekuest/lok agreeing on `deviceId` (`Device.nodeId` is deprecated).
- **Workaround:**
  - `lok/components/UserAvatar.tsx` (`DeviceImprint`, drawn on every agent card) and `lok/options.ts` fetch the whole unpaginated `devices` list and match on the deprecated `nodeId`.
  - `lok/components/filter/DeviceFilterRow.tsx` loads every group with its member ids and sends them as `ids`.

### Clients by client id (perf)
- **Add:** `ClientFilter.clientIds: [ID!]`, or a slim `clientsByClientId`.
- **Workaround:** `lok/displays/ClientDisplay.tsx` → `ClientAvatar.tsx` / `AppAvatar.tsx` runs one full `client(clientId)` query per row (N+1). It is used in kraph's metrics table, elektro's history card and mikro's provenance entries. It can't be batched the way `lok/lib/userChips.ts` batches users.

### Memberships: filters and counts (perf)
- **Add:** `MembershipFilter.role: ID` / `isAdmin: Boolean`, pagination on `Organization.memberships`, and a member count per role.
- **Workaround:** `lok/pages/TeamHomePage.tsx` with `lok/lib/teamRoles.ts` fetches every membership, then groups, searches and counts on the client.

### Membership requests: filter, status enum (perf)
- **Add:** `membershipRequests(filters: { status }, pagination:)` with a `MembershipRequestStatus` enum.
- **Workaround:** `lok/pages/TeamHomePage.tsx` downloads the whole answered history and keeps `pending`. The query is also kept apart with `errorPolicy: "ignore"` so an older lok without the field doesn't break the page. That swallows real errors too; a capability or version flag would fix it.

### `Membership.createdAt` and `MembershipOrdering.createdAt` (blocks a feature)
- **Blocks:** a "New this month" section of the newest members on the Team page. Accepted invites are not used as a stand-in.

### The active membership on `Context` (perf)
- **Add:** `Context.membership: Membership` and/or `MembershipFilter.organization`, and optionally a resolved `Context.brandHue` / `brandChroma`.
- **Workaround:** `lok/lib/membershipBrand.ts` and `lok/pages/UserPage.tsx` fetch a user's memberships across organizations and `.find` the active one, merging brand colours field by field.

### Smaller lok gaps
- **Invites by collaboration (perf):** `InviteFilter.collaboration { instance collaboration }` and `valid: Boolean`. `lok/operations.ts` (`lok.collaborationLinks`) fetches every invite and filters on the client.
- **App by identifier (perf):** `AppFilter.identifiers: [AppIdentifier!]`. `lok/options.ts` (`@lok/app` options) fetches every app and matches on the client.
- **Media access grants (cosmetic, unverified):** an access grant on lok's `MediaStore`, as dokuments, kuvert and bank have. Every avatar is a server-signed `presignedUrl` cached in Apollo. `Organization.avatar` (documented "prefer `profile.avatar`") is still read as a fallback, and is the only logo in `ListOrganization`.
- **Message and request events (cosmetic):** `myMessages` / `membershipRequests` subscriptions. `lok/dashboard/MessageNotifications.tsx` and the Team page refresh only on focus.
- **Hub health event (cosmetic):** a `hubHealth` subscription. `app/settings/pages/ServicesPage.tsx` polls every 30 s.
- **Mesh alias push (correctness, connectivity):** a fakts/lok protocol gap, not GraphQL. lok leaves a mesh alias out of fakts while it cannot resolve the hub node, and nothing pushes it back. While a service stays down, `core/connection/arkitekt/controller/controller.ts` forces a token or fakts refresh at most every 5 minutes.

---

## bank

### Holdings of one depot on a past day (cosmetic, precision)
- **Add:** `mergedPositions` for one depot as of a day (`portfolioInsights(accounts:, asOf:)`), or the same fields on `holdings(asOf:)`.
- **Workaround:** the portfolio uses the server's `mergedPositions`. `bank/pages/AccountPage.tsx` still sums one depot's snapshot (today's or a past day's) with `components/holdings/holdings.ts`, in floating point.

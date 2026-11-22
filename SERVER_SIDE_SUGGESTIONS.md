# Server-side suggestions

**Status: resolved (2026-11-22).** Every entry that needed a server field has
shipped, and the client calls it. What is left below is closed without server
work and kept as a record: notes, a declined proposal, and items deliberately
not pursued. Add new gaps as new entries.

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

## Closed without server work

### mikro: anchor panels list every anchor (note)
- `SparseAnchorsOverlay.tsx`, `TableAnchorsOverlay.tsx` and `AnchorMetadata.tsx` list every anchor of a dataset or lens on purpose: they are reference views, and `AnchorMetadata` has an "out of view" section. `activeAnchors(within:, pagination:)` is there for a list that should follow a viewport (elektro's `ChannelMetadata` uses it).

### mikro: landmark registration (declined)
- A server `registerByLandmarks`. `mikro/components/registration/math/solvers.ts` fits the affine on the client, which is enough: nothing on the server needs the fit, and the result is written as an ordinary edge.

### mikro: pyramid level scale (resolved)
- The 3D renderer places levels by the server's `DataArray.relativeScale` (`statedLevelScaleFactors` in `mikro/components/scene/platform/coords/levelGeometry.ts`). `core/data/scene/coords/levelScale.ts` stays: it is the fallback for a level whose edge is not affine, and elektro's timeline, which has no such field, uses it.

### rekuest: blok dependency pickers poll (not pursued)
- `components/blokDependencyBindings.tsx` polls candidate agents every 15 s and picked agents every 10 s. Why was never established, so no event was designed for it.

### kabinet: sort by most actions (not pursued)
- The store's "Most actions" sort stays dropped; an `AppOrder` by the newest release's action count would bring it back. Its bloks, search and totals are the server's (`AppFilter.bloks`, `search`, `appStoreTotals`).

### kabinet: approvals (note)
- `components/store/StoreParts.tsx` works out "installed by me" from one release's own `approvals`, a short list that is not paged, so it is not a page-bound filter. `ReleaseApprovalFilter.approver` is there for a list of approvals across releases.

### lok: media access grants (deferred)
- An access grant on lok's `MediaStore`, as dokuments, kuvert and bank have. Every avatar is a server-signed `presignedUrl` cached in Apollo. `Organization.avatar` (documented "prefer `profile.avatar`") is still read as a fallback, and is the only logo in `ListOrganization`. Cosmetic, and a new store contract for one service.

### lok: mesh alias push (deferred)
- A fakts/lok protocol gap, not GraphQL. lok leaves a mesh alias out of fakts while it cannot resolve the hub node, and nothing pushes it back. While a service stays down, `core/connection/arkitekt/controller/controller.ts` forces a token or fakts refresh at most every 5 minutes. Belongs to the fakts protocol.

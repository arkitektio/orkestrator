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

### Pyramid level scale (low)
- **Server:** `DataArray.relativeScale` exists.
- **Kept on the client:** `core/data/scene/coords/levelScale.ts` still derives the factors from `toParent` edges, because it is shared with elektro's timeline, which has no such field. Switch mikro's reads to `relativeScale` once elektro exposes the same field.

### Anchor panels list every anchor (note, not a workaround)
- `SparseAnchorsOverlay.tsx`, `TableAnchorsOverlay.tsx` and `AnchorMetadata.tsx` list every anchor of a dataset or lens on purpose: they are reference views, and `AnchorMetadata` has an "out of view" section. `activeAnchors(within:, pagination:)` is there for a list that should follow a viewport (elektro's `ChannelMetadata` uses it).

### Declined
- **Landmark registration (declined):** a server `registerByLandmarks`. `mikro/components/registration/math/solvers.ts` fits the affine on the client, which is enough: nothing on the server needs the fit, and the result is written as an ordinary edge.

---

## rekuest

### Fit changes for blok dependency pickers (perf, unverified)
- **Workaround:** `components/blokDependencyBindings.tsx` polls candidate agents every 15 s and picked agents every 10 s. That may be to catch changes in which agents fit, which no event reports (unverified).

---

## kabinet

### Sort by most actions (cosmetic)
- **Add:** an `AppOrder` by how many actions an app's newest release brings.
- **Workaround:** none: the store's "Most actions" sort was dropped rather than computed over a page. Its bloks, search and totals are the server's (`AppFilter.bloks`, `search`, `appStoreTotals`).

### Approvals (note)
- `components/store/StoreParts.tsx` works out "installed by me" from one release's own `approvals`, a short list that is not paged, so it is not a page-bound filter. `ReleaseApprovalFilter.approver` is there for a list of approvals across releases.

---

## lok

### Deferred
- **Media access grants (cosmetic, unverified):** an access grant on lok's `MediaStore`, as dokuments, kuvert and bank have. Every avatar is a server-signed `presignedUrl` cached in Apollo. `Organization.avatar` (documented "prefer `profile.avatar`") is still read as a fallback, and is the only logo in `ListOrganization`. Deferred: cosmetic, and a new store contract for one service.
- **Mesh alias push (correctness, connectivity):** a fakts/lok protocol gap, not GraphQL. lok leaves a mesh alias out of fakts while it cannot resolve the hub node, and nothing pushes it back. While a service stays down, `core/connection/arkitekt/controller/controller.ts` forces a token or fakts refresh at most every 5 minutes. Deferred: it belongs to the fakts protocol, not to this list.

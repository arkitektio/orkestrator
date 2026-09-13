# The fabriks mesh renderer

Renders a `MeshLayer`'s collection: segmentation surfaces stored as a
[fabriks](https://github.com/jhnnsrs/fabriks) prefix — a self-describing tree of
Parquet files — streamed **one row group at a time** and anchored to a
coordinate system in the scene's transform graph (see
`../../COORDINATE_SYSTEMS.md`; planning discipline inherited from
`../../OCTREE_RENDERER.md`).

fabriks is the format's own specification and is authoritative. This document
describes the *client*: how the prefix is read, and every decision the format
leaves to a renderer.

## The big picture

```
MeshLayer.collection  ──►  fabriksSource.openFabriksCollection()
        │                    prefix + general grant → FabriksStore
        ▼
   GET <prefix>/fabriks.json        (grid, encoding, every file + its LENGTH)
        │
        ▼
FabriksCollectionLayer.tsx ── resolveCollectionMatrix()
        │                     (graph compose of the layer's pathToWorld — nothing else)
        │  camera SETTLE (vanilla viewStore subscription — never per frame)
        ▼
FabriksCollectionManager.updatePlan()
        │
        ├─ GET catalog/cells.parquet     ONE whole-file read, once
        │      └─ buildFabriksCellIndex() boxes → WORLD space, lodError scaled
        │
        ├─ planFabriksCells()   pure: descend from the coarsest level, keep a
        │                      cell when its SCREEN ERROR fits the budget, else
        │                      descend into the children `child_mask` names.
        │                      Budget exhaustion COARSENS; it never drops.
        │
        └─ groupByRowGroup()  ─►  FabriksCollection.readFetchGroup()
                        │           footer once per part (cached), then the
                        │           byte span of the row group alone
                        ▼
                  decodeGeometryRow()   BLOB → dequantized Float32 positions,
                        │               Uint32 indices, per-vertex ordinals
                        ▼
                  BufferGeometry per cell (no normals by default — the
                        │                  material shades flat by derivatives;
                        │                  bounds come from the catalog)
                        ├─ LruByteCache (plan-protected, evict → dispose)
                        └─ ONE BatchedMesh per collection (fabriksBatch.ts)
                             + invalidate()   (demand frameloop)
```

## Module boundaries (one concern per file)

| File | Owns | Knows nothing about |
| --- | --- | --- |
| `fabriksManifest.ts` | `fabriks.json` → typed manifest; every refusal | HTTP, Parquet, three |
| `mortonCell.ts` | Morton cell codes | the rest of the world |
| `fabriksGrid.ts` | cell → grid box, `child_mask` descent | Parquet, three |
| `rowValues.ts` | Parquet cell values → numbers/bytes; the only bigint site | everything |
| `fabriksStore.ts` | authenticated whole-object + **ranged** GETs, rotation, 403 retry | Parquet, planning |
| `parquetPart.ts` | one part's footer + row-group reads | fabriks semantics, three |
| `fabriksCatalogs.ts` | the two catalogs; the WORLD-space cell index | HTTP, three objects |
| `fabriksDecode.ts` | blobs → typed arrays (dequantize, stride, meshopt, zstd) | HTTP, three |
| `fabriksPlanner.ts` | which cells at which level; row-group grouping | fetching, drawing |
| `fabriksCollection.ts` | the read plan: which file, which row group, which columns | three, React |
| `fabriksSource.ts` | API node → prefix + credentials | everything above |
| `fabriksBatch.ts` | the BatchedMesh: capacity, slots, compaction | plans, fetching, caches |
| `fabriksManager.ts` | THREE objects, reconcile, abort generation | React, HTTP, bytes |
| `fabriksColorLut.ts` | stored colorBys/filterBys → one ordinal-indexed RGBA8 texture | THREE materials, React |
| `FabriksCollectionLayer.tsx` | lifecycle, transforms, settle cadence | everything above's internals |

## Why there is no DuckDB here

The v1 renderer issued SQL against a list of Parquet shards. fabriks's cell
catalog names the `(part, row_group)` holding every cell, and this path reads
exactly that locator with `hyparquet` instead of SQL.

Two arguments this section used to make are **no longer true** and must not be
re-cited (re-verified 2026-08): DuckDB ≥ 1.2 pushes filters on the
`file_row_number` virtual column down to row-group pruning
(duckdb/duckdb#15736), so a `WHERE file_row_number BETWEEN …` over the row
ranges from `parquet_metadata()` does address a row group; and duckdb-wasm can
cancel streamed queries (`cancelPendingQuery` / `cancelSent` — though a
materializing `query()` still cannot be cancelled). The reasons that DO still
hold, and are why the render path stays SQL-free:

- **The heavy decode is not SQL's to run.** Meshopt decode, uint16→float32
  dequantization and ordinal expansion are the dominant cost, and they operate
  on BLOB columns DuckDB can only hand back verbatim — the engine would only
  relocate the parquet-decompress slice.
- **Transport control.** `parquetPart` reads a row group as ONE ranged GET
  served from `FabriksStore`'s range-keyed byte LRU, with the 403-rotate-retry
  and range-ignored-gateway guards; DuckDB's httpfs issues its own footer and
  per-column reads outside all of that.
- **Contention.** The attribute engine serializes work on one connection;
  geometry streaming would queue behind hover lookups and LUT scans, and its
  cancellation is per-connection, not per-cell.

DuckDB is still the app's Parquet engine for the table UI and
`lib/attributes` — it just is not on the render path.

## The colour LUT — where DuckDB *is* on this path

The exception to the section above, and it does not contradict it: the LUT
reads a **table's** parquet, never the collection's. `fabriksColorLut.ts` turns
a mesh layer's stored `colorBys` / `filterBys` into one RGBA8 texture indexed by
the dense object ordinal — `rgb` is the active colouring, `a` is visibility
under the AND of the active rules — and hands it to `fabriksMaterial.ts` as a
single bind. Row-group addressing is irrelevant there: a full-column scan is
exactly what SQL is for, and the read reuses the attribute engine's connection,
grants and per-store scoped secrets (`lib/attributes/lookupEngine.ts`,
`readAcross`).

What is load-bearing:

- **Ordinal-indexed and 2D.** Object ids are sparse and would size the texture
  by the largest id; ordinals are dense and are what the vertices carry. They
  run to 2^24, past any backend's max texture dimension, so the ordinal
  decomposes into `(ordinal % LUT_WIDTH, ordinal / LUT_WIDTH)` on both sides —
  `LUT_WIDTH` is the shared constant, and the shader samples the texel CENTRE
  because NEAREST on a boundary is a coin flip between two objects.
- **Filtering is fragment `Discard`, never a change to the batch.** The batch's
  slots and the LOD cache are planned by what is RESIDENT (P13), so removing
  filtered objects would re-plan and re-fetch on every toggle. Discard
  over-rasterizes; that is the right trade.
- **Both modes are uniforms.** `lutColorize` and `lutFilter` gate an
  unconditional texel fetch, so switching a colouring or a rule on and off is a
  `.value` write, exactly like selection — never a pipeline rebuild.
- **The table's store and key column come from an ATTRIBUTE PLAN**, not from a
  second query: a plan for this collection already names the parquet and the
  column an object id binds to. Where no mesh-sampled plan reaches an entry's
  table, the entry is skipped and named in `skipped` (logged by the layer) —
  loud, never a silently wrong join.
- **Joins are not executed.** The server publishes the key column for the base
  table only; each `references` hop target's key would have to be inferred, and
  a wrong join key returns the wrong rows rather than an error. Joined entries
  are authored and stored fine and marked `*` on the card.

## Performance rules encoded here

- **One footer per part, per session.** `ParquetPart` memoizes the parsed
  metadata, so the second cell out of a part costs only its row group. This is
  the asymmetry fabriks's 512 KiB row-group sizing is chosen against.
- **Fetch by ROW GROUP, not by cell.** A row group is the smallest thing a
  reader can fetch and a plan routinely puts several cells in one, so
  `groupByRowGroup` dedupes before any I/O.
- **One ranged GET per row group.** hyparquet slices per column chunk and a
  geometry row group has ten columns, so the raw reader would pay ten small
  authenticated round trips per group. `ParquetPart.readRowGroup` prefetches
  the group's whole byte span (column chunks of one row group are contiguous)
  and serves hyparquet's slices from it.
- **A few row groups in flight.** The drain runs `CONCURRENT_FETCHES` workers
  pulling from one near-first cursor: priority order is preserved, round trips
  overlap instead of summing, and every worker checks the plan generation.
- **Range reads are signed.** `fetchS3Path` folds caller headers into the SigV4
  canonical headers, so a `Range` header is covered by the signature. A gateway
  that answers 200 to a ranged request is detected (no `Content-Range`) and
  sliced locally rather than handed to the Parquet reader at the wrong offset.
- **Planning runs at camera-SETTLE cadence** (vanilla store subscription, no
  React re-render per batch — OCTREE_RENDERER.md P17), and eviction goes through
  a byte-bounded LRU whose callback disposes GPU buffers (P13). The current
  plan's cells are protected.
- **Superseded work is abandoned.** Every drain carries a generation; a replan
  bumps it and a stale drain stops at its next await. (The v1 path had no abort
  at all — it decoded and mounted the whole superseded batch.)
- **The object catalog is lazy.** Nothing needs it to draw; it carries the
  format's only `list<struct<>>`, and identity questions are rare.
- **A placement change never rebuilds the manager.** The layer keeps its matrix
  VALUE-stable (identity churn from unrelated store writes used to rebuild the
  manager and refetch every cell), and `setVoxelToWorld` rebuilds only the
  world-space index from kept catalog rows — the caches hold voxel-space
  geometry and survive any placement.
- **No normals by default.** Per-cell smooth normals seam at cell borders
  (only the writer, with whole-object connectivity, could fix that), so the
  material shades flat via screen-space derivatives and carries no normals at
  all. Smooth mode computes them in the DECODE WORKERS
  (`computeSmoothNormals` in `fabriksDecode.ts` — three's
  `computeVertexNormals` math exactly, kept in lockstep because the manager
  still uses three's as the fallback when a toggle races a fetch); only the
  flat→smooth retrofit of already-cached cells runs on the main thread.
  Bounding volumes come from the catalog's boxes, not a walk over positions.
- **One render object per collection.** Mounted cells live in a single
  `THREE.BatchedMesh` (`fabriksBatch.ts`): on the WebGPU backend that is one
  pipeline + bind group with a per-range draw loop and PER-INSTANCE frustum
  culling from the analytic bounds, where per-cell `Mesh` objects cost a
  render object, a bind group and a render-list sort entry each. BatchedMesh's
  allocator only appends — deleted ranges return via `optimize()` or a
  capacity rebuild, both owned by `fabriksBatch.ts`. The per-cell path
  survives behind the panel's `batched` toggle as the A/B fallback.
- **Two plan budgets.** `maxCells` caps cell count; `maxIndices` caps what the
  cells weigh. Both coarsen, never drop. `pixelBudget` and the budgets are
  runtime knobs (`setPlanConfig`), steered from the debug panel between
  settles.
- **Everything is instrumented.** `FabriksStore` counts requests,
  `FabriksCollectionManager.stats` times plan/stream/build, and
  `buildDebugReport()` feeds the DebugPanel's "Fabriks Mesh" section and the
  copy-able octree debug report (`fabriks` key) — the
  `BrickResidencyManager` idiom.

## Client-side decisions the format leaves open

- **Planning happens in WORLD space.** `lodError` and the catalog's boxes are in
  voxels, and voxels are not world units — with a 5× z-step, planning in voxel
  space is wrong by 5× in exactly the direction that matters. So
  `buildFabriksCellIndex` transforms the boxes once at load and scales `lodError`
  by the matrix's **max** basis length (an LOD error is a scalar under an
  anisotropic map; the max can only over-refine, never under-refine).
- **Hysteresis.** fabriks's planner has none. This one runs at settle cadence, so
  a camera parked on the budget threshold would flip a region between levels —
  and refetch it — on consecutive plans. A cell that was drawn last time keeps a
  looser budget (`LOD_HYSTERESIS`, ±15%); one that was not must clear a tighter
  one.
- **Roots.** fabriks takes roots at the *declared* `grid.levels - 1`, which plans
  nothing when a collection declares more levels than its catalog reached. We
  fall back to the coarsest level present and warn — an empty render is the
  worst possible reading of a collection that has geometry.
- **Ordinals, not ids, on the GPU.** The per-vertex attribute carries the dense
  `ordinal` as **Float32**. An integer vertex attribute needs
  `gpuType = THREE.IntType` on WebGL2 and a `uint` TSL declaration on WebGPU;
  a float needs neither and is exact to 2^24 — which is also fabriks's own
  ordinal ceiling.

## Byte-contract traps (each is silent corruption, not an error)

- **`utf8: false` on every Parquet read.** hyparquet defaults it to *true* and
  treats any bare `BYTE_ARRAY` as a string — which is exactly what `positions`
  and `indices` are. `rowValues.toBytes` throws with this explanation if it ever
  sees a string.
- **Position stride is codec-dependent**: 6 bytes for `codec: NONE` (three bare
  uint16, no padding), 8 for `MESHOPT` (padded to four components for meshopt's
  stride rule, fourth dropped on decode).
- **Object offsets are START offsets of length n, not n+1 fenceposts.** Object
  `k` spans `[off[k], off[k+1] ?? total)` — hence `objectRange` rather than
  inline arithmetic.
- **Uint16 indices are gated on `vertexCount`, not on `encoding.indices`.**
  Indices address the cell's *concatenated* vertex array, which can exceed
  65535 even when the writer declared UINT16.
- **Per-blob ZSTD length comes from the row's counts** (`6·vertexCount`,
  `4·indexCount`) — the frame carries none. This is why the format refuses to
  pair ZSTD with MESHOPT.

## Credentials are their own kind

fabriks has its **own** grant — `requestGeneralFabriksAccess` — and a zarr grant
does not authorize a fabriks prefix. So `getGeneralAccess` is keyed by
`(client, kind)`: the two coexist in the cache instead of evicting each other,
and a fabriks caller can never be handed the zarr grant that happened to be
warm. Both are bucket-wide, so one round-trip still covers every store of a
kind, and both produce the same `S3FetchConfig` shape — `buildS3FetchConfig`
consumes either without knowing which it was given.

One grant covers a whole prefix: the manifest, both catalogs and every level.
`access.test.ts` asserts the separation directly, including that forcing a
refresh of one kind leaves the other untouched.

**A 403 here is usually not about credentials.** fabriks is the only reader in
the app that fetches by *overlapping byte ranges* — a Parquet footer, then a row
group running to EOF over the same tail — and `range` is a SigV4-signed header
that the browser's cache is allowed to rewrite before the request leaves. That
combination produces a `SignatureDoesNotMatch` on the geometry read while every
other store in the app keeps working. It is fixed in `s3-request.ts`
(`cache: 'no-store'` for ranged requests); the mechanism, the diagnosis recipe,
and the long list of things that are *not* the cause are in
`lib/zarr/runner/SIGV4_SIGNING.md`. Start there before suspecting the grant.

## Spec version — deliberately not gated

`manifest.specVersion` is parsed and kept, and nothing refuses on it.

The writer and the deployment are both at **1**, and the format's changes so far
— the manifest, the row-group locator, the object catalog — landed inside that
version rather than bumping it. So the label carries no decision today, and
gating on one that has never moved would only be a way to reject a collection
over a string.

What actually determines how bytes are read is the **`encoding` block**, and
that is validated strictly: every key required (a missing one is fatal, never
defaulted), every value checked against the format's vocabulary, and the
undecodable `MESHOPT` + `ZSTD` pair refused outright. A wrong `codec` is garbage
geometry; a surprising version string, on its own, is not.

If the version starts carrying meaning, `parseFabriksManifest` is the one place
to reinstate a check.

## Fixtures

`__fixtures__/` holds three collections written by **fabriks itself** (see
`generate.py`) — `raw`, `zstd` and `meshopt` — with a deliberately small row-group
budget so parts carry several row groups and the locator is actually exercised.
Testing the decoder against the real writer rather than against our reading of
the spec is what caught the stride and the offset conventions.

Regenerate with `python __fixtures__/generate.py <out>` in an environment with
`fabriks`, `trimesh` and `meshoptimizer` installed.

## Known gaps

- **The server has no `FabriksStore` yet.** `fabriksSource.ts` derives the prefix
  from the catalog object's key and borrows the general *parquet* grant. That
  file is the whole shim; when `MeshCollection.store: FabriksStore!` lands it
  becomes `collection.store.key` and grant kind `"fabriks"`, and nothing else
  changes.
- ~~Axis slots are assumed to match axis names.~~ **Closed** for stores that
  declare `store.axes`: `resolveCollectionMatrix` now names the INPUT side of
  the server's `asAffine` by the declared slot order and the OUTPUT side by
  the world's axes, so a `(z, y, x)` store lands on world z/y/x by name
  (pinned in `collectionPlacement.test.ts`). A store with no declaration
  still assumes the CS's last three axes are slots 0, 1, 2 (warned once).
- ~~Decode is main-thread.~~ **Closed**: the CPU half of a row-group read —
  hyparquet parse, per-blob decompress, meshopt decode, dequantize, ordinal
  expansion — runs in fabriks's **own** small worker pool
  (`fabriksDecodeCore.ts` / `fabriksDecode-worker.ts` /
  `fabriksDecodeDispatcher.ts`; not the zarr `WorkerPool`, whose slots are
  untyped and cannot answer fabriks messages). The FETCH stays main-thread:
  the span goes through `FabriksStore`'s byte cache and credential rotation,
  and it structured-clones to the worker — never transfers, which would
  detach the cached bytes. Node/vitest (no `Worker`) falls back to the same
  pure decode inline.
- **A colouring or rule reached through a JOIN does not render.** See the
  colour-LUT section above: direct entries only, joined ones are authored,
  stored and badged but not executed.
- **A hidden layer keeps its memory.** `visible: false` goes through
  `FabriksCollectionManager.setVisible`, which stops planning and abandons the
  in-flight drain but deliberately retains the byte cache, geometry LRU, open
  footers and batch — that is what makes a re-show a cache replay instead of a
  re-download. Unmounting the layer (scene close) still disposes everything.

## The writer (`writer/`) — designed collections

The mesh designer (`features/meshDesign`) bakes its meshes into a fabriks
prefix IN THE BROWSER and uploads it (`requestFabriksUpload` → PUT every
file → `fabriks.json` last → `finishFabriksUpload` → `createMeshCollection`).
`writer/fabriksBake.ts` inverts the reader's byte contract; `parquetWrite.ts`
emits the exact Parquet schema the Python producer does (asserted element by
element against `__fixtures__/raw` in `fabriksBake.test.ts`, alongside a
round-trip through this reader).

What a browser-written collection is, and is not:

- **Single level.** `grid.levels = 1`, every cell a level-0 leaf, no LOD
  pyramid. `decimation: "CUSTOM"` in the manifest and
  `provenanceMetadata.needsConsolidation` on the collection flag it for the
  server-side job that builds a real pyramid into a new version later.
- **Always drawn whole.** `planFabriksCells` accepts a level-0 cell before
  consulting any budget — `maxCells`/`maxIndices` only gate REFINEMENT — so a
  single-level collection can never coarsen or drop; frustum culling is the
  only lever. The bake therefore splits into many small cells
  (`maxIndicesPerCell`, default 60k) so culling has something to cull, and the
  design session caps its own triangle count. Nothing in the planner changes;
  `fabriksBake.test.ts` pins the behaviour ("every level-0 root is planned
  even with `maxIndices: 1`").
- **Clipped, not clamped.** A vertex outside its cell's grid box cannot be
  quantized, so triangles straddling a cell boundary are clipped against each
  box they overlap (Sutherland–Hodgman) and re-welded per cell on quantized
  coordinates. The boundary plane quantizes to `65535` on one side and `0` on
  the other, and `65535/65535 · extent + min` is exactly the neighbour's
  `min`, so seams close bit-for-bit.
- **Non-negative frame.** Morton codes need non-negative cell coordinates, so
  the bake translates by `-floor(bboxMin)` and the commit records that as a
  TRANSLATION edge into the scene's world (`meshDesign/commitDesign.ts`).
- **One cell when it can be.** The designer bakes `cells: "single"` whenever
  the uint16 step stays under 0.05 voxel: objects then never straddle a cell
  border, so the reader's per-cell smooth normals (`computeSmoothNormals`,
  which seam at borders on multi-cell collections) are exact, and the layer
  is registered `shading: SMOOTH`, which seeds the session's `flatNormals`
  (`meshLayerDefaults.ts`). Larger designs fall back to the auto grid and
  seam like any other collection in smooth mode.
- **Never edited in place.** Fabriks is append-hostile (row groups, manifest
  byte lengths, ordinals, LOD ancestors). Editing = `meshDesign/loadCollection.ts`
  extracts objects at the finest level, welds the LOCKED-border duplicates
  back together, and a commit writes a NEW collection `derivedFrom` the old.

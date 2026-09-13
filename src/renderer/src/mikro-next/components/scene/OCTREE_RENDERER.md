# The pyramidal octree (brick pool) renderer

Design notes for the scene renderer. It replaced both legacy paths — the
per-chunk 2D tile meshes (`ChunkPlane`) and the monolithic single-LOD 3D
volume texture (`VolumeTextureMesh`), both deleted at cutover — with one
hierarchical, view-dependent streaming system in the style of
Neuroglancer / BigVolumeViewer.

This document has two halves: **concepts** (how it works, and why each piece is
shaped the way it is) and **pitfalls** (everything that bit us during live
testing, so nobody re-learns it).

Sibling documents: `COORDINATE_SYSTEMS.md` — how the RFC-5 coordinate-system
graph (server edges → client-composed `LayerState.affineMatrix`, per-level
scales from `toParent`) feeds this renderer; `features/meshes/fabriks/README.md` — the
mesh-collection renderer (fabriks prefix, Parquet row-group streaming) built on
the same graph and the same planning discipline; `CINEMATIC_MODE.md` — an **unimplemented
proposal** for lit (shaded) volume rendering, which leans on §2.3's 1-voxel
brick border to take a gradient without extra page-table walks.

---

## 1. The big picture

```
camera / z / mode / view ranges
        │
        ▼
  nodePlanTracker ──────────── planLayerNodes() ──► LayerNodePlan (per layer)
  (debounced driver)           (pure, tested)          │
                                                       ▼
  BrickResidencyManager.reconcile(plan)
        │  diff vs. resident set
        ├─ abort fetches for dropped bricks
        ├─ enqueue missing bricks (priority: coarse-first, then plan order)
        │
        ▼
  fetch zarr chunks (worker pool, shared in-flight, byte-LRU cache)
        │
        ▼
  repackBrick(): chunks ─► canonical x-fastest brick buffer (+border, +channels)
        │
        ▼
  drainUploads() in useFrame (byte/brick budget per frame)
        ├─ writeTexture into the layer's brick ATLAS (one Data3DTexture)
        ├─ page-table mirror write + flush (RGBA8UI Data3DTexture)
        └─ residencyVersion++ → invalidate()
        │
        ▼
  shader: sampleBrick(p, desiredLevel, ch)
        page-table texelFetch ─► resident? sample atlas slot
                              ─► empty?    return uniform fill value
                              ─► unmapped? walk to coarser levels (per SAMPLE)
```

The per-sample coarse fallback in the shader is the keystone: it is what lets
the planner have only two roles (`target`, `keep`) and removes the entire
cover/substitute/render-feedback machinery the legacy 2D planner needed.
Anything not yet streamed simply renders coarser, per pixel, with no CPU
involvement.

**2D is not a separate renderer.** It is the degenerate case of the same
system: the plan is a quadtree over a single z-slab, bricks are `256×256×1`
slabs, and the plane material composites with the same `sampleBrick` tap.

---

## 2. Concepts

### 2.1 Level geometry (`platform/coords/levelGeometry.ts`)

`buildLayerLevelGeometry(dims, layer, allLevels)` normalizes a layer's zarr
pyramid into canonical `[x, y, z]` spatial order with per-level scale factors.
Scale resolution order: factors derived from the levels' `toParent` transform
edges (`relativeLevelScaleFactors` — absolute RFC-5 scales divided by level 0;
see COORDINATE_SYSTEMS.md §3.2) → shape ratio vs. base → `2^levelIndex`
(z falls back to 1, matching typical microscopy pyramids that never
downsample z). `buildLevelSources` is the ONE `LevelSource[]` builder — the
plan tracker, residency manager and pool-viability probe all go through it.

True (non-nominal) factors mean adjacent levels need not divide evenly
(z 36→4 levels give 4→9 = 2.25×): the addressing already tolerates this (no
power-of-two assumptions), but the DFS can visit a straddling child from two
parents — and the per-level half-voxel TRANSLATION on the `toParent` edges is
parsed but deliberately not yet consumed (corner-aligned sampling, the
pre-migration status quo). Both land together as the planner/shader/probe
lockstep change; see COORDINATE_SYSTEMS.md §3.2.

Channel count is `min(16, intensity extent)` — 16 is the compositor limit
shared with the legacy path.

**Duplicate levels are deduped by spatial shape.** Real datasets ship two
level-0 `dataArrays` (one with `scaleFactors: null`, one with `[1,1,1,1]`)
pointing at different stores. Without dedupe the planner planned — and the
residency manager fetched — the same voxels twice (see pitfall P6).

### 2.2 Node addressing (`features/bricks/octree/nodeAddress.ts`)

A node is one brick on one pyramid level, keyed `"level:bx:by:bz"` on that
level's own brick grid. Channels are **not** part of the key — all channels of
a brick live stacked inside one atlas slot. Non-spatial dims (t, extra slices)
fold into the layer's slice signature; a signature change flushes the layer's
residency wholesale. `currentZ` is deliberately NOT in the signature — z is a
spatial axis of the brick address (the page table holds every slab), so
z-scrubbing keeps residency and revisited slabs render instantly (see P15).

**Dim sliders (t, tau, …)** ride exactly this contract: `DimSliderPanel`
writes `viewerStore.dimSelections[dim]` (scene-wide by dim NAME), which
enters `buildSliceSignature` for layers that actually collapse that dim
(`collapsibleDims`) → debounced replan → signature mismatch → pool flush +
refetch at the new index (`resolveFixedDimIndex` in the `ensurePool`
fixed-index collapse). Flushing is CORRECT here — a different t is different
data in every brick — and scrubbing back to a recent index re-repacks from
the decoded-chunk byte-LRU without refetching. Layers without the dim keep
their signature and are untouched. Deliberate non-features until proven
needed: t as a brick/page-table axis (would make t-scrubbing flush-free like
z, at a multiplied atlas/page cost), anchor labels / physical-time display on
the slider (needs the TIME calibration edge).

**The sliders are not brick-only.** Which dims exist is a scene-wide question,
and every layer kind answers it through one protocol — `DimExtent`
(`platform/model/dimExtents.ts`): a dim NAME, how far it runs, and where it
starts. The split is DECLARED vs OBSERVED, not brick vs non-brick:

- **Declared**, from a fragment, derived by the panel. Every lens-backed layer,
  brick or not — a vector field is a Lens over an array exactly as an image is
  (the `NonBrickLensTypename` carve-out), and reads its own frame through the
  same `resolveFixedDimIndex`, settled at 200 ms so it lands with the bricks.
  Derived rather than published because `LayerRenderer` culls by GPU budget and
  remounts on a mode toggle: a slider tied to a renderer effect would vanish
  under budget pressure and flicker on a 2D/3D switch.
- **Observed**, from the data, published into `sceneStore.layerDimExtents` by
  the renderer that read it. Table-backed layers — tracks, points — whose time
  is a parquet COLUMN and whose timeline is unknowable until the scan returns.
  Rows resolve to timeline INDICES (`platform/model/timeline.ts`) so a table and
  the image it was tracked on share one slider whatever the column's units were.

Ranges merge by dim name and widen to the longest contributor; per-layer clamping
means an out-of-range step keeps a shorter layer's signature unchanged and never
re-flushes it. Adding a layer kind means publishing extents, not editing the panel.

**A brick is not a zarr chunk.** The fetch unit stays the zarr chunk (keeps
the worker pipeline and caches untouched); `chunksTouchingBrick` maps a brick's
fetch box to the 1–N chunks that intersect it, and repack cuts the brick out of
the decoded chunks.

### 2.3 Brick spec (`features/bricks/octree/brickSpec.ts`)

Per (layer, mode):

- **3D:** payload `64³`, border 1 (stored `66³`), LinearFilter. The 1-voxel
  border is edge-replicated at volume boundaries and is what makes
  linear-filtered inter-brick seams invisible.
- **2D:** payload `[256, 256, 1]`, border 0, NearestFilter — pixel-parity with
  the legacy `ChunkPlane` look.

The payload auto-doubles per axis until every level's *page grid* fits the 3D
texture limit (2048 under ANGLE). In 2D the z payload only doubles when the z
page grid itself exceeds the limit — otherwise 3000-slice stacks force
pointless fat slabs (pitfall P1).

### 2.4 Page table (`features/bricks/octree/pageTableLayout.ts`, `features/bricks/gpu/pageTableTexture.ts`)

One packed `RGBA8UI` `Data3DTexture` per (layer, mode). **All pyramid levels
live in this single texture**, stacked along one axis with per-level
`uPageOffset[level]` uniforms, because GLSL ES 3.0 forbids indexing a sampler
array with a non-uniform value — one texture with offsets is the only way to
walk levels in a per-sample loop.

A texel is `(slot.x, slot.y, slot.z, flag)` with flag ∈
`{0 UNMAPPED, 1 RESIDENT, 2 EMPTY}`. `EMPTY` marks a uniform-fill brick: it
consumes **no atlas slot**; its fill value is encoded 8-bit into the R channel
(raw value, see pitfall P11). CPU `Uint8Array` mirrors per level with dirty
flags; dirty levels are re-uploaded whole (they are tiny).

**Occupancy sidecar.** A second RG8 texture with the same layout carries each
RESIDENT brick's raw `[min, max]`, 8-bit-quantized against the pool's
**occupancy encode range** with conservative rounding and an INVERTED max byte
(`encodeOccupancyTexel` in `features/bricks/octree/brickEncoding.ts`) — a byte of 0 on
either channel is the "unbounded on that side" sentinel decoding to the POOL
endpoint, so the all-zero texel (fresh texture, or a GPU-repacked brick whose
async min/max readback has not landed yet) means "unknown, never skip". The
min/max comes from the repack scan both paths already run; `pool.brickRanges`
keeps the raw values so any range move re-encodes the sidecar exactly like
the EMPTY entries. This feeds the raymarcher's resident-brick skip (§2.10).

Under `orkestrator.occObservedRange` (default ON, captured at pool creation,
intensity pools only) the encode range is the running union of every landed
brick range instead of the pool/dtype range — on dim integer data the
dtype-range encoding collapses every brick into a handful of 257-raw-unit
codes and the MIP maximum-culling never fires (F3). The load-bearing
invariant is decode range ≡ encode range: the shader's `uOccDecodeMin/Range`
uniforms are pushed on every `poolsVersion` bump (BrickVolumeLayer's
decode-uniform effect), and a range PROMOTION runs a two-drain protocol —
the promote drain blanks every texel to the sentinel (conservative under
any uniforms), promotes the encode range and bumps poolsVersion
unthrottled; the next drain, after the uniforms had a frame to land,
re-encodes the real texels from `brickRanges`. Bricks landing while the
re-encode is pending write the sentinel too.

Promotion is decided at the **DRAINED EDGE only** (`occPromotionWorthwhile`
in the drain flush loop, re-encode-first ordering): per-brick promotion
cascaded during cold loads — the growing union re-promoted on nearly every
drain (10–40 promotions/load), each one blanking the whole sidecar,
starving the re-encode (culling dead for the entire load) and injecting
off-cadence invalidates that defeated the streaming frame coalescer (~9×
the intended rendered frames). During a stream, texels keep encoding
against the current (possibly stale-but-conservative) range; the escape
epsilon is relative to the OBSERVED span so a tiny early encode span cannot
turn every union growth into an escape. Relatedly, plan #1 of a class skips
the sub-floor decode allowance (`nodePlanTracker`) so the cold-open
download matches the pre-allowance set. `encodeOccupancyTexel`'s doc
comment carries the four-corner proof that even a stale encode range brackets
conservatively. Three protocol guarantees added after the 2026-08-19 audit:
the drain idle-latch respects pending encode work (`hasPendingEncodeWork` —
without it a promotion landing on the drained edge stranded every texel at
the sentinel for the whole idle period), the promote branch requests its own
frame (drains only run inside frames), and the promotion's `poolsVersion`
bump is UNTHROTTLED (the trailing-timer path opened a window where an
escaped promotion decoded against the old range with no sentinel
protection). The decode-uniform effect (`BrickVolumeLayer`) also bumps the
compositor's `volumeInputs` tracker — the frame that consumed the new
`poolsVersion` in its cache key ran BEFORE the uniforms committed, and
without a tracker delta the stale-uniform composite was cached
indefinitely. `flushPool` bumps the tracker too (a t/z slice change
otherwise kept serving the previous timepoint from cache).

### 2.5 Brick atlas + slot LRU (`features/bricks/gpu/brickAtlas.ts`, `features/bricks/octree/brickPoolState.ts`)

One `Data3DTexture` per (layer, mode), format `R8`, `R16F` or `R32F`. The zarr
worker emits `Uint8Array` or `Float32Array` chunks (uint16 is promoted to
float32 in the CHUNKS) — or, under `orkestrator.raw16` (C3, default OFF), raw
`Uint16Array` for uint16 arrays: half the decode-cache/transfer/GPU-upload
bytes, an ARRAY-level decision via `chunkFidelityForDtype` since the chunk
cache carries no representation in its keys. Either way uint16 INTENSITY
pools store their bricks as
`R16F` half floats (roadmap R3): the repack writes raw values, then encodes
`raw / 65535` (`encodeHalfArray`, `features/bricks/octree/halfFloat.ts` — precision
analysis there) and the shader rescales through `uAtlasScale` (= 65535),
exactly like the R8 path's 255. Half the bytes, double the slot budget; label
pools never take R16F (`geometry.exactValues` — an 11-bit significand
corrupts ids above 2048), and the GPU compute repack rejects it
(`supports()`), so those bricks ride the CPU worker path. Kill switch:
`orkestrator.r16Atlas` (default ON, DebugPanel toggle; affects pools created
after the flip). Slot depth is `stored.z × channelCount` (channel slabs
stacked in z).

Slot count: `min(totalBrickCount(geometry), max(minSlots, budgetShare /
slotBytes))` where `budgetShare` is now DEVICE-SCALED rather than a flat cap:
`min(share, max(MIN_LAYER_POOL_BYTES = 128 MB, POOL_PLAN_SHARE_FRACTION ×
scaledShare))`, with `share = globalBudget / pools` and `scaledShare =
globalBudget / max(pools, POOL_RESERVE_COUNT)`. 128 MB is the FLOOR, so the
default 512 MB device budget reproduces the old ceiling exactly while a larger
budget actually scales (see §6c — the flat cap is what pinned the LOD floor on
plane-chunked pyramids). `orkestrator.volumeBudgetMB` overrides `globalBudget`.
The `totalBrickCount` cap matters: a tiny 4-brick debug layer must not allocate
a 296-slot float32 atlas (pitfall P4).

`BrickPoolState` is a pure CPU class: Map-insertion-order LRU with a
protected-key set. The current plan's `target` + `keep` nodes are protected
each reconcile; coarsest-level bricks are effectively permanent (always in
`keep` chains), so a fallback of last resort is always resident. Eviction
unmaps the evicted brick's page entry.

The CPU backing mirror is GONE by default (roadmap R3, lazy-mirror mode):
every atlas byte used to exist twice — VRAM plus the JS-heap array the
`Data3DTexture` was built over — doubling the real footprint on
unified-memory machines. Probes (`sampleResident`) now read EVERY resident
brick through the decoded-chunk cache (`sampleChunkCacheSync`), the path
GPU-repacked bricks — the majority on this WebGPU-only build — always used:
keys simply never leave `gpuStaleKeys`. The atlas texture is created over
NULL data with **`texture.source.dataReady = false`** — the load-bearing
flag: three's `Textures.updateTexture` runs `backend.createTexture` (pure
GPU allocation, zero-initialized by WebGPU — which also skips the old
full-zero upload) unconditionally but gates the DATA upload on `dataReady`;
without it, `initTexture` crashed pool creation outright
(`_copyBufferToTexture` has no null guard — "writeTexture … Overload
resolution failed"). `initTexture` runs eagerly for every pool so
`writeTexture` never needs the needsUpdate re-spec fallback. A lost device
restores by refetch (the chunk cache is warm — a repack, not a network
storm).
`orkestrator.atlasMirror = "on"` (DebugPanel toggle) restores the eager
mirror for A/B, except for R16F atlases, whose backing would hold half-float
BITS a raw probe read would misinterpret.

### 2.6 The unified planner (`features/bricks/octree/nodePlanning.ts`)

`planLayerNodes()` produces `LayerNodePlan { mode, sliceSignature, targetLevel,
slabZ, nodes, planBytes }` with exactly two roles:

- `target` — fetch and protect,
- `keep` — ancestor chain: protect, fetch only if missing.

Refinement is a closest-first DFS from the coarsest level: a node splits into
children while its screen footprint (`px per voxel × finerFactor × lodBias`)
says finer data would be visible **and** the byte budget allows. Closest-first
ordering means budget exhaustion degrades *distant* regions first.
`finerFactor` is the **MAX spatial component** of the finer level's scale —
true-factor pyramids are anisotropic (z can diverge from xy), so testing x
alone under-refines z-dominant views. Under `orkestrator.anisoLod`
(default ON, live at the next replan) the max is tempered per node by the
**dominant-axis discount** (`anisoEffectiveFactor`): an axis keeps weight 1
until the view direction aligns with it past 45°, then ramps smoothly to the
λ = 0.5 floor — so a face-on view of a [16,16,23.5]-style pyramid keys
refinement to the screen-dominant xy axes instead of admitting a whole finer
level ~1.46× early (~8× the bricks/decodes over ~55% of the zoom range),
while isotropic and [2ⁿ,2ⁿ,1] pyramids and all across-view/diagonal cases
are provably unchanged. The shader's per-sample `desiredLevelAt`
(`volumeRayNodes.ts`) DELIBERATELY stays max-based: it clamps to
`uDesiredLevel` and falls back per-sample to resident coarser data, so the
planner alone decides fetch and display; the residual divergence is stride
only (bounded ≤ 1/λ = 2×, ≈1.46× on the target family).

**The world-metric LOD contract** (`orkestrator.worldLod`, default ON, live
at the next replan): every SCREEN question — footprint distance, the finer
level's refinement factor, foveation angles, the aniso-discount direction —
is measured in **world units**, by scaling voxel displacements per axis with
`NodeCamera.voxelWorldSize` (= `voxelWorldSizeOf(affine)`, the affine's
column norms). Every GRID question — frustum culling, position clamping,
node boxes, the marching stride — stays in **voxel space**. The raw voxel
metric is exact for isotropic affines (why every identity-affine test passes
either way) but wrong by the affine's condition number, direction-
dependently, for calibrated µm layers: under `diag(0.5, 0.5, 5)` the chosen
level was off by up to κ = 10× per direction with the sign flipping between
views — the refinement boundary was a world ellipsoid fixed in orientation
instead of a view-centered sphere (side-on z permanently blocky, top-down
over-fetched). The shader mirrors the same metric through the uniform-driven
`uVoxelWorldSize` (`desiredLevelAt`, the tricubic gate) — identity = the
legacy expressions bit-for-bit, so flag-off simply pushes `(1,1,1)`; planner/
shader flag skew is safe (the shader clamps to `uDesiredLevel`). The
foveation/aniso view direction is published in **score space** (voxel
direction scaled by `voxelWorldSize`, renormalized — ≡ the world direction
for rotation-free affines). Accepted, deliberately NOT addressed here:
screen-centering the refinement set beyond distance-LOD (H3 —
`FOVEA_WEIGHT` tuning is the knob), CSS-px vs DPR planning policy, and the
repivot debounce.

Culling happens in **layer voxel space**: the world frustum is pulled through
`buildAffineMatrix(layer)⁻¹` (corner-anchored — voxel v sits at affine(v),
COORDINATE_SYSTEMS.md §0) so the per-node test is a cheap AABB check
on the node's voxel box. 2D restricts the DFS to a single z-slab quadtree at
`resolveLevelZ(level)`.

**The budget floor is chunk-granular** (`visibleBytesAtLevel`): it counts
*chunk-aligned decoded bytes* touched by the visible region, not GPU slot
bytes. This is the fix for plane-chunked SPIM data where one 64³ brick forces
a 14 MB `[2, 2048, 2048]` chunk decode — GPU-byte accounting made absurdly
optimistic plans (pitfall P5). `budgetMinLevel` is the finest level whose
chunk-aligned visible cost fits `maxPlanBytes`; `fixedLOD` overrides it.

Refinement/fetch ORDER is **foveated** (`foveatedScore` in
`features/bricks/octree/nodePlanning.ts`): roots and children sort by camera distance
penalized by the angle off the view axis (derived per class by unprojecting
the NDC center — `cameraPose` carries no orientation), so the screen CENTER
sharpens before equidistant screen-edge bricks. Strictly ordering-only — it
never admits or rejects a node; orthographic/2D fall back to plain distance.

**Refinement has hysteresis and a motion ceiling** (P30). A node that was
refined in the previous plan (`previousKeepKeys`) holds its refinement while
its footprint stays within `1/LOD_HYSTERESIS` (1.15) of the unlock threshold —
a two-sided band, never a ratchet — so a zoom resting at a level boundary no
longer flips the whole plan every replan. While the camera moves the tracker
passes `refineCeilingLevel` = the previous plan's `targetLevel`: coarsening is
immediate, refinement waits for the settle replan, so a quick zoom never queues
the intermediate-level sets its mid-gesture replans used to. Both are inputs
the driver derives from the previous plan (only when its mode and
`sliceSignature` match); the planner itself stays pure.

### 2.7 The plan driver (`features/bricks/residency/nodePlanTracker.ts`)

Subscribes to `layerViewRanges`, `lodBias`, `currentZ`, the flag, scene layers,
`viewProjectionMatrix`, and `displayMode`.

**Camera/box coherence is structural.** The camera inputs (matrix, viewport,
pose) come from `viewerStore.viewSnapshot` — published by the visibility
tracker in the SAME store write as `layerViewRanges`, capturing the exact
view emission the ranges were computed from — never from a live
`viewStore.getState()`. A live read paired a fresh camera with
one-visibility-hop-stale boxes on ~1 in 4 mid-orbit replans (and the box
solely determines `rootRange`), with correctness resting on
listener-insertion order. The tracker still subscribes to the live matrix
for replan *pacing*, and to `viewSnapshot` identity so a snapshot published
after a premature replan always triggers a corrective one; the live view is
only consulted before the first visibility publish (ranges are empty then).

**The layer set is dynamic.** `SceneProvider` no longer rebuilds the store scope
when layers are added, removed or reordered (the server mints an
`AnnotationLayer` on a scene's first annotation, and rebuilding disposed the
renderer and every atlas for it) — it reconciles them into the live
`sceneStore`. `state.layers !== lastLayers` is therefore a REAL trigger, not
just a mount-time formality, and it is the ONLY thing that replans a
newly arrived layer. Two consequences: the reconcile must register a new
layer's zarr arrays BEFORE folding the layers (a fold that lands first replans
without the array and nothing retries it), and a layer that did not
structurally change keeps its object identity across a fold, so
`layerDerivationCache` and the plan caches stay warm.

Two deliberate absences:

- **`residencyVersion` is NOT a trigger.** Plans describe *desire*; residency
  describes *state*. Feeding residency back into planning recreated the legacy
  feedback loop and caused replan storms while streaming (pitfall P7).
- **Replans are debounced** (`MIN_REPLAN_INTERVAL_MS = 200`): camera emissions
  arrive at ~16 Hz during a drag; replanning per tick burned the main thread
  for zero visual gain (pitfall P9). Tests must wait ≥ 280 ms (`settle()`).
  While `cameraMoving`, the interval widens to
  `MOTION_REPLAN_INTERVAL_MS = 500` — every mid-gesture replan turns the
  fetch/upload pipeline over onto the very frames being dragged, and the
  always-resident coarsest level covers newly exposed regions meanwhile. The
  cameraMoving→false edge drops any pending motion timer and reschedules, so
  the sharp replan lands the moment the gesture ends.

Plan writes are identity-stable (`sameNodePlan`): a value-equal replan does not
touch the store, so downstream React sees nothing.

Two structural costs were removed from the replan itself:

- **Equivalence-class planning.** Pools are shared by content address but
  planning inputs are per layer, so the tracker groups plannable layers by
  `poolKey` + `buildPlanInputSignature` (affine, fixedLOD, view range by
  VALUE — `features/bricks/octree/planInputSignature.ts`) and runs `planLayerNodes` once
  per class, assigning every member THE SAME plan object. Four channel layers
  over one image: one DFS instead of four, and `reconcilePool`'s member union
  degenerates to identical plans. The per-class camera (voxel frustum,
  position) is built into module-level scratch objects — no THREE allocations
  per replan.
- **Derivation memo** mirroring `brickResidency.layerDerivationCache`:
  `buildLevelSources` + `buildLayerLevelGeometry` + `resolveBrickSpec` +
  `assessPoolViability` are cached per layer keyed on the identities they
  read (layer, dataArrays, mode); only successes are cached so late-opening
  stores retry, and entries are pruned when a layer leaves the scene.

### 2.8 Residency manager (`features/bricks/residency/brickResidency.ts`)

A plain class (registered in `viewerStore`, like `canvas`). Key mechanics:

- **It starts OUTSIDE the canvas, and the renderer is LATE-BOUND**
  (`orkestrator.earlyBricks`, default ON). `features/bricks/residency/BrickSystemHost.tsx`
  builds the system (via the single construction site
  `features/bricks/residency/brickSystem.ts`) as a sibling of `<SceneWrapper>`;
  `BrickSystemProvider` stays inside the canvas and is now only the FRAME
  DRIVER — it calls `attachRenderer(gl, invalidate)` and runs the per-frame
  drain. Why: the canvas `gl` factory awaits `renderer.init()` and R3F mounts
  no canvas child until it resolves, so the whole fetch pipeline used to wait
  on WebGPU device creation — while the planner (outside the canvas) had
  already emitted plan #1, the entire coarsest level, with no debounce and no
  camera dependency. Nothing in fetch → decode → repack touches the renderer
  (the result is a CPU buffer parked in `pool.queue`), so it now overlaps the
  device setup. `detachRenderer()` disposes the pools and the gpu repacker
  (GPU resources die with their device) and `attachRenderer` re-runs
  `initTexture` for pre-existing atlases and RE-RECONCILES against current
  plans — the plan subscription only fires on CHANGE, so without that a canvas
  remount would sit empty until something happened to replan. While detached,
  `shouldDispatchFetch` (`uploadBudget.ts`) holds the undrainable queue at the
  in-flight ceiling; it withholds new dispatches only and never cancels a
  shared in-progress decode (P8).

- **Shared in-flight chunk fetches** (`fetchChunkShared`): a promise map keyed
  `storeId:chunkCoords`. Without it, 12 concurrent bricks touching the same
  plane chunk each triggered their own 14 MB decode — a measured **73×
  fetch amplification** (pitfall P8, the single worst bug of the bring-up).
  **Dead-queue cancellation** rides on top: bricks reference-count their
  chunks (`features/bricks/octree/chunkRefRegistry.ts`), and when the LAST referring
  brick aborts, the chunk's per-fetch AbortController fires — the worker pool
  cancels the task if it is still QUEUED (reclaiming the wasted decode during
  fast navigation; `stats.cancelledDecodes`), while a STARTED task ignores it
  and finishes into the chunk cache. Never cancel shared in-progress decodes —
  that direction was the 13× refetch amplification.
- **Byte-bounded decoded-chunk cache** (`@/lib/zarr/caches/byteBudgetChunkCache.ts`,
  512 MB LRU). The runner's default cache is *count*-bounded; 500 entries of
  plane chunks pinned multiple GB (pitfall P6).
- **In-flight ceiling** per pool from the quality profile, abort-on-drop per
  brick via the worker runner's signal path — **plus a GLOBAL cap** (2× one
  pool's allowance, `globalInFlightLimit`): the per-pool ceiling alone made
  total decode pressure linear in layer count (N pools × 16 on HIGH). A
  completed fetch kicks EVERY pool with pending work (`startNextFetchesAll`),
  since the freed global slot may belong to another pool's queue.
- **Frame upload budget** 6 MB / 12 bricks, drained in
  `BrickSystemProvider`'s `useFrame`; every batch ends with page flush,
  `residencyVersion++`, and a CADENCE-GATED frame request
  (`scheduleStreamingFrame` / `resolveStreamFrameAction` in
  `uploadBudget.ts`). The invalidate used to do two jobs — run the next
  drain AND display progress — so the demand frameloop free-ran for whole
  streaming bursts, re-raymarching the entire scene per brick batch (frame
  cost is O(scene), not O(change)). Now, while streaming and the camera is
  quiet, rendered frames land at the `residencyBumpMs` cadence and an
  off-frame pump timer (`DRAIN_PUMP_MS`) keeps `drainUploads` running
  between them at full speed; the drained edge and interacting frames
  bypass the gate (the settled frame must always land; gesture frames flow
  anyway). `stats.streamFramesCoalesced` counts the whole-scene re-renders
  this saves. GPU-repacked
  bricks are charged their REAL flush cost — the source-chunk bytes the
  compute path must `writeBuffer` for cache misses (`gpuFlushUploadBytes`),
  not the atlas-slot bytes — which bounds the previously ungated synchronous
  work inside `gpuRepacker.flush()` to the same frame budget. While the
  camera is mid-gesture the drain runs the **interacting policy**
  (`resolveDrainPolicy`): trickle budget (2 MB / 4 bricks / 1.5 ms), no
  first-brick free pass, no stale pass. GPU-repack dispatch deliberately
  STAYS allowed — blocking it starved gpu-path pools for whole gestures
  (measured: 110 decoded bricks stuck in the upload queue, 565 planDrops as
  replans turned the undrained queue over); the real-bytes charging above
  bounds the flush to ~one cold-chunk `writeBuffer` per frame instead. The
  backlog drains at full budget on the first settled frame.
- **Stats are first-seen-honest**: `bytesDecoded` counts a chunk key once, not
  per cache hit (pitfall P10). `buildDebugReport()` backs the DebugPanel's
  "Copy debug report" button — paste that JSON when reporting perf issues.

### 2.9 Repack (`features/bricks/octree/brickRepack.ts` + `repackDispatcher.ts`)

Pure, golden-buffer-tested, and — since the P17 hardening — run **off the UI
thread**: `BrickResidencyManager` submits jobs through a `RepackDispatcher`
(`features/bricks/octree/repackDispatcher.ts`), a 2-worker pool around the unchanged pure
function (`repack-worker.ts`; sync fallback when `Worker` is unavailable —
vitest/jsdom). Strided copy from decoded chunks into the canonical output
layout `((c·storedZ + z)·storedY + y)·storedX + x` (x-fastest — this is why
the shaders have no `dimRemap`), then per-axis edge replication for the
border, then a min/max scan; `min == max` flags the brick EMPTY. Decoded
chunks travel to the repack worker zero-copy (SharedArrayBuffer-backed — the
app is crossOriginIsolated and `getChunkWorker` forwards
`useSharedArrayBuffer`) while STAYING in the main-side chunk cache; the output
brick returns as a transferable. `stats.repackMs` is therefore wall time
(queue + worker), not main-thread time. No cancellation: jobs are a few ms and
out-of-plan results are landed into free slots by `drainUploads` (or counted
as `planDrops` when none is free).

**Output buffers are pooled** (`createBufferFreeList` + the request's
`recycled` transfer): the worker used to allocate a fresh ~1.1 MB output per
brick — sustained multi-MB/frame garbage while streaming. The residency
manager calls `dispatcher.release(data)` at the three points a payload is
provably dead (mirror copy landed / skipped, dropped without upload), the
dispatcher size-classes the buffer by exact byteLength (cap
`MAX_FREE_BUFFERS = 24`) and transfers it back to the worker with the next
matching job. Recycled buffers are ZEROED in the worker — the phasor reduce
path accumulates `+=` and relies on arriving zeroed. Missed release points
just fall to GC; releasing a live buffer would detach it, so release only
where the last reference dies.

Related main-thread costs, assessed: the per-upload CPU backing-mirror copy in
`writeBrickToAtlas` (§2.5) is KEPT — `sampleResident` (probes) and
context-loss restore both read `atlas.backing`, and the copy is bounded by the
6 MB/frame upload budget. Per-chunk `zarr.json` re-parsing on the main thread
was removed via a per-array metadata memo
(`lib/zarr/runner/get-worker.ts` `readArrayMetadataCached`).

### 2.10 Shader traversal (`features/bricks/gpu/brickNodeMaterials.ts`)

`sampleBrickEx(p01, desiredLevel, channel)` → `0 unmapped / 1 resident / 2
empty`. Resident path: page `texelFetch` → atlas tap at
`slotOrigin + border + inBrickOffset (+ channel-slab z)`. Unmapped path: loop
to coarser levels (bounded by `MAX_BRICK_LEVELS = 10`).

- **3D** (`features/bricks/layers/BrickVolumeLayer.tsx`): unit-box raymarcher marching
  in **base voxel space** (`toBaseVoxel(p) = (p.x+0.5, 0.5−p.y, p.z+0.5) ·
  uBaseShape`), ≤ 256 steps, per-sample perspective LOD
  (`desiredLevelAt(dist)`, clamped to the plan's floor `uDesiredLevel`),
  empty-space skipping via `brickExitRel` when a page entry is unmapped or
  uniformly empty, ≤ 16-channel per-sample compositing into
  MIP / AttenuatedMIP / Volume / Iso accumulators, picking pass. While
  `cameraMoving`, `uStepScale = 3` triples the step size (~3× fewer samples);
  the camera-settle emission restores full quality automatically.

  The **shader fast path** (once `orkestrator.shaderFastPath`; now
  unconditional — §6.9) restructures the ray loop; CPU mirrors of every decision live in `features/bricks/shaderspec/raymarchStep.ts`:
  - **Skip-before-sample.** The empty-space decision is emitted BEFORE the
    per-slot sampling block: an unmapped chain hops immediately, and a uniform
    EMPTY brick's max norm is derived with pure ALU from `resolved.emptyValue`
    (`channelNormalize` only — no colormap sample, no phasor taps, no cursor
    loop). The legacy order paid the full transfer-function path for every
    skipped step just to compute the predicate.
  - **`textureSampleLevel` atlas taps** (`emitChannelTap` `.level(0)`): no
    implicit derivatives inside the divergent ray loop; identical texels (the
    atlas has no mips). Applies to the 2D compositor too.
  - **ATTENUATED_MIP early termination**: the depth weight `exp(-1.5·d)`
    strictly decreases and `norm ≤ 1`, so once `attenuatedMax` reaches the
    current weight nothing later can beat it (`attenuatedMipDone`) — this mode
    previously always marched the full ray.
  - **Occupancy skip (resident bricks).** Residents used to NEVER skip: a
    brick whose values sit entirely below `climMin` — visually black — was
    marched at fine pitch with full per-slot sampling, and MIP (the default
    projection, whose 0.995 early-out dim fluorescence never reaches)
    effectively marched every full ray every frame. The page table's RG8
    occupancy sidecar (§2.4) brackets each resident brick's raw `[min, max]`;
    since `channelNormalize` is monotone up to its final invert, the windowed
    norm over a brick is bounded by `max(norm(bMin), norm(bMax))` — valid for
    inverted channels too. A brick hops (whole resident-level cell, via
    `brickExitRel`) when EVERY member is satisfied: invisible under its clim
    window (≤ 0.001, the EMPTY threshold), a MIP the brick cannot beat
    (`upper ≤ bestNorm` — classic maximum culling), an ISO it never reaches,
    or already done. CPU lockstep: `residentBrickSkippable` /
    `occupancyUpperNorm` in `features/bricks/shaderspec/raymarchStep.ts`. Conservative by
    construction — a skipped brick cannot change any accumulator.
  - **Compile-time phasor specialization**: a member whose slots hold no phasor
    sources (`hasPhasorSources`, from `buildMergedChannelUniformData`) gets the
    whole phasor branch — kind load, 2 extra taps, atan/tan/sqrt, the 16×24
    cursor loop — omitted from its WGSL. The layer keys its material-bundle
    memo on the flag, so adding a phasor source rebuilds the material.

  **Zoom smoothing** (`orkestrator.smoothZoom`, default ON, DebugPanel
  toggle): once a RESIDENT sample's resolved level is magnified past
  `uSmoothThreshold` px/voxel (default 3), the INTENSITY tap switches from
  trilinear to a tricubic B-spline reconstruction — 8 trilinear taps via the
  two-tap decomposition (`emitTricubicTap`; algebra pinned by
  `features/bricks/shaderspec/tricubic.ts` tests) — so magnified fluorescence renders as smooth
  blobs instead of hard voxel blocks. The original "cost is bounded: only
  engages where rays are short" claim is TRUE for zoom-down-axis and FALSE
  for zoom+tilt (the diagonal ray runs hundreds of fine-pitch samples, all
  within the engagement distance — essentially the whole step budget at 8×
  taps, exactly when the frame is already fragment-bound), so the threshold
  is now GOVERNED: `resolveSmoothThreshold` sets it to 0 (runtime off, no
  rebuild) while ACTIVE (camera moving or streaming) and on TIER_LOW, driven
  by `useStepScaleUniform`'s existing vanilla subscription. Caveats: the
  1-voxel atlas border is smaller
  than the ±1.5-voxel cubic support, so taps are CLAMPED to the slot/slab
  interior (edge voxels smooth slightly less; border 2 is the follow-up if
  seams show); phasor g/s taps stay single-tap; CPU probes read RAW voxel
  values — smoothing is a display-space reconstruction filter, measurements
  are unchanged.
- **2D** (`features/bricks/layers/BrickPlaneLayer.tsx`): ONE full-layer quad (the
  per-chunk React mesh churn of `ChunkPlane` is gone); the legacy multi-channel
  compositor with its texture tap replaced by `sampleBrick(vec3(uv, slabZ),
  uDesiredLevel, ch)`.

### 2.11a Sharded arrays (`lib/zarr/runner/sharding.ts`, `shardIndexCache.ts`)

Zarr v3 `sharding_indexed` is handled **dynamically per array** — no flag. At
`openZarrArray` the array's `zarr.json` is read through `readArrayMetadataCached`
(`lib/zarr/runner/get-worker.ts`); a `sharding_indexed` top-level codec is
unwrapped (`resolveShardingLayout`) so that:

- the worker codec pipeline is built from the INNER chunk shape + inner codecs
  (our pipeline uses zarrita's codec registry, which has no `sharding_indexed`
  entry — a sharded chain handed to a worker would fail to load);
- `effectiveChunkShapeOf(arr)` answers the INNER chunk shape synchronously, and
  `buildLevelSources` uses it instead of `arr.chunks`. **Invariant: everything
  downstream — `spatialChunks`, `chunksTouchingBrick`, `enumerateBrickChunkCoords`,
  decode-allowance accounting, prefetch, chunk cache keys — works in inner
  chunks.** Shard coordinates appear only inside `resolveChunkLocation` when
  the storage key is built.

Fetch path for a sharded chunk: `resolveChunkLocation` → main-thread
`ShardIndexCache` (one suffix-`Range` read of the 16 B/inner-chunk index per
shard per scene, single-flight, LRU 1024) → `lookupInnerChunk` → the worker
receives an ordinary `fetch_decode` with a `Range` header. A `(2^64-1, 2^64-1)`
index pair means "never written": fill on the main thread, no worker task, no
"object missing" warning. The worker verifies a ranged response (206 with the
expected length; a 200 without `Content-Range` is sliced locally — gateways that
ignore `Range`). Signed `Range` requests are forced to `cache: 'no-store'`
(`s3-request.ts`, Chromium rewrites signed range headers) — expected.

Unsharded arrays take exactly the old path: `sharding` undefined, whole-object
GET, same cache key.

**Range coalescing** (`lib/zarr/runner/rangeCoalesce.ts`, `getChunkGroupWorker`
in get-worker.ts): a brick's chunk set goes through ONE grouped call
(`fetchChunksShared` in brickResidency.ts — same per-chunk in-flight sharing
and per-chunk abort as `fetchChunkShared`). Inner chunks of the same shard
whose byte ranges sit within `maxGap` (256 KiB) of each other, up to `maxBytes`
(8 MiB) per run, become a single ranged GET; the worker's `fetch_decode_multi`
slices the body and decodes each part. A run's worker task is cancelled only
when EVERY chunk in it aborted (`whenAllAborted`). `stats.rangeRequests`
counts tasks; `chunkRequests / rangeRequests` = chunks per request. Unsharded
arrays, cache hits, absent inner chunks and singleton runs take the single
path bit-for-bit. Backend contract that maximises this: write a shard's inner
chunks in **Morton order** so a brick's 2×2×2 / 3×3×3 neighbourhood is
contiguous (C-order writers still get pairs along x).

**Cross-brick batching** (`lib/zarr/runner/shardRunBatch.ts`): range reads do
not dispatch inside their group call — each call contributes its post-index
`{offset, length}` items to a pending batch keyed by everything a merged
`fetch_decode_multi` must share (pool, workerUrl, store, shard, metaId,
fidelity, SAB, requestInit, coalesce opts), and a `setTimeout(0)` flush
coalesces ACROSS the contributors. The dispatch loop is synchronous and
same-shard index reads share one single-flight promise, so neighbouring
bricks dispatched in one reconcile tick land in the same batch; a lone call
pays at most one macrotask. Merged-run priority = `max(members)` (WorkerPool
runs higher numbers first — a colliding halo part briefly rides its
co-members' priority; collisions are rare since `dispatchHalos` requires an
idle on-screen pipeline). Cancellation stays `whenAllAborted` over every
member across bricks. `onDispatch` is additive and attributes each physical
request once (to the run's lead item), so the scene-wide
`chunkRequests / rangeRequests` ratio stays exact while per-call counts are
approximate for shared runs.

**Whole-shard dense merge** (`coalesceRangesDense`): when a batch's items
cover ≥ `denseMergeDensity` (0.5) of their min..max span as a UNION of
intervals and the span fits `denseMergeMaxBytes` (8 MiB), the whole span goes
out as ONE GET regardless of `maxGap` — at density 0.5 the discarded gap
bytes are at most the needed bytes while one request replaces at least two.
Below the threshold the greedy gap rule applies unchanged.

**Shard index prefetch**: `warmShardIndexes` (reconcile, after `pendingFetch`
is built) fires `prefetchShardIndex` for the head of the queue (≤256 chunks)
so the index round trip overlaps the queue wait instead of preceding the
first inner-chunk read of every shard.

Backend contract that makes this pay off: brick-aligned inner chunks (64³ 3D,
or 256×256×1 for 2D-only levels), shards written whole at ingest (zarr-python
≥ 3.3 / zarrs / zarr-java all read partial shards; only zarrs writes them
partially). Follow-ups: route SINGLE-coord group calls through the batch too —
`coordsList.length < 2` still short-circuits to the single path, so aligned
core-phase bricks (1 chunk each) never merge with a neighbour; per-shard
occupancy sidecar.

### 2.11b Two-phase bricks (`features/bricks/residency/twoPhase.ts`)

`orkestrator.twoPhaseBricks` (default ON, read once per manager). A 3D brick's
fetch box is payload ± 1 border, so with brick-aligned 64³ chunks an INTERIOR
brick touches 3 chunks per axis = **27 chunks** (8 at the origin corner) — all
awaited before repack, for a 1-voxel rind; bytes amortise through the shared
decode cache, latency and cache footprint (~14 MB decoded per 1.1 MB brick)
do not. Two-phase splits the fetch (`FetchPhase` in `octree/nodeAddress.ts`):

- **core** — `chunksTouchingBrick(…, "core")` = the payload box only (1 chunk
  when aligned). Repack with `fetchBox = brickFetchBox(…, "core")`: the CPU
  `replicateEdges` and the kernel's clamp fill the rind from the payload edge,
  exactly as level-edge bricks always have. Upload → RESIDENT and listed in
  `pool.provisionalKeys`; a halo entry is pushed to `pool.pendingHalo`.
- **halo** — `fetchBrick(pool, node, "full", halo = true)`: the legacy 27-chunk
  gather, re-repacked into the SAME slot (`BrickPoolState.acquire` on a
  resident key returns its slot). Dispatched by `dispatchHalos` only when every
  pool's planned queue is empty AND the band-2 gate holds (resting camera, no
  on-screen fetch in flight); chunk tasks at priority −1; never counts as
  on-screen; never retried; dropped by `haloStillWanted` if the brick was
  evicted, refined, unplanned or re-queued in between.
- EMPTY (uniform payload) bricks get no halo: nothing to refine.
- 2D bricks (border 0) and the flag OFF ⇒ `initialFetchPhase` = `"full"`, the
  legacy single pass bit-for-bit.

Bookkeeping: `provisionalKeys` cleared on halo upload, eviction (all four
release sites), flush; `pendingHalo` pruned to `protectedKeys` per reconcile
and counted by `anyPipelineWork` (so `timeToSharpMs` and the streaming flag
include the rind). Stats `coreBricks` / `haloRefines`; per-pool report
`provisional` / `pendingHalo`; DebugPanel badge `◐N`; cold-open phase
`firstBrickFull` (equals `firstBrickUploaded` with the flag off).

### 2.11 Probes (`features/bricks/octree/brickSampling.ts`)

`marchResidentBricks` is a CPU march in **lockstep with the GLSL
normalization**, sampling through `sampleResident` (the CPU brick mirrors).
Keep the two in sync when touching either.

---

## 3. File map

| Area | Files |
| --- | --- |
| Pure core | `features/bricks/octree/{brickSpec, nodeAddress, pageTableLayout, brickPoolState, nodePlanning, brickRepack, brickSampling}.ts` (each with a `.test.ts`). `levelGeometry.ts` sits in `platform/coords/` — level scale/shape is a coordinate fact the probe and the transform graph need too |
| Coordinate graph | `@/mikro-next/lib/coords/transformGraph.ts` (+ `.test.ts`) — client-side edge composition into `LayerState.affineMatrix` / mesh & ROI transforms; see COORDINATE_SYSTEMS.md |
| Mesh layers | `features/meshes/fabriks/` (fabriks prefix, row-group streaming, own README + `fabriksCore.test.ts`) |
| Network layers | `features/network/konnektion/` (konnektion prefix, ONE level at a time — the format makes no boundary claim, so a seam between levels is a missing branch rather than a crack; own README + `konnektionCore.test.ts`) |
| Drivers | `features/bricks/residency/nodePlanTracker.ts`, `features/bricks/residency/brickResidency.ts`, `features/bricks/residency/BrickSystemProvider.tsx`, started from `shell/VisibilityManager.tsx` |
| GPU | `features/bricks/gpu/{texSubImage3d, brickAtlas, pageTableTexture}.ts` |
| Shaders | `features/bricks/gpu/{brickNodeMaterials, channelUniforms}.ts` (TSL → WGSL) |
| Materials | `features/bricks/layers/{BrickPlaneLayer, BrickVolumeLayer}.tsx` |
| Registry entries | `features/volume/{ImagePlaneLayer, ImageVolumeLayer}.tsx` (thin wrappers over the brick components) |
| Debug | `features/debug/DebugPanel.tsx` (plan/pool/lifetime stats, **Copy debug report**), `features/bricks/BrickResidencyOverlay.tsx` (per-level wireframes) |
| Center LOD badge | `features/bricks/octree/centerLod.ts` (+ `.test.ts`) — center-pixel ray → base voxel; `features/bricks/CenterLodReadout.tsx` — the level `BrickResidencyManager.residentLevelAt` serves there, vs. the plan's target. Not debug-gated: silent coarse fallback is invisible without it |
| Store | `platform/stores/viewerStore.ts` (`nodePlans`, `residencyVersion`, `brickSystem`), `platform/stores/viewStore.ts` (`cameraPose`, `cameraMoving`) |
| Cache | `@/lib/zarr/caches/byteBudgetChunkCache.ts` |

The legacy paths (`ChunkPlane`, `PlaneLayer`, `VolumeLayer`,
`VolumeTextureMesh`, `core/chunkPlanning.ts`, `managers/chunkPlanTracker.ts`,
`core/volumeTexture.ts`) and the `useOctreeRenderer` migration flag were
deleted at cutover; `buildSliceSignature` survives in
`platform/model/sliceSignature.ts`. Kept: `features/bricks/octree/viewportPlanning.ts`,
`features/bricks/probeMath.ts`, `platform/quality/lodPlanning.ts` (budget source +
`planDefaultVolumeLods` for `fixedLOD` defaults). `core/slab.ts` was listed
as kept here but its only consumer was `ChunkPlane`, so it had been dead
since the cutover; deleted 2026-08-20 along with `core/layerListLayout.ts`
(de-adopted by `LayerControlPanel` when auto-expand stopped being
space-derived).

---

## 4. Pitfalls — what actually bit us

Everything below was found in live testing on real scenes (a small 4-layer
float32 debug set and plane-chunked SPIM HepaRG stacks, `[2, 2048, 2048]`
chunks). Ordered roughly by pain.

**P8 — Fetch amplification without in-flight dedup (73×).** 12 concurrent
brick fetches touching the same plane chunk each decoded it independently:
8.4 GB decoded for 115 MB uploaded. Any brick/chunk mismatch **requires**
in-flight request sharing (`fetchChunkShared`), not just a decoded cache — the
cache only dedups *completed* fetches.

**P5 — Budgeting in GPU bytes lies when chunks are planes.** A 64³ brick costs
~1.1 MB on the GPU but ~14 MB of decode when the chunk is `[2, 2048, 2048]`.
Plans that looked cheap in slot bytes downloaded entire levels. The refinement
floor must count *chunk-aligned decoded bytes* of the visible region.
(The structural fix is upstream: brick-aligned inner chunks in a sharded
pyramid — §2.11a.)

**P5b — zarrita's `arr.chunks` is the SHARD shape on a sharded array.** Feed it
to the planner and every brick expands to whole 512³ shards — far worse than
the plane-chunk case. `buildLevelSources` must use `effectiveChunkShapeOf(arr)`
(inner chunks); anything that reads `arr.chunks` directly for planning is a
bug. Also: a suffix-range index read can land at a non-8-aligned byte offset —
`decodeShardIndex` realigns before the `BigUint64Array` view.

**P5c — The border, not the chunk shape, is the request multiplier.** Even
with perfectly brick-aligned chunks, payload ± 1 makes an interior brick touch
27 chunks. Re-chunking alone therefore cut BYTES, not latency; the two-phase
brick (§2.11b) is what brought first-pixel back to one request. A halo refine
must never ride `pendingFetch`: `peekLiveFetch` drops any key that is already
resident, which is exactly what a halo target is — hence the separate
`pendingHalo` queue.

**P4 — Sizing atlases by budget share, ignoring dataset size.** A 4-brick toy
layer got a 296-slot / ~140 MB float32 atlas — ×4 layers ≈ 1.1 GB of zeroed
VRAM and a hard perf cliff. Always cap `desiredSlots` by
`totalBrickCount(geometry, spec)`.

**P6 — Duplicate pyramid levels + count-bounded caches.** Two level-0
`dataArrays` (`scaleFactors: null` and `[1,1,1,1]`) → everything planned and
fetched twice *from different stores* (so even a perfect chunk cache can't
save you). Dedupe levels by spatial shape at geometry-build time. Separately,
the runner's count-bounded chunk cache (500 entries) pinned GBs of plane
chunks — caches over variable-size items must be **byte**-bounded.
Corollary: after dedupe, level *indices* shift — anything reading
`dataArrays[i]` directly (the 2D probe did) breaks; always go through the
pool's geometry.

**P7 — Residency feedback into planning.** Bumping a replan on every
`residencyVersion` change recreated the legacy render-feedback loop: streaming
→ replan → new fetches → streaming… The shader fallback exists precisely so
plans never need to know what is resident. Plans react to *view* changes only.

**P9 — Per-camera-tick work during interaction.** Three separate instances:
(a) replanning at 16 Hz during a drag (→ 200 ms debounce); (b) unbounded
mirror+upload traffic per frame (→ 6 MB/12-brick frame budget); (c)
`BrickVolumeLayer` subscribing to `cameraPose`/`viewportSize` **objects** —
fresh identities per camera write re-rendered every volume layer ~16×/s. The
fix for (c) is the general rule: zustand selectors in render-hot components
must return **scalars** (here: `pxPerVoxelAtUnitDistance` computed inside the
selector; camera position reaches the shader via `vOrigin` anyway).

**P2 — GLSL ES 3.0 sampler indexing.** You cannot index `sampler3D
pageTables[N]` with a loop variable. The single packed page-table texture with
`uPageOffset[level]` offsets is a *requirement*, not a style choice.

**P3 — WebGL unpack state is global and three leaks it.** *Obsolete since the
WebGPU-only migration (§5) — recorded because it explains an entire class of
bug that no longer exists.* three set `UNPACK_FLIP_Y_WEBGL` /
`UNPACK_PREMULTIPLY_ALPHA_WEBGL` for 2D uploads (e.g. colormap atlases) and
left them set; WebGL2 then hard-errored on any `texSubImage3D`, so the upload
helper had to force-clear **all** UNPACK_* state on every call. WebGPU's
`device.queue.writeTexture` has no global unpack state and no such hazard.

**P1 — Texture-extent limits shape the design.** `MAX_3D_TEXTURE_SIZE` is 2048
under ANGLE. Page grids of deep stacks (3000 z-slices in 2D mode) exceed it;
payload auto-doubling must be axis-aware (only double 2D z when the z grid
itself overflows). The page table's level-stacking also has to try multiple
axes before giving up.

**P10 — Debug stats must not lie.** `bytesDecoded` originally counted every
cache *hit* as a decode — a 4.96 GB phantom that sent diagnosis down the wrong
path for a round. Count first-seen chunk keys only. Bad telemetry is worse
than none; the debug report is the primary remote-diagnosis tool.

**P11 — EMPTY-brick values are raw, not scaled — and only 8-bit precise.** The
uniform value from the repack min/max scan is already in raw data units; running
it through `dataScale` before 8-bit encoding double-applied normalization. Encode
raw (`encodeEmptyValue`), normalize in the shader like every other sample.

Because an EMPTY brick survives only as ONE 8-bit page-table byte
(`round((v-min)/(max-min)·255)`), the value the GPU renders is the encode→decode
round-trip, **not** the raw value — a quantization of ≈`(max-min)/255` raw units
(≈257 for uint16 over `[0,65535]`, so uniform uint16 bricks with a narrow useful
window band). This is inherent to the 8-bit page encoding. The CPU probe path
(`sampleResident`) applies the SAME round-trip (`decodeEmptyValue(encodeEmptyValue
(v))`) so `marchResidentBricks` stays in lockstep with the rendered image rather
than reporting the exact-but-not-rendered raw value. Encode/decode live in
`features/bricks/octree/brickEncoding.ts`; tested in `features/bricks/octree/brickEncoding.test.ts`.

**Atlas format must mirror the worker's promotion, not the dtype string.**
`atlasKindForDtype` (`features/bricks/octree/atlasFormat.ts`) picks R8 only for unsigned
8-bit, R16F for unsigned 16-bit intensities (roadmap R3 — the promoted
Float32 CHUNKS are unchanged; the repack re-encodes brick-side, so the worker
lockstep is preserved), and R32F for everything else — matching the codec
worker's DEFAULT-fidelity promotion (`lib/zarr/runner/codec-worker.ts`: only
`Uint8Array` stays uint8, all else → `Float32Array`). An earlier
`dtype.includes("8")` test wrongly routed `int8` (a signed Float32Array) into
a Uint8 R8 atlas, wrapping its negatives; SIGNED 16-bit similarly stays R32F —
it cannot ride the multiply-only `uAtlasScale` rescale. One standing
constraint: the scene never sets `textureFidelity`, so it assumes `'default'`
— the `'low'`/`'high'` paths per-chunk-normalize to uint8/uint16 and would
break both this format choice and the global `pool.minValue/maxValue`
normalization. Tested in `atlasFormat.test.ts` / `brickAtlas.test.ts`.

**Contrast limits are raw dtype units.** `climToUnit` (`platform/model/dataRange.ts`) maps an
absolute clim into the shader's `[0,1]` via `pool.minValue/maxValue`. This is
correct ONLY if `channel.transfer.climMin/Max` and `layer.climMin/Max` arrive in
raw dtype units (e.g. 0..4000 for a uint16 layer, not a normalized 0..1). A
normalized clim on a uint16 layer collapses to ~0 after `climToUnit` with
`[0,65535]`. See [[clim-absolute-native-units]].

**…and the dtype range is a WEAK PROXY for some dtypes.** `pool.minValue/maxValue`
is what the shader normalizes against AND what the null-clim default resolves to,
so a dtype range that does not describe the data mis-windows the layer before any
contrast setting is involved. Floats declare `[0,1]` (whites-out data valued >1);
**signed integers declare a range centred on zero**, so ordinary int16 data valued
0..4000 normalizes into `[0.500, 0.561]` — flat mid-gray, and raw 0 stops reading
as background, which silently defeats the `norm <= 0.001` empty-space skip in
`raymarchStep` (opaque half-intensity fog + every brick marched) and makes a
uniform-zero brick round-trip through the 8-bit EMPTY encode to `+128` instead of
`0`. Two escape hatches cover it, and they MUST test the same dtype set
(`dtypeRangeIsWeakProxy`, `platform/model/dataRange.ts`): the server value
histogram (`serverHistogramRange`, unioned across ALL anchors — they are
per-channel, and the first one alone would clip every brighter channel), else
`LayerBrickPool.autoRange`, which accumulates the real range from decoded bricks
(`shouldAutoRange` / `accumulateAutoRange`, `residency/brickResidency.ts`).
Keeping the two gates in lockstep is what lets `poolKey` omit `autoRange` — it is
implied by `dtype` (keyed) plus "the range fell back to the dtype's" (keyed as
`dataRange`). `uint8`/`uint16` deliberately keep their dtype range.

**A reused pool keeps its accumulated range as a SEED** (`resolveReusedAutoRange`,
`residency/brickResidency.ts`). `ensurePool`'s movable path re-derives the range
on a slice-signature change (T / dim slider, axis remap — never z, which
`sliceSignature` deliberately excludes), and `derivation.dataRange` is the DTYPE
range for an auto-ranging pool. Taking it would restart the ratchet on every
slider step, and for a signed dtype that means flashing the fog range — mid-gray,
skipping off — until the first brick lands again. So a pool that was auto-ranging
and STAYS auto-ranging (with `autoRangeInitialized`) keeps `minValue`/`maxValue`;
only a genuine policy change (a late server histogram turning `autoRange` off)
takes the derived range. Safe because the range does not move: no EMPTY re-encode
is owed, `flushPool` has already reset `occObserved*`/`occEncode*` against that
same range, and a key holding the dtype range while the live range has drifted is
the normal auto-range state.

**But a FLUSHED pool clears `autoRangeInitialized`**, so the next brick re-FITS
wholesale instead of unioning. This branch is the ONLY thing that ever clears that
flag (`flushPool` does not touch it) and `accumulateAutoRange` only ever WIDENS
while it is set — carry it across a flush and one hot timepoint permanently dims
the rest of the series (a 30000 spike on otherwise 0..4000 data windows every
later slice to `[0, 30000]` for the life of the pool). Keeping the range without
the flag gives both properties: per-slice re-fit, and no frame ever rendered at
the dtype range. Note `autoRange` itself is re-derived OUTSIDE the range branch —
the policy can flip without the range moving.

**P12 — Guard the coordinate frames.** Every frame is corner-anchored
(COORDINATE_SYSTEMS.md §0): voxel v sits at world `affine(v)`, no centering,
no flip, in 2D and 3D alike. A frame mismatch produces plans that look
plausible but cull/fetch the wrong region; the raymarcher's `toBaseVoxel` and
the CPU probe/trace/visibility mirrors must stay in lockstep with the mesh
arrangement (unit primitives offset by half their size).

**P14 — Ray-step sizing: constant steps make grain, unstable jitter makes
flicker.** The raymarcher originally used one constant `delta =
max(rayLen/MAX_STEPS, uMinDelta) · uStepScale` per ray. Two failure modes:
(a) on elongated volumes `rayLen/MAX_STEPS` dominates (~11 base voxels on a
SPIM diagonal) — jittered MIP over level-0 bricks at that pitch is per-pixel
noise ("incredibly grainy"; legacy got away with 32 steps only because its
monolithic texture was coarse and linear-filtered); (b) the jitter offset was
`delta · rand(gl_FragCoord)` with `delta` a function of per-fragment ray
length and the moving↔settled `uStepScale` toggle — so the noise realization
changed every frame during motion and swapped wholesale on drag start/end
(shimmer + full-screen "flicker"). Fixes: **step length must be LOD-adaptive
per sample** (fine pitch only where fine data is sampled, so 512 steps stay
affordable), and **jitter must be motion-invariant** (no rayLen, no
uStepScale in the amplitude).

The per-level pitch itself went through two generations: `.x` → the MAX
spatial scale component → (2026-08-19, `orkestrator.anisoStride`, default ON)
the **direction-projected ellipsoidal crossing distance**
`0.75 / |dirB / uLevelScale[lvl]|` (CPU mirror
`features/bricks/shaderspec/raymarchStep.ts directionProjectedPitch`). The max rule never
oversampled the coarsest axis but under-sampled every finer one: on
[2ⁿ,2ⁿ,1] pyramids (z never downsampled) a face-on ray stepped by the xy
factor straight through the z planes — a 6× undersample that dropped thin
structures from MIP. The projected pitch is identical on isotropic levels
for every direction, bounded above by the max rule, and guarantees ~one
sample per voxel crossing on every axis. Under the flag `uMinDelta` is inert
(its max-axis floor would pin the projection back to the legacy rule) — the
stride floor is `rayLen/uMaxSteps` alone (termination guarantee unchanged)
and the jitter amplitude is the projected pitch of `uDesiredLevel` (still
replan-cadence, still motion-invariant). LOD selection
(`wantFiner`/`desiredLevelAt`) and the tricubic gate deliberately STAY
max-based — those are screen-footprint questions, not marching-density ones.

Consequence for VOLUME projection: since `stepLen` varies with per-sample LOD
and `uStepScale`, front-to-back opacity accumulation must be **step-size
corrected** or coarse levels / camera-moving frames render dimmer (fewer, larger
steps accumulate less opacity). The volume accumulator uses
`a = 1 − (1 − sampleNorm)^(stepLen / refStep)` where `refStep` is the
finest-shown level's settled pitch (`uDesiredLevel`, no `uStepScale`) — identity
at the finest settled sample, brighter as the step grows. Mirrored/tested by
`features/bricks/shaderspec/opacityCorrection.ts` (+ `.test.ts`). MIP/AttenuatedMIP are `max()` and
need no correction; **MIP coarse-dimming is a separate, inherent effect** — a
mean-downsampled zarr pyramid stores lower peaks and normalization is
LOD-independent (`brickResidency.ts` `pool.minValue/maxValue` from level 0), so
coarse MIP is faithfully dimmer. Not fixable in the renderer; the real fix is a
max-downsampled pyramid upstream.

**P15 — Slab z must floor-divide from ONE base z, and levels that don't
cover the slab must drop out of the chain.** Two live failures, same shape
(refinement silently stuck at the coarsest level for *certain* z values):
(a) computing each level's slab as `round(localZ / scaleZ)` independently —
for z=150 with scales 32/16 that yields slab 5 coarse but slab 9 fine, and 9
is a child of brick 4, not 5, so the DFS finds no matching children. Derive
every level's index by floor-division from the same base index (floor chains
compose: `floor(floor(z/a)/b) = floor(z/ab)`), which also matches the shader
(`floor(baseZ / scale)` per level). (b) truncated pyramids genuinely LOSE
tail slices at coarse levels (81 base slices → z shape 2 at scale 32 covers
only base z < 64): for z=76 the coarsest level has no data at all. Clamping
to its last slice shows the wrong z and stalls the chain exactly like (a) —
instead, such levels drop out and the DFS roots at the coarsest level that
still covers the slab.

Related change: `currentZ` is NOT part of the residency slice signature — z
is a spatial axis of the brick address (the page table holds every slab), so
z-scrubbing must not flush the layer; revisited slabs come straight from the
pool. Flushing per z was legacy ChunkPlane semantics and made every slider
step a multi-second refetch on plane-chunked data.

**P16 — Guard axis-mapping collisions from layer config.** `intensityAxis` is
server/user data; a live layer shipped `intensityAxis === zAxis === "z"` on a
single-channel 256³ stack. The geometry builder read the z extent as the
channel count → 16 phantom channels → every brick slot, fetch and atlas
inflated 16× (4 MB slots, a 512 MB atlas blowing straight through the 128 MB
pool cap, since the coarsest-level slot floor overrides the byte budget).
`resolveAxisIndices` now resolves an intensity axis that collides with a
spatial axis to -1 (no channel dim). Trust nothing about dim mappings.

**P17 — Render-cadence state must not live in React-subscribed store fields.**
The scene has two planes: the render plane (trackers, managers, three.js
objects — all vanilla `store.subscribe` + imperative updates + `invalidate()`)
and the UI plane (React). The rule: **React-subscribed store fields may only
change at UI cadence** (user action or camera-settle). Continuous render facts
flow through vanilla subscriptions / `useFrame` / uniforms; if the UI must
display one, publish a throttled or settled snapshot — and subscribe to
**scalars, never objects** (the P9c corollary). Violations found in one audit,
all the same shape (render fact → React store field → per-tick re-render of a
heavy subtree):

- `worldUnitsPerPixel` was written per frame (`camera.position.length()`
  changes during pan/orbit too, not just zoom) → ScaleBar re-rendered per frame
  and both probe-marker components rebuilt their geometry memo per frame. Fix:
  probe markers compute the radius from the camera in their own `useFrame`
  (`platform/probe/probeWorld.ts` splits camera-independent geometry from
  `probeMarkerRadius`); `CanvasSync` publishes the store value throttled
  (150 ms leading + trailing) for the HTML ScaleBar only.
- `residencyVersion` (per-upload-batch) was the layers' only way to catch the
  rare "pool appeared/rebuilt" event → every streaming batch re-rendered every
  layer. Fix: `poolsVersion`, bumped only on pool create/rebuild/dispose;
  `residencyVersion` remains for the debug UI, whose components are now
  MOUNT-gated on `debug` (`WhenDebug` in `Scene.tsx`) so their subscriptions
  don't exist otherwise.
- The layers subscribed to the `nodePlans[layerId]` OBJECT (new identity per
  replan, ≤5/s during a pan) to courier three scalars into uniforms. Fix:
  scalar selectors (`targetLevel` / `slabZ` / `mode` / `nodes.length > 0`);
  event-time consumers read the full plan via `storeApi.getState()`.
- `viewStore.updateCameraData` minted fresh `viewportSize`/`cameraPose` object
  identities per 16 Hz emission; it now preserves the previous references when
  value-equal, so object selectors can't re-render at frame rate by accident.
- `probedCoordinate` is published once per voxel crossing, which while the
  cursor sweeps is once per frame, and it had four React subscribers. Both
  probe markers built their React `key` from `voxelIndex`, so every crossing
  unmounted and remounted the marker — disposing and rebuilding its geometries
  and materials, i.e. a fresh WebGPU pipeline object, tens of times a second.
  `ProbeAxisGuides`' effect dep was `probe.worldPos`, a new array identity on
  every publish, so it rewrote three Line2 buffers for a point that had often
  not moved. `SelectedPointPanel` re-rendered its whole HUD subtree.
  Fix: `probedCoordinate` is declared a HOT field (vanilla subscribers only);
  the canvas-side consumers bind imperatively (`features/probe/useProbeMarkerBinding.ts`,
  and the guides' value-deduped subscription); React reads `probeReadout`, a
  settled snapshot published by `features/probe/ProbeReadoutSettler.tsx` once the
  cursor rests, with retractions, clicks and target changes bypassing the wait
  (`platform/probe/probeReadout.ts`). `AttributeProbeTracker` rides that same
  settle instead of keeping a second, independent debounce.
- Corollary for write-side dedup gates (`sameViewRanges`): never gate a hot
  store write on a continuously-varying cosmetic field (the `viewportFraction`
  regression) — compare only what downstream consumers need per-tick.

**P18 — A single-level dataset makes the "cheap pinned coarsest level"
assumption catastrophically false.** The whole design leans on coarsest =
tiny + always-resident: the planner's budget floor falls back to it, reconcile
pins all of it, and `ensurePool` floors the atlas slot count at the coarsest
grid — deliberately overriding the byte budget (P16). With NO multiscale
pyramid, coarsest = level 0 = full resolution, and every valve inverts at
once: a 2048×2048×1024 uint16 volume floors the 3D atlas at ~18.9 GB (the
`Float32Array` backing throws an uncaught RangeError inside `ensurePool`,
which also aborted reconciliation of the REMAINING layers until reconcileAll
got its per-layer try/catch), and the planner emits the entire full-res grid
as unconditional root `target`s (`maxPlanBytes` only gates refinement into
children, never roots) → a full-dataset fetch storm re-triggered per
interaction. The same volume floors the 2D atlas at ~16 GB — the 2D slot
floor spans EVERY z slab (that is what makes z-scrubbing instant).

The guard: `assessPoolViability` (`features/bricks/octree/poolViability.ts`) computes
the coarsest-grid floor with the same helpers `ensurePool` uses and refuses
the layer when it exceeds `getInitialVolumeTextureBudgetBytes()` — the
device-scaled GLOBAL budget, NOT `MIN_LAYER_POOL_BYTES` (128 MB), which
known-good deep 2D stacks legitimately exceed (a 3000-slice SPIM stack floors
at ~200 MB+ after P1's z-payload doubling). Enforced PRIMARILY in
`nodePlanTracker` (it plans every visible store layer whether or not a mesh
is mounted, so an unmount-only guard would not stop the fetch storm): a
refused layer gets no plan → the brick layer components render nothing → no
pool, no fetch, no atlas. `ensurePool` re-checks as a hard stop for direct
callers. The refusal is surfaced via `viewerStore.unplannableLayers` — an
amber strip on the layer card (with a one-click switch to the other display
mode when THAT one is affordable) and a DebugPanel line. Affordable
single-level cubes are untouched (the check is budget-based, not
"single-level ⇒ refuse"). Do NOT try to budget-cap roots inside the planner
instead — partial coarsest coverage would violate the shader's fallback
invariant. The real fix for such data is a server-side pyramid.

**P29 — The gradient half-step is bounded by the brick BORDER, not by taste.**
Cinematic shading takes six central-difference taps at `±GRADIENT_H` texels off
the resolved `texelBase` (`emitFieldGradient` in
`features/bricks/gpu/brickNodeMaterials.ts`). This is free — no extra page-table
walk — precisely because a 3D brick carries a 1-voxel replicated border and the
3D atlas is linear-filtered (`brickSpec.ts` `border = 1`, `brickResidency.ts`
`filter: spec.border > 0 ? "linear" : "nearest"`). The safe range of a slot is
`[slot + 0.5, slot + slotSize - 0.5]` while the payload occupies
`[slot + 1, slot + 1 + payload)` — exactly 0.5 texel of margin per side. So
`GRADIENT_H = 0.5` is an INVARIANT, not a tuning knob: `h > 0.5` reaches past
the border into the neighbouring slot in x/y, and in z into the neighbouring
CHANNEL SLAB (`slotSize.z = stored.z * channelCount`), silently mixing another
channel's data into the normals. Nothing crashes; the picture is just quietly
wrong. `platform/gpu/shading.test.ts` asserts `GRADIENT_H <= spec.border` across
every spec `resolveBrickSpec` can produce, the payload-doubling path included.
If a wider baseline is ever genuinely needed, the correct move is a full
`emitResolveBrickResidency` per tap (~7× the march), not a bigger `h`.

**P19 — Byte budgets lie on integrated GPUs: budget main-thread GPU uploads by
TIME.** The 6 MB / 12-brick per-frame upload budget was calibrated on a
dedicated GPU where a `texSubImage3D` costs ≪1 ms. On an Apple M2 (ANGLE-Metal)
the SAME call measured **~17.5 ms per 256² brick** — a full batch stalled the
main thread for >200 ms per streaming frame (perf-recorder signature:
`cpuMs.max ≈ 250 ms`, jank landing in the post-gesture streaming burst,
`movingFrames 0`). The stall also delayed the repack workers' response
messages, inflating repack WALL time ~6× past exec time. Fixes, in
`platform/quality/uploadBudget.ts` + `drainUploads`:
- the drain loop is additionally capped by **wall clock** (`maxMs = 4`,
  `shouldContinueDrain`) with a guaranteed first-brick-per-frame — fast GPUs
  still fit their whole batch, slow ones self-limit to ~1 brick/frame;
- `platform/quality/QualityAdapter.tsx` halves the DPR during camera motion ONLY
  when the rolling frame time shows the machine can't hold ~45 fps (an M2 at
  Retina DPR 2 was GPU-bound at ~19 ms/frame just compositing 2D layers);
  restores on settle, machines that hold rate never regress;
- the repack pool scales mildly with cores (2–4 workers).
Diagnosis path: perf recorder → DebugPanel `upload X ms/brick` chip
(`stats.uploadMs / bricksUploaded`). If per-brick upload stays >5 ms after
these, the next lever is three.js' texStorage3D/immutable-texture path on
ANGLE-Metal — measure before building.

**P21 — The double-AABB visible box lied under 3D perspective, and tilt made
it flip the budget floor mid-gesture.** `layerViewRanges` was computed as
world-AABB(frustum corners) ∩ layer box, re-AABBed through the inverse affine.
Under a perspective camera near or inside the volume the frustum's world AABB
contains ~the whole layer, so `visibleBox` degenerated to the full dataset:
the budget floor (`visibleBytesAtLevel`) stopped tracking the screen — deep
zoom could not unlock finer levels on large volumes — and TILTING inflated the
AABB up to ~√3× further, pushing `visibleBytesAtLevel` across `maxPlanBytes`
and flipping `budgetMinLevel` a level coarser mid-gesture, which replaces the
ENTIRE finest target set (abort/fetch/evict churn during the exact gesture
that is already fragment-bound). Fix: `platform/visibility/frustumClip.ts`
`frustumBoxIntersectionAabb` — the EXACT AABB of the frustum∩box intersection
polytope (candidate-vertex construction), computed directly in voxel space via
`projScreen × affine`, so both legacy inflations are gone; `scale` is now
measured at the visible box's center rather than the layer origin. Related:
frustum-plane extraction and NDC-corner unprojection must match the matrix's
NDC z convention — WebGPU maps z to [0,1], and the WebGL-convention default
put the near plane at ~near/2 (mildly too permissive). `CameraPose` now
carries `coordinateSystem` from the real camera; visibility and the plan
tracker pass it through.

**P22 — Frame cost is linear in volume passes, and the governor was blind to
scene content.** One full-screen additive raymarch per merge group + one per
label volume layer, no early-Z, `Discard` after the loop — N distinct images
cost N full marches of their overlap, and NOTHING scaled down as N grew: the
tier reacts only to sustained slow-frame streaks (which a 20↔30 ms mixed
scene never produces — one in-band frame resets the streak), demotion only
changes ACTIVE knobs above TIER_LOW, a settled heavy scene on the demand
frameloop feeds the governor nothing at all, and a demote persists a
too-low tier for the MACHINE when the real cause was the SCENE. The fix is
scene-load FEEDFORWARD (`registerVolumePass` → `volumeLoadFactor`, applied in
`useStepScaleUniform`): each mounted raymarch pass registers with the
governor, and step scales stretch by √(pass count) (capped 2×) so total
sample cost grows ~√N instead of N — known before the first heavy frame
renders, nothing persisted. The burst ladder consumes the same signal (≥3
passes floor the entry rung at 0.75), and three burst-timing repairs landed
with it in `QualityAdapter`: the entry rung was predicted from the PREVIOUS
burst's EMA (stale after idle — the first tilt after a zoom ran a whole
gesture unmitigated), so ONE mid-burst downward correction is now allowed
(`shouldStepBurstRungDown`, ≥450 ms into the burst so the EMA reflects its
own frames — a single extra realloc, not the old self-amplifying cascade);
and the 250 ms crisp-DPR entry delay is skipped when the predicted rung is
already < 1 (a predicted-heavy burst's first quarter-second IS the jank).

**The quality GOVERNOR generalizes this** (`platform/quality/qualityGovernor.ts`): the
one-shot motion-DPR regress still janked because the real jank window is
STREAMING, not motion — after any gesture, bricks stream for seconds and every
residency bump renders a "settled" full-quality frame (DPR 2 + full-pitch
raymarch) at 25–50 ms. The governor:
- learns a machine tier (High/Medium/Low) from CONSECUTIVE slow/fast frame
  deltas (15 slow → demote; 120 fast + 30 s post-demote cooldown → promote;
  streak counting on deltas, not the EMA — a stale EMA from the old tier would
  cascade demotes before the cheaper tier could prove itself);
- persists the tier per GPU (`localStorage` `scene-quality-tier:<UNMASKED_RENDERER>`),
  so later sessions start right; DebugPanel has an Auto/High/Medium/Low
  override for testing;
- drives every knob from one profile table: settled/active DPR
  (`platform/quality/QualityAdapter.tsx`), 3D `uStepScale` settled/active
  (`BrickVolumeLayer`), upload time budget, per-layer in-flight fetches, and
  the residency-bump cadence (`brickResidency.ts`), where **active = camera
  moving OR bricks streaming** (the drain loop feeds the streaming edge).
The decoded-chunk cache also halves on ≤8 GiB machines (GC pressure). A
dedicated GPU stays at High forever — zero behavior change.

**P23 — Never derive a GPU resource's USAGE FLAGS from whether a lazy helper
exists yet.** `ensurePool` chose the atlas's storage binding with
`computeStorage: gpuRepacker !== null`. That was fine while the manager could
not exist without a renderer — but once it starts before the device (§2.8), a
pool created pre-attach sees `null` and allocates an atlas **without the
storage binding, permanently**: GPU repack is then silently dead for that
pool's whole life, with no error, just a quiet fall back to the CPU worker path
and a slower scene. Usage flags must come from inputs that do not depend on
initialization ORDER — here `isGpuRepackEnabled() && !hasPhasorSlabs(geometry)`,
the flag plus the geometry. Related: `ensureGpuRepacker()` must return `null`
while detached WITHOUT memoizing it (`gpuRepacker` stays `undefined`), or "no
device yet" becomes "no device ever". The debug report distinguishes the
legitimate pre-attach case as `lastRepackPath: "cpu:no-renderer"` — if every
brick reads `cpu:*` after attach, this trap has fired.

**P24 — Decode accounting must count every axis the FETCHER decodes, and a
budget in one currency must not be spent in another.** Two bugs, one root.
(a) `visibleBytesAtLevel` / `chunkDecodedBytes` multiplied spatial extents by
bytes-per-voxel and stopped — but the fetcher pulls one chunk per (spatial,
channel-chunk, phasor-chunk) and every chunk carries its full non-spatial
extent, so a 4-channel layer was under-charged exactly 4× (`nonSpatialDecodeFactor`
now mirrors `enumerateBrickChunkCoords`; the SLOT side had `channelCount` from
day one via `brickSlotBytes`, which is what made the discrepancy invisible).
(b) `maxPlanBytes` was compared against decoded CHUNK bytes by the budget-floor
loop and against GPU SLOT bytes by `refineBudgetBytes`/atlas sizing — one
number, two incompatible units. A level could therefore be unlocked on a slot
budget the chunk cache could not feed: on a plane-chunked pyramid, by an order
of magnitude, which is a 42 GB download rather than a slow frame. The floor is
now `decodeFloorBytes`, derived from the decode cache, with the coupling
`COARSE_CHAIN_RESERVE × floorLevel + allowance ≤ cacheShare` so any level the
planner unlocks has a working set the cache can hold. Symptom to recognise:
`decodeBytesCharged: 0` forever while `budgetMinLevel` sits one level above what
the view obviously wants.

**P25 — A headroom CONSTANT must be capped by the pyramid it guards.**
`MIN_POOL_HEADROOM_SLOTS` (64) is a target, not a floor, and a pool smaller than
it can never satisfy it — so every comparison against the raw constant is
unconditionally true on a small dataset. Two of its four consumers were
uncapped. `nodePlanTracker`'s live-atlas clamp subtracted `64 × slotBytes` from a
9-slot atlas (a 9-brick pyramid, which `resolvePoolBudget` correctly sizes the
atlas to EXACTLY, returning `headroomSlots: 0`), went negative, floored at ONE
slot — and `refineBudgetBytes = maxPlanBytes − coarsestReserveBytes` was then 0,
so `visit()` rejected every child and the plan was a single coarsest target at
every zoom, on every small image. `trimUnreachableResidents` compared `free`
(max 8) against the same 64 and trimmed every unprotected resident on each
reconcile, refetching the whole pyramid per zoom-out (113 fetches / 97 trims for
9 bricks). Both now go through `poolHeadroomSlots` / `resolvePlanBytesForAtlas`:
headroom is ZERO when the pyramid fits the atlas that exists, and at most half
the slots otherwise; large pools are byte-identical. Symptom to recognise:
`targetLevel` pinned at the coarsest level with `budgetMinLevel: 0` and
`decodeBytesCharged: 0` (which rules out the decode floor, P24) — `nodeCount: 1`
and `planBudgetBytes == slotBytes` name it outright.

**P26 — An EXACT frustum test has no hysteresis, and the flip-flop reads as
edge flicker.** The 2D path prefetches a `PREFETCH_MARGIN` (0.25) band around
the viewport, but the 3D node test was `voxelFrustum.intersectsBox(nodeBox)`
with no slack. That test is geometrically correct — a ray only samples inside
the frustum, so nothing being drawn *this frame* was culled — but a node
straddling a side plane flips visible↔culled on sub-pixel camera motion, and
each flip evicts its brick and refetches it a frame or two later. Orbiting or
panning therefore shimmered along the left/right/top/bottom edges, worst at
coarse levels where a refetch is most expensive. Fix: `FRUSTUM_CULL_MARGIN`
(0.25, `viewportPlanning.ts`) — `nodeInFrustum(box, margin)` grows the NODE by
a fraction of its own extent per axis rather than dilating the frustum planes,
which keeps the margin scale-free (a coarse node, costlier to refetch and
covering more screen, gets a proportionally larger one) and costs no plane
math. Crucially the margin-only survivors are tagged `fetchBand: 2` alongside
the 2D margin's, so they are fetched LAST: without that arm the hysteresis
band competes with genuinely visible bricks for in-flight slots and trades
edge flicker for centre latency. Symptom to recognise: bricks blinking at the
viewport border during camera motion only, steady once the camera is still.

**P27 — A retry is only a fix if it retries somewhere DIFFERENT.**
`brickResidency`'s `outcome.failed` handler unmaps the page entry, releases the
slot and pushes the key back onto `pendingFetch`, on the stated assumption that
*"a failed batch marks the repacker broken, so the retry repacks on the CPU
path."* That holds for the two BATCH failures (a throw sets `broken`; `!ready()`
short-circuits) but never held for the per-job branch in
`computeRepack.submitAndRead`: `buildKernelDispatches` returning empty ("no
chunk overlaps the brick") failed one token and left the repacker healthy, so
the retry came straight back to the GPU path and failed identically —
deterministically, since the result is a function of the brick's geometry. The
page entry unmapped and refilled forever at fetch cadence **with no camera
motion and no replan**, which is what "flickering while standing still" was.
Fix: `GpuFlushOutcome` now separates `unsupported` (this repacker can never
produce it) from `failed` (retry elsewhere); `unsupported` keys land in
`pool.gpuIneligibleKeys`, consulted at the `useGpu` gate so the retry takes the
CPU worker, and are warned about once (an empty dispatch for a brick the planner
asked for is a real upstream bug). Symptom to recognise: `stats.fetchErrors`
climbing with the camera parked; `lastRepackPath` reads `cpu:gpu-ineligible`
afterwards.

**P28 — Hysteresis on one edge is not hysteresis.** The governor's `streaming`
flag had a 300 ms trailing clear but asserted TRUE the instant
`anyPipelineWork()` went true, every drain frame. Three settle mechanisms reset
off that flag — `QualityAdapter` re-reads `cameraMoving || isStreaming()` per
frame and drops/restores DPR (a render-target realloc), `decideSettleRefine`
slams the settle ladder to stage 0 for a two-stage re-climb, and
`decideVolumeFrame` bypasses the frame cache outright — so ONE brick landing at
idle cost a canvas resolution change plus a raymarch-quality restart. That is why
three unrelated-looking symptoms (sharpness pulse, graininess pulse, block pop)
always appeared together, and why the renderer was fragile to any residual work,
including legitimate band-2 prefetch (P26). Fix: `decideStreamingFlag` — a pure
both-edge decision (`assert`/`clear`/`arm-*`/`hold`, in the idiom of
`decideSettleRefine`) with a `STREAMING_ASSERT_MS` (120 ms) leading debounce, so
a burst that drains inside the window never reaches the ladders. Safe because
this is a QUALITY signal, not a correctness one: a brick that changes the image
still re-renders via its `poolsVersion` bump and `invalidate()`. 120 ms is
comfortably inside `ACTIVE_DPR_DELAY_MS` (250 ms), so genuine streaming still
drops quality on time. Related: the occupancy-range promotion
(`brickResidency.ts` `occPromotionWorthwhile`) deliberately fires *when the
pipeline is quiet* and bumps `poolsVersion` unthrottled — that is correct and
converging (post-promotion `observedSpan === encodeSpan`), and it is this
debounce that keeps its brief burst from tripping the ladders.

**P30 — A quick zoom must fetch only the FINAL, ON-SCREEN set.** Three
mechanisms compounded to make a one-second zoom cost several times the bricks
it ended up showing. (1) `wantFiner` was a bare `>= 1` footprint threshold, so
a zoom resting at a level boundary flipped the whole plan every replan; each
flip aborted unprotected in-flight bricks, could trim every resident finer than
the new `minTargetLevel`, and refetched them on the flip back — the oscillation
the residency comments measured at 13× fetch amplification. (2) Mid-gesture
replans (every 500 ms in motion) launched wide intermediate-level fetch sets:
at 500 ms into a zoom the frustum is still wide, and since chunk decodes are
deliberately never aborted, the settle plan only freed their concurrency slots
while the decodes kept competing with the final bricks for worker time and
upload budget. (3) Margin-only band-2 prefetch was ordered last but always
fetched, decoded and uploaded, during the gesture too. Fixes, all pure and
unit-tested: LOD hysteresis via `previousKeepKeys` + `LOD_HYSTERESIS`
(per node, so exact under per-node perspective LOD, uniform in 2D); the motion
ceiling `refineCeilingLevel` (previous `targetLevel` while `cameraMoving` —
the settle-edge reschedule lifts it ~150 ms after rest); and
`shouldDeferPrefetch` in the global dispatcher — band 2 dispatches only with a
resting camera and zero on-screen bricks in flight (the k-way merge sorts by
band, so a band-2 winner already means nothing on-screen is pending). A
wheel-driven zoom also relies on `cameraInteraction`'s wheel hold
(`platform/camera/cameraMotion.ts`): before it, `cameraMoving` flickered on
every trackpad tick and each flicker was a settle edge, i.e. 3–5 extra plans
per zoom.

**P20 — Handler ATTACHMENT is the raycast gate, not the handler body.** R3F
puts an object in `internal.interaction` as soon as it carries any event
handler, and the raycast runs BEFORE the handler does — so a handler that
early-returns on the interaction mode has already paid for the pick. The
fabriks layer attached `onPointerMove` to a `manager.group` holding a
`BatchedMesh` of up to 2048 cells (no BVH in the tree), which meant every
pointer move in EVERY mode, NAVIGATE included, walked every instance. The fix
is to pass `undefined` rather than a no-op handler
(`platform/probe/probeGating.ts`), which removes the object from the set outright.

Two asymmetries make this easy to reason about wrongly, and both are load-
bearing:

- **pointermove is filtered; click-class events are not.** R3F narrows the
  pointermove set to objects carrying `onPointerMove/Over/Enter/Out/Leave`
  (`filterPointerEvents`). Annotations are `onClick`-only, so they were never
  in the pointermove raycast — an earlier comment on `SceneViewport`'s
  `PointerMoveGate` claimed otherwise and sent readers hunting in the wrong
  place. They ARE fully raycast on pointerdown/pointerup/click, per Line2
  segment, with `LinePickTuning`'s widened pick band on top; `AnnotationLayer`
  therefore passes `onClick={undefined}` when a shape is not selectable rather
  than returning early inside it.
- **`raycast = () => {}` also stops the recursion into children**
  (three's `intersect`), which is how the fabriks selection hull and the debug
  `cellBoxes` LineSegments leave the pick set without leaving the scene graph.

**P13 — three.js overlay geometries don't dispose themselves.** The residency
overlay rebuilds wireframe `BufferGeometry`s on every residency change; without
an effect-cleanup `dispose()`, that's an unbounded GPU leak on exactly the
debugging tool you have open while chasing memory issues.

Repo-wide gotchas that apply here: no `React.lazy` in the renderer (Electron
`file://` chunk loads fail — flag switches use static imports), and the
typecheck ratchet (never raise the pre-existing error count; syntax errors
mask everything downstream, so check touched files individually).

---

## 5. WebGPU backend (migration complete, 2026-07)

The scene renders through three's **`WebGPURenderer`** on native WebGPU (macOS
= Metal — eliminating the ANGLE `texSubImage3D` upload stalls of P19), async
init in `Scene.tsx`'s Canvas `gl` factory.

**WebGPU is a hard requirement — there is no WebGL2 fallback.** The migration
initially rode on three's automatic WebGL2 fallback backend; that path is now
deleted, because a silent downgrade rendered a subtly degraded scene while
reporting success only to the console. Two mechanisms replace it:

- `platform/gpu/webgpuSupport.ts` — `assertWebGPUSupported()` probes
  `navigator.gpu.requestAdapter()` and is awaited in `SceneRoot`'s existing
  init gate, *before* `<Canvas>` mounts, so an unsupported machine gets a
  legible "This scene cannot be rendered: …" message. This is the user-facing
  gate; it must stay ahead of the Canvas, because R3F v9 fire-and-forgets the
  async `gl` factory (`react-three-fiber.esm.js:111`) and a throw from inside
  it can never reach React.
- The factory nulls `renderer._getFallback` before `init()`. three 0.184 has no
  `forceWebGPU` and clobbers any caller-supplied `getFallback`
  (`three.webgpu.js:82651`); nulling the private field the base `Renderer` read
  it into (`:58077`) makes `init()` reject at `:58528` rather than swap
  backends. **Re-verify this on every three upgrade** — the `isWebGPUBackend`
  assert below it is the tripwire.

Consequences and contracts:

- **TSL only — no raw GLSL `ShaderMaterial`s.** `WebGPURenderer` does not run
  them. The brick shaders live in `features/bricks/gpu/brickNodeMaterials.ts` (TSL →
  WGSL); the old GLSL reference strings are deleted, and the value semantics
  the CPU must mirror moved to `features/bricks/octree/brickEncoding.ts`. NodeMaterials go
  through the renderer's output transform, so the brick materials pin
  `toneMapped = false` for parity with the raw FragColor path. Uniform updates
  go through the returned NODE records (`bundle.nodes.uDesiredLevel.value = …`),
  not a `.uniforms` map.
- **Backend internals are isolated in `platform/gpu/sceneRenderer.ts`** (device,
  texture handles, `maxTextureDimension3D`, GPU identity for the quality
  governor). Nothing else may touch `renderer.backend`.
- **Uploads** (`features/bricks/gpu/texSubImage3d.ts`):
  `device.queue.writeTexture` partial 3D writes — no alignment constraints, no
  unpack state (P3 is obsolete). Uninitialized texture → full `needsUpdate`
  re-spec from the CPU backing mirror.
- **Integer page table**: three maps `RGBAIntegerFormat` + `UnsignedByteType`
  → `rgba8uint`; the TSL walk uses `textureLoad` (texelFetch equivalent). The
  R32F atlas's LinearFilter relies on the `float32-filterable` device feature,
  which three requests automatically when the adapter supports it.
- **GPU frame timing** (`PerfFrameProbe`): `gpuMs` comes from WebGPU timestamp
  queries. The renderer is constructed with `trackTimestamp: true` so init()
  validates feature support, then Scene.tsx parks the backend flag OFF —
  timestamp writes flood the 2048-slot query pool unless resolved every frame,
  and only a recording does that. `PerfFrameProbe` flips the flag on for the
  recording's lifetime, calls `resolveTimestampsAsync(TimestampQuery.RENDER)`
  per recorded frame (reads the previous frame's pass time), and drains on
  stop. Null on adapters without `timestamp-query`.
- Deferred WebGPU-era upgrades: storage-buffer page table (obsoletes the P2
  packed-texture workaround).

## 6. Status & what's deliberately deferred

Done and verified: all six migration phases (including the Phase 6 cutover:
legacy renderers, trackers, and the migration flag deleted), three rounds of
live performance hardening plus the grain/flicker fix (P14), scene tests
green, typecheck at baseline.

**Deferred on purpose** (measured as non-bottlenecks or memory trade-offs; do
not implement without cause):

- per-mode pool retention (instant 2D↔3D toggles; doubles per-layer memory),
- per-frame `uniformArray` re-upload (~5 KB/material/frame: three's
  `UniformArrayNode` is `updateType = RENDER` and `Buffer.update()` returns
  true unconditionally, so five arrays rewrite every frame even static —
  measured as queue-submission noise; the escape hatch, if a recording ever
  shows otherwise, is moving `chParamsA/B` into the existing `sourceParams`
  DataTexture side-band, which also frees two UBO bindings),
- 3D / temporal prefetch (only 2D adjacent-z slabs prefetch today) and
  occlusion-aware planning (the planner is frustum + distance only).

No longer deferred:

- worker-side repack shipped with the P17 hardening (`repackDispatcher.ts`),
  alongside the per-array zarr-metadata memo and the `useSharedArrayBuffer`
  forwarding fix in `getChunkWorker`;
- **motion-time reduced-resolution rendering shipped** as the interaction DPR
  ladder (`platform/quality/qualityGovernor.ts`, applied by `QualityAdapter`): a quantized
  rung `[1, 0.75, 0.5] ×` the tier's active DPR, decided ONCE per activity
  burst by `predictBurstLadderScale` — the frame-time EMA normalized by the
  previous burst's rung² (fragment-bound: cheap-because-low-res frames must
  not predict full-res headroom). Mid-burst stepping was self-amplifying
  (every `setDpr` reallocates render targets; the spike frame inflated the
  EMA, dropping another rung → another realloc), so a gesture now pays at
  most ONE realloc, and frames immediately following any `setDpr` are never
  fed to the governor. Floored at 1 device px, on EVERY tier (HIGH included);
  the settle restore brings the crisp image back. Kill switch:
  `orkestrator.adaptiveDpr` (read per frame; DebugPanel toggle + live dpr
  chip);
- **standard-fidelity default** (`FidelityMode` in `platform/quality/qualityGovernor.ts`,
  key `orkestrator.fidelity`): the governor's SETTLED profiles are moderately
  capped by default — DPR ≤ 1.5, settled step scale ≥ 1.25, ray steps ≤ 384
  (`standardizeProfile`; TIER_LOW effectively unchanged) — trading a little
  settled sharpness for frame time. "High fidelity" in the DebugPanel restores
  the original table verbatim; active-path knobs are untouched either way;
- the shader fast path + phasor specialization (§2.10,
  `orkestrator.shaderFastPath`), equivalence-class planning (§2.7), the
  GPU-flush byte accounting (§2.8) and the repack output free list (§2.9);
- **occupancy-based resident-brick skipping** (§2.4/§2.10 — clim-aware hops +
  MIP maximum culling from the RG8 page-table sidecar; P22's shader half);
- **scene-load feedforward quality** (`volumeLoadFactor` step-budget scaling,
  burst-rung flooring, one mid-burst rung correction — P22), the tricubic
  activity/tier gate (`resolveSmoothThreshold`), the exact frustum∩box
  visible region (P21, `platform/visibility/frustumClip.ts`), and the GLOBAL in-flight
  fetch cap (§2.8);
- **adaptive depth** (`resolveMaxRaySteps`): the ray-step CEILING halves while
  the camera is moving or bricks stream (further divided by the load factor,
  floored at `MIN_ACTIVE_RAY_STEPS`). This is the knob that actually bounds
  the zoom+tilt worst case — there the diagonal ray always runs to the
  ceiling (the `floorDelta` stride floor guarantees full-ray coverage), so
  `uStepScale` lengthens strides without reducing the sample COUNT; only the
  ceiling does. `uMaxSteps` moved from the React-effect uniforms to
  `useStepScaleUniform`'s vanilla subscription, which owns every
  activity-edge knob (step scale, smooth threshold, max steps);
- **merge-rule loosening**: `MAX_MERGED_MEMBERS` 4 → 8 (every member folded
  in removes an entire full-screen pass; slot/cursor ceilings still bound
  per-step work; `orkestrator.volumeMerge` remains the A/B lever), and the
  merge affine key is quantized to 12 significant digits
  (`quantizedAffineKey`) so numerically-equal-but-not-bitwise transforms no
  longer split a group into separate passes;
- **atlas-sum creation cap** (`ensurePool`): a new pool's allocation is capped
  to what the device budget has left across ALL live atlases (never below the
  coarsest floor), fixing the creation-order overshoot where early pools kept
  budget/2-sized atlases as more layers opened;
- **step pitch on the MAX spatial scale component** (`levelPitch` — stepLen,
  refStep, `uMinDelta`, the tricubic gate, and the label raymarcher), closing
  the last `.x`-vs-max lockstep gap with `wantFiner`/`desiredLevelAt` —
  since superseded for the STRIDE by the direction-projected pitch
  (`orkestrator.anisoStride`, P14; LOD selection and the tricubic gate stay
  max-based);
- `BrickVolumeLayer` subscribes to a scalar identity key over its GROUP's
  layers instead of the whole `layers` array — an edit to an unrelated layer
  no longer re-renders every volume component (the last P9c-shaped hazard);
- **streaming render cadence** (§2.8): residency-driven invalidates are
  coalesced to the bump cadence with an off-frame drain pump — the first
  slice of the "frame cost is O(scene) per invalidate" gap to
  Neuroglancer-style progressive rendering (the remaining slice, cached
  volume compositing into an offscreen target, is a future step);
- `emitResolveBrickResidency` takes a `name` prefix — the label contour
  emits one full resolve per NEIGHBOUR, and the fixed `res*` names produced
  a TSL rename warning per var per neighbour, drowning the real-shadowing
  signal those warnings exist to carry;
- **lazy backing mirror + R16F atlases** (roadmap R3, see §2.5): the CPU
  atlas mirror is gone by default (probes read the decoded-chunk cache, the
  path GPU-repacked bricks always used; `orkestrator.atlasMirror` restores
  it) and uint16 intensity pools store half floats
  (`orkestrator.r16Atlas`, `features/bricks/octree/halfFloat.ts`) — together ≈4× less
  memory for uint16 data, and the null-data texture creation also absorbs
  the old `texStorage3D` deferred item (no more one-time zeroed full upload).

Assessed and NOT done, deliberately: an image+label merged pass. It would
share only the loop scaffolding — the two pools still need two page walks per
step — while requiring a dual-traversal material that cannot be verified
without a GPU; the mask pass is already cheap in practice (its background is
EMPTY-skipped brick-at-a-time, and the occupancy skip now covers its resident
fringe). Revisit only with a measured recording showing the label pass's
rasterization overhead matters.

---

## 6b. Cold open & in-motion latency (2026-08-19)

The §6/§7 work above all targets STEADY-STATE frame cost with data already
resident. Two separate axes got their own pass:

**Time to first voxel.** The cold open was one serial chain: `GetScene` →
WebGPU adapter → the general zarr grant → one `/zarr.json` per level → open
arrays → canvas → `renderer.init()` → first fetch. Three things came off it:
`mikro-next/lib/zarr/useDatalayerWarmup.ts` (mounted ABOVE the query gate in
`ScenePage`, since `DetailQueryRoute` renders `<LoadingPage/>` and mounts
nothing below it during the round trip) starts the credential grant, the
WebGPU probe and the zarr worker prewarm in parallel with `GetScene`; the
repack dispatcher gained `prewarm()` so the first brick no longer pays worker
spawn + module eval; and the brick system moved outside the canvas (§2.8). No
kill switch on the warmup: `getGeneralAccess` collapses in-flight callers and
clears `inFlight` in a `finally`, so a failed warm cannot poison the scope
build, which still awaits, still re-mints, and still surfaces the error.

**Measuring it.** `platform/perf/coldOpenTimeline.ts` — always on, ~13 stamps per
scene open, `performance.mark`/`measure` so the phases also show in a Chrome
trace, surfaced as `coldOpen` in the debug report. `perfMonitor` structurally
cannot see this window: it only arms once the scene is already up.

**In-motion.** Two asymmetries: (a) image volumes raymarch into the
compositor's target at 0.5 linear scale during a gesture, but LABEL volumes
cannot share that target (NormalBlending vs an additive-delta buffer) and so
render live in the canvas pass at FULL buffer resolution every frame —
`CANVAS_PASS_ACTIVE_STEP_SCALE` recovers part of that with stride, kept modest
because masks are nearest-sampled and an over-long stride steps over thin
structures (a correctness artifact, not blur); (b) the compositor built its
`structureKey` — a string over every volume mesh's world matrix — eagerly,
every frame, including the gesture frames where the camera compare above it
guarantees a render. It is now a thunk `decideVolumeFrame` resolves only if the
cheaper checks pass, with an unresolved key on EITHER side counting as changed,
so the shortcut can only cost an extra render. Also: `CanvasHueProbe`'s
per-frame canvas blit is throttled to ~4 Hz while the camera moves (the tint
updates at most every 4 s by its own design), and `QualityAdapter`'s mid-burst
branch no longer reads `localStorage` on every frame of a gesture.

**Assessed and NOT done** (would need a measurement first): caching
`collectPassSets` (its invalidation conditions are exactly what `structureKey`
detects — circular), and caching a per-trackable local bounding box in
`computeSceneVisibility` (only valid if a layer's internal transforms are
static, and `VertexHandles`/annotation children rescale per frame; a wrong
visible box corrupts `rootRange`). A LABEL-only cached render target — the
proper fix for the asymmetry above — remains the follow-up named in §7 R1.

---

## 6c. LOD floor, budget currencies and the plane-chunk wall (2026-08-19)

A user could never reach level 0 in 3D however far they zoomed. Root cause, and
the reason zooming could not help: on a pyramid whose L0 chunks are full
2456×2456 planes, `spatialChunks[x] == spatialShape[x]` forces
`min(gridExtent, chunkCount) ≡ 1` on x and y, so `visibleBytesAtLevel(0)` is a
CONSTANT under zoom and pan. P21's "the floor tracks the screen" mechanism is
inert on plane-chunked data. 2D reaches L0 on the same dataset because
`visibleBytesAtLevel` charges one z-chunk row there (`mode === "2D"`) instead of
all sixteen — a factor of exactly 16, straddling the cap.

What changed:

- **`MAX_LAYER_POOL_BYTES` → `MIN_LAYER_POOL_BYTES`.** 128 MiB was a flat
  CEILING, so a 2 GiB device planned exactly as coarsely as a 512 MiB one. It is
  now the FLOOR of a device-scaled share (`POOL_PLAN_SHARE_FRACTION`, with
  `POOL_RESERVE_COUNT` so pool #1 does not spend what pool #2 will need). The
  default 512 MiB device is byte-identical to before — deliberately, and pinned
  by test.
- **The decode budget split off** — see P24. `resolveDecodeFloorBytes` /
  `resolveDecodeAllowanceBytes` derive from the chunk cache;
  `SUB_FLOOR_DECODE_FACTOR` is gone.
- **Two user overrides**, `orkestrator.volumeBudgetMB` (VRAM) and
  `orkestrator.decodeCacheMB` (heap), memoized per session so the planner and
  `ensurePool` can never read different values mid-reconcile.
- **`poolAtlasBytes` + a tracker clamp.** `maxPlanBytes` now scales with the pool
  count, so closing a layer could size a plan for a share the existing atlas was
  never allocated for. The clamp reads a static allocation size — NOT a replan
  trigger (P7). The headroom it withholds is capped by the pyramid
  (`resolvePlanBytesForAtlas`) — subtracting a flat 64 slots from a small atlas
  left the plan one slot and pinned refinement forever (P25).
- **Diagnosability:** `plans[].levelDecodeBytes` (per-level decode cost, the
  exact quantity the floor compares) plus a `budget` block with the raw
  `deviceMemory` and both overrides. This question previously required deriving
  chunk arithmetic by hand.

For that dataset the honest outcome: the defaults preserve L1 (corrected
149.6 MiB) but do NOT reach L0 (1104.5 MiB) — the floor tops out at a quarter of
the cache share. L0 is reached through the sub-floor ALLOWANCE with
`decodeCacheMB` raised to 4 GiB, at a one-time ~1.08 GiB decode burst, because
every L0 brick touches all 64 chunks of the level. The real fix remains
re-chunking L0 with tiled x/y chunks upstream.

---

## 6.9 Settled flags — every kill switch is gone

**2026-09-01.** The renderer used to carry 24 `orkestrator.*` flags. Every one
of them is now settled: the optimisation each gated is unconditional, the
alternate branch is deleted, and the DebugPanel toggles are gone. There is no
longer a way to A/B any of these at runtime.

**This was a deliberate trade.** Each flag meant two live codepaths, and the
"off" branch of a default-ON flag was, in almost every case, code that only
existed to be the thing we were no longer doing. Carrying it cost a branch in
the shader emission, a second path to reason about, and — measurably — an
accumulator (`maxSampleNorm`) computed per sample for a skip test that the fast
path had already made before any sampling happened.

**If performance or correctness regresses, this is the list to walk.** Each row
names what is now always on and what reverting it means. Recover the deleted
branch from git history at the commit that removed it.

| Setting, now permanent | Was | Revert if |
|---|---|---|
| `shaderFastPath` | ON | Skippability is decided BEFORE per-slot sampling. The legacy order sampled first, then tested — revert if a skip predicate turns out to need a sampled value. |
| `fixedShapeFastPath` | ON | Intensity/RGB layers compile specialised compositors. The general 16-slot compositor is pixel-identical by construction, so a difference here is a bug in the specialisation. |
| `occHierarchy` | **OFF (shipped dark)** | Rays hop whole coarse cells via the RG8 aggregate sidecar. **The least-validated of the three dark flags** and the largest new shader surface — suspect this first for a raymarch artefact. |
| `raw16` | **OFF (shipped dark)** | uint16 chunks stay `Uint16Array` end-to-end (2 B/voxel, not the widened 4). Halves decode-cache and upload bytes, and deliberately moves `budgetMinLevel` FINER on uint16 pyramids — so a plan that now reaches too deep on a big uint16 stack is this. |
| `occObservedRange`, `occPerSlab` | ON | Occupancy encoded against the observed range, per slab. Suspect for empty-space skipping that skips too much. |
| `anisoLod`, `anisoStride`, `worldLod` | ON | The world-metric LOD contract. Suspect for wrong refinement on anisotropic (SPIM-like) voxel grids. |
| `smoothZoom` | ON | Tricubic sampling on zoom. Purely visual; costs taps. |
| `gpuRepack`, `gpuRepackR16` | ON | The compute repack path. The CPU worker REMAINS as the fallback (`supports()` still rejects per atlas kind, and the broken-latch still reverts) — this only removes the ability to force CPU. |
| `r16Atlas`, `rgbaAtlas` | ON | Half-float and RGBA8 atlases. Revert if a pool's precision or channel packing looks wrong. |
| `volumeTarget`, `volumeCache`, `volumeDepthPrepass`, `settleRefine`, `adaptiveDpr`, `volumeMerge` | ON | The volume compositor and its ladder. `volumeDepthPrepass` OFF was always a *documented visual regression* (volumes compositing over meshes), so it is the one whose removal cannot be a regression. |
| `earlyBricks`, `twoPhaseBricks`, `annotationBatch` | ON | Out-of-canvas brick construction, halo prefetch, batched annotation lines. |

**One flag settled the other way.** `atlasMirror` is gone too, but it settled
**OFF**: its ON branch restored the *legacy eager CPU mirror* of the atlas, kept
only as an A/B lever after R3 made the mirror lazy. Turning it on would have
reinstated roughly 4× the host memory for intensity pools. What was deleted here
is the eager path — the mirror queue, its idle drain, and the `kind: "slot"` read
path that existed only to read it. Probes read the decoded-chunk cache through
`gpuStaleKeys`, as they already did by default.

**Two user-facing overrides survive**, because they are preferences and not kill
switches: `orkestrator.volumeBudgetMB` and `orkestrator.decodeCacheMB`, plus the
`orkestrator.fidelity` tier.

## 7. Roadmap — remaining gaps to Neuroglancer-class viewers

The 2026-08 design review closed the acute issues (see "No longer deferred"
above). What follows is what is STILL structurally behind Neuroglancer /
BigVolumeViewer, ranked by expected impact. Each item is its own future plan;
do them in this order unless a measurement says otherwise.

**R1 + R2 — Volume compositor — DONE (2026-08-19).** One mechanism for both:
`features/volume/VolumeCompositor.tsx` (mounted by `ThreeDScene`, 3D-only) takes
over rendering with a priority-1 `useFrame` (R3F's render takeover) and per
frame (a) re-renders the `VOLUME_PASS_OBJECT`-tagged raymarch meshes into a
persistent reduced-resolution `RenderTarget` when — and only when — a volume
input changed, then (b) renders the canvas frame with volumes hidden and a
fullscreen composite quad shown. All decisions live in the pure, tested core
`platform/gpu/volumeCompositor.ts`.

- *R2 (resolution decoupling):* target = `resolveVolumeScale` (FULL res
  settled — under the demand loop + cache a settled frame raymarches once,
  so reducing it would trade fidelity for savings the cache already gives —
  0.5 during CAMERA MOTION only; streaming stays full-res, or slow-network
  sessions would sit blurry for the whole drain and hide the progressive
  LOD sharpening) × the SETTLED-dpr buffer, clamped to the live buffer so
  the active-DPR ladder can never double-downscale; the ladder's
  volume-pass feedforward is neutralized while the flag is on
  (`ladderFeedforwardPassCount`). Bilinear upsample; bicubic/depth-aware is
  a possible follow-up.
- *R1 (cached compositing):* the frame key is an exact 16-element VP-matrix
  compare (computed in-frame — viewStore's camera is throttled and must not
  key a cache) + `residencyVersion` + `poolsVersion` +
  `qualityGovernor.getVersion()` + the non-reactive
  `viewerStore.volumeInputs` bump tracker (fed at the uniform-write sites:
  ray/step/channel/label uniforms, label LUT, and the collection layers'
  wrapped `invalidate`) + a structural key (`buildVolumeStructureKey`: count,
  material ids and world matrices of the tagged volume meshes AND of the
  depth-prepass OCCLUDERS — an occluder appearing or disappearing changes the
  target's depth and so its pixels, and keying only the volume meshes served
  the cached composite with a stale occlusion hole until the camera moved). While `isStreaming()`, EVERY
  invalidated frame re-renders — the streaming invalidates are already
  coalesced upstream, and `residencyVersion`'s separate throttle would
  otherwise let a streamed frame show stale bricks. Any doubt → render.
  Note the cache's payoff is overlay/ROI interaction and label edits; during
  pure orbiting every frame is legitimately dirty (`reason: camera`).
- *Compositing math (additive delta):* image volume materials are UNTOUCHED
  (plain AdditiveBlending — rgb (SrcAlpha, One), alpha (One, One)). Over the
  target's (0,0,0,0) clear that accumulates exactly the rgb+alpha delta the
  direct path would have added to the canvas, and the quad composites it
  with (One, One) on both channels — bit-for-bit identical over any
  background. The ALPHA half is load-bearing: the canvas is transparent over
  the scene's DOM background div, so volumes are only visible because they
  accumulate canvas alpha (an earlier alpha-pinning design rendered them
  invisible). LABEL volumes are NOT in the target — NormalBlending cannot
  share an additive-delta buffer — they raymarch live in the canvas pass
  after the quad (renderOrder 2 > 1); folding them into their own cached
  target is a follow-up. The target stays LINEAR; three's output pass
  tone-maps once, on the canvas render.
- *Occlusion:* a depth-only prepass draws opaque depth-writing MESHES into
  the target's depth so meshes still occlude volumes per-fragment. The
  occluders render with their OWN materials and `colorWrite = false`
  (`disableColorWrite`) — never `scene.overrideMaterial`: a plain override
  material corrupts BatchedMesh multi-draw ranges (out-of-range DrawIndexed
  on the fabriks layer). Lines/points/sprites are never occluders. The
  occluder set comes from `collectPassSets`, which PRUNES invisible subtrees
  (`Object3D.traverse` does not) — the collection layers hide by flipping
  their group, and a leaf the renderer skips must not stay in the set or the
  structure key cannot see the layer go.
- *Settle refinement ladder* (`orkestrator.settleRefine`, default ON, live):
  after the camera settles and streaming drains, the compositor drives
  `qualityGovernor.setSettleRefineStage` 0→1→2 (200 ms of quiet between
  stages), each stage DOUBLING the settled `uMaxSteps` of the IMAGE
  raymarcher (384→768→1536 standard; ceiling `MAX_RAY_STEPS_CEILING` = 2048,
  now the image material's compile loop bound) and re-rendering the cached
  target exactly once — `floorDelta = rayLen/uMaxSteps` halves per stage, so
  only saturated (edge-on/diagonal) rays pay more; non-saturated rays exit
  at bounds bit-identically. The stage rides the existing transport
  (governor emit → `useStepScaleUniform` dedupe → `volumeInputs.bump` →
  one cache-keyed re-render); it is IGNORED while active, reset on
  motion/streaming/flag-off/cache-off and on compositor unmount (a boosted
  budget must never reach the uncached direct-render path). Labels are never
  boosted (canvas-pass material). Pure decision: `decideSettleRefine`.
- Kill switches (DebugPanel toggles): `orkestrator.volumeTarget` (remount),
  `orkestrator.volumeCache` (live), `orkestrator.volumeDepthPrepass` (live —
  the escape hatch if the prepass ever misbehaves). Debug
  report: `volumeCompositor` (target size/scale, volumeRenders,
  cachedComposites, lastRenderReason). Expected renderCalls: 2 cached
  frame / 3 volume frame / 4 with prepass.

**R3 — R16 atlases + lazy backing mirror — DONE (2026-08-18).** uint16
intensity pools store `raw/65535` half floats in `r16float` atlases
(`features/bricks/octree/halfFloat.ts`; labels excluded via `geometry.exactValues`;
GPU repack rejects them → CPU worker path), and the CPU backing mirror is
gone by default — probes read the decoded-chunk cache via the `gpuStaleKeys`
path all GPU-repacked bricks already used. ≈4× memory for uint16 data.
Kill switches: `orkestrator.r16Atlas`, `orkestrator.atlasMirror` (DebugPanel
toggles). See §2.5.

**R3 addendum — r16f GPU repack — DONE, default ON (2026-08-27,
`orkestrator.gpuRepackR16`; needs `gpuRepack` + `r16Atlas`).** The R3
half-float atlases used to forfeit the compute path entirely (`supports()`
rejected `r16f`), so every uint16 intensity layer streamed through the CPU
worker: strided scalar copy + float32 scratch + scalar `floatToHalfBits` per
brick. `REPACK_KERNEL_R16_WGSL` (`gpu/repackKernel.ts`) is the r8 ARENA
kernel with TWO half texels per u32 — `pack2x16float(raw / 65535)` ORed into
its 16-bit lane, `arenaJobLayout(stored, channels, 2)` rows (66 → 256 B,
1.94× padding; 2D 256-wide rows → 512 B, none), then
`copyBufferToTexture` into the `r16float` atlas (not a storage format, hence
the arena; any format is a valid copy destination). The OR stays
load-bearing: `dest_origin.x` carries the border offset, so x-parity flips
at chunk seams and one word can straddle two dispatches — word-exclusive
ownership does NOT hold. Min/max reduce the RAW float (`decodeMinMax`), per
slab (R8). Parity: `repackKernel.test.ts` (arena simulator bit-identical to
the worker's `encodeHalfArray`), DebugPanel GPU self-test r16f fixture
(half bits within 1 ulp — `pack2x16float` rounding is implementation-
defined among the nearest). C3 — SHIPPED DARK (`orkestrator.raw16`, default
OFF pending live validation): the `'raw16'` texture fidelity keeps uint16
chunks `Uint16Array` end-to-end (halves decode-cache and upload bytes; the
`REPACK_KERNEL_R16_U16_WGSL` kernel reads `array<u32>` with `extractBits`,
and the CPU repack reads the u16 chunks through its generic element loops).
The decode budget currency follows (`decodedBytesPerVoxel`, 2 B/voxel for
uint16 under the flag), deliberately moving `budgetMinLevel` finer on uint16
pyramids — the same cache holds twice the working set.

**R4 — Hierarchical occupancy — SHIPPED DARK (2026-08-19,
`orkestrator.occHierarchy`, default OFF pending live validation).**
CPU: every landed brick range (uniform bricks as [v,v]) goes into a per-pool
`measuredRanges` map that SURVIVES EVICTION (data statements, invalidated
only by a pool flush); each landing writes any parent cell whose child set
just completed into a third RG8 page-table sidecar (`aggregate` in
`pageTableTexture.ts`) as the conservative union — pure helpers in
`features/bricks/octree/occupancyAggregate.ts`, straddle-aware for non-dyadic pyramids
(`parentCellsOf` is DEFINED by `childrenOf` membership, so completeness and
aggregation can never disagree). All-zero = unknown = never hop; texels
encode against Phase A's occupancy range and ride the same blank/re-encode
promotion protocol. Shader: before the per-brick skip, the fast path reads
the level-(lvl+1) aggregate and hops the whole COARSE cell when the same
predicate (`residentBrickSkippable`, aggregate bounds) clears every member.
NO explicit level guard is needed: the ray origin IS the camera, so
`desiredLevelAt` is monotone non-finer along the ray — the finest desired
level on any forward segment is at its start (= `lvl`, exactly what the
aggregate bounds); pinned by `desiredLevelForDistance` in raymarchStep.ts.
Coarser-fallback samples stay within the level-lvl hull up to downsampling
boundary bleed (beneath quantization slack, documented at the emission
site). Ray-entry/exit tightening (a prologue walking coarse cells before
the march) is DEFERRED — the in-march hop already crosses entry regions
cell-by-cell. Debug: pool report `occHierarchy {measured,
aggregatesComplete}` + `stats.aggregateWrites`.

**R7 — Fixed-shape materials — DONE, default ON (2026-08-27,
`orkestrator.fixedShapeFastPath`; needs `shaderFastPath`).** The layer split
into `IntensityLayer` / `RgbLayer` gives the compositor a DECLARED recipe
(`LayerState.renderKind`, `platform/model/layerModel.ts` `resolveRenderKind` —
structural, earned from the sources, so an edit that adds a curve/invert
demotes the layer to the general path). Three specialisations, all pinned on
the CPU because the shader cannot be:

- **2D plane** — `gpu/intensityNodeMaterials.ts`: `createIntensityPlaneMaterial`
  (one tap + one LUT sample, four plain uniforms) and `createRgbPlaneMaterial`
  (three taps assembled straight into a vec3 — NO LUT texture at all: the
  general path's tint rows are CONSTANT for a `colormap == null` channel, so
  its per-slot contribution is `tint · norm`, which `rgbUniforms.test.ts` pins
  by reading the baked rows). Bindings drop from 5 uniformArrays + 7 textures
  to 3 + 1 (intensity) / 3 + 0 (rgb).
- **3D volume** — `emitSimple` / `emitRgb` member arms in
  `createVolumeNodeMaterial` (a single layer is a one-member group, so they
  apply unmerged too). Per ray step the arm reads per-member PLAIN uniforms
  (`members[m].fixed`, sliced from the merged arrays by
  `fixedMemberUniforms`) instead of four `chParamsA/B.element()` reads, and
  the EMPTY, occupancy-skip and R4 aggregate predicates emit a straight-line
  `max(norm(lo), norm(hi))` instead of the 16-slot `Loop`+`Break`+`Continue`
  with two normalizes per slot. When EVERY member is fixed-shape the material
  is SLIM: `chParamsA/B`, `sourceParams`, `cursorParams` are never allocated
  (`ChannelNodesPublic` marks them optional; dispose/update sites guard).
- **One normalize emitter** — `emitScalarNormalize` is shared by the general
  `makeChannelNormalize` and both fixed-shape paths, so the transfer
  arithmetic cannot drift between reference and fast path. CPU mirrors:
  `shaderspec/raymarchStep.ts` `normalizeSlotValue`, `shaderspec/rgbComposite.ts`
  (rgb sample + occupancy bound ≡ the general per-slot derivation).

Uniform-data contracts: `intensityUniforms.test.ts` (≡ slot 0),
`rgbUniforms.test.ts` (≡ slots 0..2 + constant rows),
`mergedChannelUniforms.test.ts` (`isSimpleIntensity` / `isRgb` /
`fixedMemberUniforms`). Phasor (`renderKind === "phasor"`) is NOT
specialised — it keeps the general path. Off, every layer renders through the
general materials, a pixel-identical reference by construction: the flag is
the bisect tool.

**R8 — Per-slab occupancy — DONE, default ON (2026-08-27,
`orkestrator.occPerSlab`, read at POOL creation; intensity pools only).**
The repack scan and both GPU kernels now reduce one min/max bracket PER
ATLAS SLAB (`RepackResult.slabRanges`; kernel: per-channel workgroup
accumulators flushed into `minmax[(minmax_base + c)·2]`, `minmax_base` in
what was Params word 35, batches laid out by running slab count so mixed
channel counts pack). The occupancy and aggregate sidecars carry one RG8
PLANE per slab stacked along z (`pageTableTexture.occSlabs`; slab `s` of
page texel `(x,y,z)` at `(x,y,z + s·d)`; `octree/occupancySlabs.ts` decides
the count — 1 whenever the flag is off, the pool has one slab, or
`d·slabs` would exceed the 2048 extent — and 1 is byte-identical to the old
layout). The shader (`uOccSlabDepth`) reads each slot's OWN plane: the
fixed-shape arms one (intensity) or three (rgb) loads, the general loop one
per slot; a single-plane pool emits exactly the pre-flag code. `min`/`max`/
`uniformValue` stay the UNION, so EMPTY detection, auto-range and the
observed-range promotion are unchanged; residency keeps parallel
`brickSlabRanges` / `measuredSlabRanges` / `aggregateSlabRanges` maps
(`aggregateSlabsIfComplete`) that are populated only when `occSlabs > 1`.
CPU mirrors: `shaderspec/raymarchStep.ts` `occupancyUpperNormPerSlab` (≡ the
union predicate when every slab shares one bracket, never looser). Kernel
parity: `repackKernel.test.ts` (decodeSlabRanges, base layout) and the
DebugPanel GPU self-test (slab-for-slab compare). Follow-ups: per-slab EMPTY
fills (24 free page-entry bits for ≤3 slabs) and a per-slab OBSERVED encode
range.

**R9 — RGBA8 atlases — DONE, default ON (2026-08-27,
`orkestrator.rgbaAtlas`, module flag in `octree/atlasFormat.ts` like r16;
pool creation).** A 3/4-channel uint8 intensity pool (an RGB image) stores
its channel slabs INTERLEAVED in one `rgba8unorm` texel instead of z-stacked
(`atlasChannelsPerTexel = 4`, `atlasSlotDepth = stored.z`), so the rgb fast
path samples ONE texel per step (`emitRgbTaps`) instead of three, and every
tap through `emitChannelTap` / `emitTricubicTap` addresses `(slab >> 2)`
slab-depths down and `dot(rgba, mask(slab & 3))` — at one channel per texel
that emits the legacy `z += slab·depth` / `.r` verbatim (CPU mirror
`shaderspec/atlasTap.ts`). Selection is CONTENT-based (`atlasKindForGeometry`:
uint8, `channelSlabCount ∈ {3,4}`, no phasor, not a label), never
renderKind-based, so an intensity layer over the same array shares the pool
and `poolKey` is untouched. ONE slot-size function now feeds the planner and
the pool — `atlasSlotBytes(spec, kind)` at `nodePlanning`, `nodePlanTracker`,
`poolViability`, `ensurePool` and `pending.bytes` (a 3-slab rgba8 slot is
4/3 of its r8 twin; 2-channel pools stay r8 for that reason). CPU path: the
worker repacks planar into a byte scratch (per-slab min/max on the planar
layout) then `interleaveSlabsRgba8` (`octree/rgbaPack.ts`); GPU path:
`REPACK_KERNEL_RGBA8_WGSL` — the r8 arena kernel with one word per texel
and the channel byte ORed in (`arenaJobLayoutForKind`: `ceil(channels/4)`
images of 4 B texels, 1.94× row padding vs r8's 3.88×). Direct
`textureStore` was deliberately NOT used: the channel axis is commonly
chunked per channel (OME-Zarr c=1), so one texel's four bytes arrive from
up to four dispatches and only the OR is race-free. Probes read rgba8 pools
through the decoded-chunk cache (`backing` is always null); the skeleton
compute kernels return null (CPU fallback) for `channelsPerTexel !== 1` —
a component select there is a follow-up. Parity: `repackKernel.test.ts`
(arena simulator ≡ planar repack + interleave), `atlasFormat.test.ts`,
`brickAtlas.test.ts`, `shaderspec/atlasTap.test.ts`.

**R5 — Governor rework.** The tier is still a persisted frame-time-streak
machine label: a mixed 20↔30 ms scene never demotes (one in-band frame resets
the streak), and it conflates machine with scene. The feedforward
(`volumeLoadFactor`, adaptive depth) removed the sharp edges; the full fix is
continuous load-proportional control fed by a real cost model —
`renderCost.ts` is the intended home and is still unwired for layer admission
(`LayerRenderer` feeds `costBytes: 0`; only the 64-layer backstop culls).

**R6 — Small.** (a) Cross-pool fetch prioritization: order is foveated within
a pool but arrival-order across pools; Neuroglancer has one global priority
queue. (b) Prefetch is 2D-adjacent-z only — no 3D margin or temporal (t±1)
prefetch; band-2 margin prefetch is gated to a resting camera with an empty
on-screen pipeline (P30). (c) The settle restore lands DPR + tricubic + adaptive depth in one
frame — a visible quality pop; staggering them would soften it.

**Non-gaps** (deliberate design differences — do not "fix"): slice-first
economics and the precomputed/sharded data format are Neuroglancer choices
this renderer intentionally does not share; and the per-sample coarse-fallback
shader (§1) is strictly simpler and more robust than Neuroglancer's
cover/substitute machinery. The real fix for coarse-MIP dimming remains a
max-downsampled pyramid upstream (P14), not renderer work.

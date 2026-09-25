# The scene renderer — module map

417 files, ~82k LOC. This file is the map: what lives where, what may import
what, and the invariants a refactor must not break. Read it before adding a
file, and before moving one.

## Three tiers

**`shell/` knows every feature; `features/` know `platform/`; `platform/` knows
nothing about any feature.**

```
scene/
  Scene.tsx      the public API — what a host RENDERS (provider, viewport,
                 panels, the `inCanvas` slot)
  sceneHost.ts   the HOST API — what a workflow composed over the scene may DO
                 and KNOW: layer list + placement, placement preview, world
                 picks, modes. Plain data out, no stores or fragments.
  shell/         composition root: provider, viewport, mode subtrees, chrome,
                 the registries. Mounts everything; nothing imports it back.
  platform/      the generic engine. Layer model, coordinates, camera, GPU,
                 visibility, quality, stores. Has no idea what a "label" or a
                 "mesh" is.
  features/      one folder per concern, each readable end-to-end: its math,
                 its GPU code, its layer component, its panel, its store.
```

**Workflows live outside.** A task with its own lifecycle — a session, a
draft, save/cancel — is not a rendering concern and is not a `features/`
folder. It is a component OUTSIDE `scene/` that composes over these two entry
points and imports nothing else from here; the interactive registration
workspace (`mikro/components/registration`, guarded by its own
`registrationImports.test.ts`) is the model — and it is hosted on a PAGE OF ITS
OWN (`pages/SceneRegistrationPage`, `/mikro/scenes/:id/register`), opted into
from a scene through a local action; the scene page stays a viewer and mounts
none of it. What the scene gives such a host
is deliberately generic: `Scene.Viewport`'s `inCanvas` slot for its R3F
children, and `sceneHost.ts`. If a hook in `sceneHost.ts` only makes sense for
one host, it belongs in that host.

### `platform/`

| Dir | Owns | Knows nothing about |
|---|---|---|
| `model/` | the layer vocabulary: normalisation, guards, dims, data range, render graph, scene signatures | rendering, React, any feature |
| `coords/` | world transform, axis selection, level geometry, units | how anything is drawn |
| `camera/` | pose ⇄ server state, fitting, navigation, pan/orbit, tour interpolation, the R3F camera components | what is in the scene |
| `visibility/` | frustum tests, visible voxel ranges, pass/capture partitioning, the tracker | why anything is visible |
| `quality/` | the quality governor, LOD budgets, render cost, upload budget | which layer it is throttling |
| `gpu/` | the WebGPU renderer handle, capability gate, colormaps, buffer readback | scene semantics |
| `probe/` | the probe type vocabulary, hit targeting, gating, settling, world markers | the probe UI |
| `draw/` | WebGPU-native drei replacements: lines, grid, picking | what is being drawn |
| `layerui/` | the shared layer-card vocabulary every feature card builds on | any specific layer kind |
| `attributes/` | the DuckDB/Parquet column layer shared by meshes and labels | who is asking |
| `parquet/` | the level-of-detail Parquet prefix plumbing both collection formats read through: the transport contract, the S3 store, row-group byte spans, Morton cell addressing, the byte-bounded LRU | which format's blobs are inside a row |
| `input/` | keyboard target guards | which shortcut |
| `perf/` | perf monitor, cold-open timeline, rAF coalescing, commit profiler | what it is measuring |
| `sources/` | zarr store construction and array opening | rendering |
| `stores/` | the scene-scoped zustand stores | feature internals |

### `features/`

`bricks/` is a **shared engine, not a peer feature**: it is the pyramidal octree
volume renderer, and `volume/`, `labels/` and `probe/` are its consumers. It is
the one folder other features may import.

| Feature | Owns |
|---|---|
| `bricks/` | `octree/` planning + addressing, `gpu/` atlas/page-table/materials/repack, `residency/` the streaming state machine, `layers/` the brick layer components, `shaderspec/` CPU mirrors of the TSL shaders |
| `volume/` | intensity image layers, the two-pass compositor shell, levels + phasor editors, the render-graph editor |

| `labels/` | label-mask layers, label materials and uniforms, the object-id colour LUT, the label card |
| `annotations/` | ROI geometry, drawing gestures, the drawers and handles, annotation layers and panels, the ROI stores, and `enhancers/` (vector trace, brush skeleton, smooth blob) |
| `meshes/` | the fabriks Parquet mesh-collection renderer end-to-end |
| `network/` | the konnektion Parquet network-collection renderer end-to-end — node/edge graphs (traced arbors, vessel trees, connectomes) |
| `probe/` | the probe trackers, readout settler, axis guides, and the readout UI |
| `animation/` | the camera-tour editor and player |
| `debug/` | the debug panel shell and the residency overlay |

### The registries

Feature-vertical layouts normally collapse where shared UI has to render
per-kind pieces. `shell/` owns the dispatch tables, and **each feature
contributes one entry to each**:

```
shell/layerRegistry.ts            __typename -> { Layer2D, Layer3D }   exists
shell/layerPanel/cardRegistry.ts  __typename -> LayerCard              exists
shell/debugRegistry.ts            feature    -> DebugSection           PLANNED
```

`cardRegistry.ts` landed when the schema split `ImageLayer` into the
fixed-shape kinds and the panel's five hard-coded, pre-partitioned card arrays
had to become nine. Its entries carry a `source` (`"layerState"` for the
lens-backed kinds, which MUST edit the objects the renderer reads, vs
`"fragment"` for the table- and collection-backed ones) and a `rank` (the
block order the panel groups by). The panel owns ordering and chrome and knows
nothing about which card is which.

The remaining planned one, the debug registry, lets each feature contribute its
own `DebugPanel` section instead of the panel reaching into brick and mesh
internals — the last big sideways cluster.

**Adding a LENS-backed layer type has a third, and it is the one that fails
silently:** `platform/model/layerGuards.ts`'s `isBrickLayer`. The two registries
are exhaustive `Record`s, so a missing typename is a compile error; a guard is
just a boolean, and a lens layer missing from it opens no zarr store and renders
NOTHING with no error anywhere. That file now states the invariant as a type
(`MissingFromBrickLayers`) so the compiler catches it too — keep that assertion.

Adding a layer type is otherwise: one folder under `features/`, two registry
lines. A COLLECTION-backed type (fabriks, konnektion) adds two more that also
fail silently rather than loudly:

- `platform/stores/sceneStore.ts`'s `carryRawSession` — every session-local
  field must be listed there, or it silently resets on each scene re-emission.
  The type is an intersection, so an unlisted field is merely absent.
- `mikro/lib/zarr/access.ts`'s `AccessKind` — the datalayer kinds issue
  SEPARATE credentials, and a konnektion prefix cannot be read with a fabriks
  grant. A missing kind downloads nothing.
`features/annotations/enhancers/registry.tsx` already follows the same shape.

## Import rules

1. `platform/**` imports nothing from `features/**` or `shell/**`. No exceptions.
2. `features/<a>/**` imports nothing from `features/<b>/**`, except:
   `volume -> bricks`, `labels -> bricks`, `probe -> bricks`,
   `annotations -> bricks`.
3. `platform/model/**` and `platform/coords/**` are leaves within `scene/`.
4. `shell/**` is imported by nothing except `Scene.tsx`.

**Keep the allowlist closed.** When a new cross-edge appears the answer is to
invert it, or to demote the shared symbol to `platform/` — not to widen rule 2.
Adding an entry needs a justification line here. The absence of any such check
is precisely what turned the old `core/` into a 153-file grab-bag.

**Known sideways edges, with their reasons** (the `KNOWN_SIDEWAYS` ceiling in
`architecture.test.ts`):

- `meshDesign -> annotations`, `meshDesign -> meshes`: the mesh designer
  (`features/meshDesign`) is a COMPOSITION of the annotation brush (its
  gesture, panels and tool store) and the fabriks reader/writer. These are the
  composition itself; they go away only if the brush and the fabriks writer
  move down to `platform/`, which they should not — both are features.
- `annotations -> meshDesign` (the brush hook dispatches a DESIGN release to
  `meshDesign/tools/registry` and the ANNOTATE candidate's "add to design"
  hands over the welded surface) and `meshes -> meshDesign` (the Meshes
  panel's "edit in design" entry): the hand-over seams. The tool registry
  CONCENTRATES the reverse edges — each design tool imports the annotation
  extraction core (`enhancers/paths/brushSkeleton/extraction.ts`) rather than
  the hook, which is what the raised meshDesign->annotations count pays for.

`architecture.test.ts` asserts these rules in `pnpm test`. Three are hard
zeroes; "features do not reach sideways" is a RATCHET against a known list, in
the same spirit as `typecheck-baseline.json` — the count may fall, never rise,
and clearing an entry means deleting it so it cannot come back.

`node scripts/scene-graph.mjs` prints the same graph for a human, with
`--edges` to list every offending import.

## Invariants a restructure must not break

- **P17 — the two-plane rule.** The scene has a *render plane* (vanilla
  `store.subscribe` + imperative mutation + `invalidate()`) and a *UI plane*
  (React). React-subscribed store fields may only change at UI cadence;
  subscribe to scalars, never objects. Several components are shaped the way
  they are *because* of this and say so in their docblocks. **Never convert a
  `useFrame` / `getState()` read into a `useStore(selector)` while moving code.**
- **P20** — handler *attachment* is the raycast gate. Pass `undefined`, never a
  no-op handler.
- **P13** — three.js overlay geometries need an explicit `dispose()` in effect
  cleanup.
- **Code splitting is UNPROVEN here, not impossible.** This rule used to read
  "no `React.lazy` — Electron `file://` chunk loads fail", and that premise is
  gone: since `098f661e` (2026-07-11) the packaged renderer is served over the
  privileged `app://` scheme for cross-origin isolation
  (`src/main/index.ts` registers it `standard`/`secure`/`corsEnabled`;
  `WindowManager.ts` loads `${APP_ORIGIN}/index.html`), and the build already
  emits and loads dynamic chunks (`zstd`, `blosc`, `lz4`,
  `meshopt_simplifier`). What is still true is that **nobody has proven a lazy
  route in a PACKAGED build** — so anyone introducing one must verify it there,
  not in `pnpm dev`, which is served over http and proves nothing about
  `app://`. Today the renderer is a single ~22 MB chunk (~4 MB gzipped) parsed
  in full at startup; the obvious candidates if this is ever picked up are
  Monaco (reached only by `kraph/components/cypher/`), the 3D scene stack, and
  the per-service route trees.
- **The typecheck ratchet stays at 0.** Syntax errors mask everything
  downstream, so check touched files individually during a mass rewrite.
- **`COORDINATE_SYSTEMS.md` §0 is settled** — corner-anchored frames, half-voxel
  convention, no client-injected flips. Do not re-litigate.
- **Pitfall numbers P1–P24 are cross-referenced between documents.** Keep the
  numbering when splitting docs.

### Four sibling pairs that must stay siblings

These resolve at *bundle* time via `import.meta.url`, and two name a `.js` file
that does not exist on disk — neither typecheck nor a `.ts` grep will catch a
break:

| File | Reference | Sibling |
|---|---|---|
| `features/bricks/octree/repackDispatcher.ts` | `new URL("./repack-worker.js", …)` | `repack-worker.ts` |
| `features/meshes/fabriks/fabriksDecodeDispatcher.ts` | `new URL("./fabriksDecode-worker.js", …)` | `fabriksDecode-worker.ts` |
| `features/meshes/fabriks/fabriksCore.test.ts` | `dirname(fileURLToPath(import.meta.url))` | `__fixtures__/` |
| `features/network/konnektion/konnektionCore.test.ts` | `dirname(fileURLToPath(import.meta.url))` | `__fixtures__/` (committed bytes + `generate.py`) |

## Open items

- **The scene is not multi-instance-safe.** `platform/perf/perfMonitor.ts` and
  `coldOpenTimeline.ts` are module-level singletons imported by 20+ files,
  despite the per-scene scoped stores. Known and deferred.
- **`platform/stores/viewerStore.ts` is composed from slices.** Six platform
  slices live in `platform/stores/viewer/`; the bricks and meshes features own
  theirs and `SceneProvider` registers them. It is one store and one `set` —
  slices compose, they do not split, so every write stays as atomic as it was.
  Read a feature's members through its own hook (`useBrickStore`,
  `useMeshStore`), not `useViewerStore`: the hook name is what tells the next
  reader which module owns the field.

  `shell/viewerStoreComposition.test.ts` pins the composed key set, because an
  unregistered slice is the one failure a type-checker cannot see.

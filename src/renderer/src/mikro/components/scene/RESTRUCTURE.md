# Scene restructure — working checklist

Transient. Delete when Phase 5 lands. `ARCHITECTURE.md` is the permanent map.

## Phases

- [x] **Phase 0 — prep and edge triage.** Dead files deleted; the move manifest
      (`scripts/scene-manifest.mjs`) maps all 432 files with no collisions; the
      import-graph walker (`scripts/scene-graph.mjs`) and the post-move
      simulator (`scripts/scene-simulate.mjs`) are in place; `ARCHITECTURE.md`
      written.
- [x] **Phase 1 — the move.** 432 files relocated, content-frozen; 837 specifier
      rewrites; git pairs 431 as renames. 263 prose references swept
      automatically (`scripts/scene-prose.mjs`) plus 11 files fixed by hand.
      The "Owns / Knows nothing about" tables live in `ARCHITECTURE.md` rather
      than 20 scattered READMEs — one page beats a hunt, and it cannot drift
      out of sync with the import rules sitting beside it.
      Verified: typecheck 0, 2005 tests, `pnpm build` still emits
      `repack-worker` and `fabriksDecode-worker` as separate chunks.
- [x] **Phase 2 — demote the shared vocabulary.** `OutlinePoint`,
      `MAX_BRICK_LEVELS` and the scene-scope contract moved down; the
      `bricks -> annotations` skeletonizer cycle inverted by registration.
- [x] **Phase 3 — invert the stores.** `SceneProvider` opens the zarr arrays;
      `createViewerStore` is a pure factory. The god-store SPLIT was
      deliberately not done — see "Scope decision" below.
- [ ] **Phase 4 — split the oversized files.** NOT STARTED. This is the whole
      of the remaining work; see below.
- [x] **Phase 5 — `architecture.test.ts`.** Brought forward ahead of Phase 4:
      it locks in the structure that already exists, and the file splits do not
      change the module graph.

## Where it stands

22 sideways edges, 0 of every other kind, 0 exceptions.
`pnpm typecheck` 0 · 164 test files / 2010 tests · `pnpm build` clean.

## The god store was sliced

An earlier pass argued against splitting `viewerStore` on the grounds that
`layerViewRanges` and `viewSnapshot` are published in one atomic `set`. That
reasoning was about splitting into *separate stores*; **slices are not that**.
A sliced store is one store, one `set`, one context — atomicity and provider
nesting are untouched — so the objection did not apply.

`ViewerState` was 79 members in one interface. It is now an intersection of
eight slice interfaces: six in `platform/stores/viewer/`, plus `BrickSlice` and
`MeshSlice` owned by the features that name their types. `SceneProvider`
composes them, which is what let the three `platform -> features` imports go and
rule 1 become unconditional.

Placement followed readership, not names: `volumeInputs` stays platform (bricks,
labels and volume all read it), `renderBudget` stays platform (only shell), and
`meshSelection` sits in the probe slice because the picked mesh instance is one
scene-wide selection of the same kind as the probed point.

## Phase 4 — what is left

Structural work is done; these are file-level refactors, each local to a folder
that now owns it. Ordered by value:

| File | LOC | Why |
|---|---|---|
| `features/debug/DebugPanel.tsx` | 1117 | `shell/debugRegistry.ts` — each feature contributes its own section. Clears **9** of the 18 sideways edges. ~800 lines of interleaved JSX; P10 says the debug report must not lie, so it needs a real visual check. |
| `features/bricks/residency/brickResidency.ts` | 3479 | Extract `ChunkService` (the closed 9-field set that IS the P8/P10 mechanism) plus the pure clusters; leave the streaming core whole. ~40%, not more. |
| `features/bricks/layers/BrickVolumeLayer.tsx` | 842 | Runs annotation drawing inline — clears **5** sideways edges. |
| `features/bricks/gpu/brickNodeMaterials.ts` | 1900 | Per shader concern. TSL only, no raw GLSL. |
| `features/volume/rendergraph/RenderNodeEditor.tsx` | 1231 | Extract `useRenderGraphEditor` — a GraphQL write path, not UI. |
| `features/meshes/fabriks/fabriksManager.ts` | 1155 | Its README already has the boundary table to split along. |

Also outstanding: `shell/layerPanel/cardRegistry.ts` (replaces
`LayerControlPanel`'s four hard-coded pre-partitioned card arrays — note this
changes render order from grouped-by-kind to scene order), and re-anchoring the
eight line-pinned doc references after each split.

## References deliberately left stale

## Baseline (2026-08-20, before Phase 1)

`pnpm typecheck` 0 errors · `pnpm test` 163 files / 2005 tests passing.

## Edge triage

The simulator applies the manifest to today's import graph and reports which
edges *would* violate the target rules. Starting point was **85** production
violations; choosing better destinations dissolved **59** of them without any
code change — that iteration is the whole point of doing this before Phase 1.

Placement decisions that dissolved edges, and why:

| Decision | Dissolved |
|---|---|
| **`probe` is two things.** The type vocabulary, hit targeting, gating, settling and world markers are infrastructure that bricks, meshes, annotations *and* the camera all use → `platform/probe/`. Only the trackers and readout UI are a feature. | 27 |
| Shared layer-card vocabulary (`cardControls`, `entrySections`, column editors, colormap/contrast utils) → `platform/layerui/` | 12 |
| `BrickLabel{Plane,Volume}Layer` are labels, not bricks → `features/labels` | 6 |
| `instanceColormaps` is colormap vocabulary, not mesh streaming → `platform/gpu` | 5 |
| `volumeCompositor` + `volumeTargetFlags` are pure pass decisions → `platform/gpu` | 2 |
| `animation.ts` is camera-tour math → `platform/camera`; `animationStore` → `platform/stores` | 3 |
| `rafCoalesce` is a scheduling utility misfiled under probe → `platform/perf` | — |
| `keyboardTarget`, `PreviewLine`, `AttributeRowsSection`, `levelGeometry` demoted to platform | 4 |

## Residual violations, and the phase that resolves each

26 production violations remain after the move. None is accidental:

| Edge | Count | Resolved by |
|---|---|---|
| `debug -> bricks`, `debug -> meshes` | 9 | **Phase 4** — `shell/debugRegistry.ts`; each feature contributes its own DebugPanel section |
| `bricks -> annotations` | 7 | **Phase 2** (2: the `brickResidency` → `computeSkeleton` cycle — hand out the renderer instead of constructing the skeletonizer) and **Phase 4** (5: `BrickVolumeLayer` does annotation drawing inline; splitting it moves that out) |
| `probe -> annotations` | 3 | **Phase 4** — `SelectedPointPanel`'s "create annotation from probe" |
| `stores -> bricks/meshes` | 3 | **Phase 3** — the store split by ownership; all type-only today |
| `annotations -> shell/SceneProvider` | 1 | **Phase 2** — extract `SceneGuard`/`useSceneScopeStatus` into `platform/stores/sceneScope.tsx` |
| `platform/draw -> annotations` | 1 | **Phase 2** — type-only; demote the outline type to `platform/model` |
| `platform/coords -> bricks` | 1 | **Phase 2** — `levelGeometry` needs only the `MAX_BRICK_LEVELS` constant; demote it |
| `meshes -> annotations` | 1 | **Phase 4** — `FabriksCollectionLayer` reads the ROI drawing store |

Re-run `node scripts/scene-graph.mjs` after any change — post-move it reports
the real graph, and it agreed with the simulation exactly.

## Two hazards found while reviewing Phases 0–1

**Phase 3 — `layerViewRanges` and `viewSnapshot` are one atomic write.**
`viewerStore`'s own docblock records why: `visibilityTracker` publishes both in
the SAME store write, and the node planner builds its `NodeCamera` from that
snapshot rather than a live `viewStore.getState()`. Before that, camera/box
coherence rested on zustand listener-insertion order plus rAF FIFO, and roughly
**1 in 4 mid-orbit replans** paired a fresh camera with one-emission-stale
ranges. The split table must place `viewSnapshot`, `layerViewRanges` and
`nodePlans` deliberately — if the first two land on opposite sides of a store
boundary the structural pairing is gone, and it fails intermittently, in
motion, with no test that catches it.

**Phase 2 — the skeletonizer inversion must hand out an accessor, not a value.**
`brickResidency` has `attachRenderer`/`detachRenderer`; the renderer dies with
the canvas. Expose `getRenderer(): SceneRenderer | null`, called per use, so the
annotations side cannot hold a reference across a remount. Check that
`computeSkeleton`'s broken-latch ("permanently reverts to the CPU reference")
cannot latch on a null renderer seen mid-remount. P23's tri-state rule is about
`gpuRepacker`, not the skeletonizer — do not over-apply it here.

## References deliberately left stale

`scripts/scene-prose.mjs` reports 9 it cannot resolve. All are correct as-is:
the "(Moved from `layers/three_d/volume-math.ts`)" provenance notes, the
"deleted at cutover" list in `OCTREE_RENDERER.md` (which now also records
`core/slab.ts` and `core/layerListLayout.ts`), and two regex false positives.
They point at files that no longer exist *on purpose*.

Eight doc references are pinned to a file *and a line*. Phase 1 was
content-frozen, so those line numbers are still correct — but Phase 4 splits two
of the files they point into, and a grep will silently leave the wrong number.
Re-anchor them after each split.

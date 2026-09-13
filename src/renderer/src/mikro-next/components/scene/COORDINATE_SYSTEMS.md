# Coordinate systems & the transform graph

How the scene renderer consumes the RFC-5-aligned mikro schema (coordinate
systems as nodes, transformations as edges), what the client derives from it,
and every invariant that keeps a voxel on screen where it belongs.

Companion documents: `OCTREE_RENDERER.md` (the brick-pool image renderer this
feeds), `features/meshes/fabriks/README.md` (the mesh-collection renderer built on the
same graph).

---

## 0. Coordinate conventions (settled — do not re-litigate)

The conventions every frame in this renderer is built on. They were settled
deliberately (2026-08); a change to any of them is a cross-cutting refactor,
never a local fix.

- **World** is continuous, physical, right-handed, with explicit axis order.
  A layer's LOCAL frame is continuous and **anchored at the array ORIGIN
  (corner) — never the center**. The center is a function of shape, so a
  center-anchored transform is invalidated by anything that changes shape:
  cropping, adding/dropping a pyramid level, streaming a tile subset,
  appending a slab. (Center parametrization is the registration OPTIMIZER's
  business — `T_c·R·T_c⁻¹` conditions fitting well — composed down to an
  origin-anchored affine for storage.)
- **Half-voxel**: integer index k uses the CORNER/texture convention
  internally — voxel k spans `[k, k+1)`, its center is `k + 0.5`. This is
  what the sampler wants, and it makes pyramid levels EXACT scales (with
  center-based indexing every level needs a half-voxel-ish translation — a
  live bug class in the NGFF world). Center-convention formats (NGFF, ITK,
  NIfTI, DICOM put the origin at the pixel center) are converted at exactly
  ONE boundary — metadata import/export, which is SERVER-side; this client
  never parses NGFF transform metadata.
- **The client composes `pathToWorld` and NOTHING else.** No anchoring one
  layer to another's frame (layers register to world, never array-to-array),
  no shape-derived recentering, no client-injected flips. If a y-down raster
  display convention is wanted, the server expresses it in the image node's
  index→local / transforms.
- **Images and meshes are the same kind of citizen.** A mesh has no lattice —
  a local continuous frame and one transform to world; an image node
  additionally owns its index→local map privately. Registration edges live
  only on local→world.
- **Volume-derived meshes** (marching cubes over a labels array) must go
  through the IDENTICAL index→physical map as their parent volume — a
  half-voxel mistake floats the mesh off its isosurface, invariant to LOD.

Concretely in code: voxel `v` of a layer renders at world `affine(v)`
(`buildAffineMatrix` — the plain composed affine), the brick meshes are unit
primitives offset by half their size so group-local spans `[0..shape]`, and
the shader/CPU local→voxel maps carry no flip (`brickNodeMaterials.ts`
`toBaseVoxel`, the plane material's `baseVoxel`, and their lockstep mirrors in
the probe/trace/visibility code — of which
**`features/bricks/octree/brickSampling.ts`'s `marchResidentBricks` is the one to check
first**: it kept a y flip for months after the shaders lost theirs, because
its tests only ever marched along x, and the CPU probe silently measured the
mirrored row. It now has Y-axis coverage; keep it).

---

## 1. The model, in three rules

The backend (OME-NGFF RFC-5 aligned) obeys three rules; the renderer's
adapter code is shaped by the same three. When editing anything in
`@/mikro-next/lib/coords/transformGraph.ts` / `platform/model/layerModel.ts` / `platform/coords/levelGeometry.ts`,
re-derive from here.

**R1 — `asAffine` is the placement; the client never composes a path.** The
server ships transformations as edges `(input CS → output CS, params)` and —
per SCENE LAYER — both a resolved **path** of edges to the scene's world
system (`Layer.pathToWorld: [{transformation, inverted}]`) and that path
**composed into one affine map** (`Layer.asAffine: {matrix, inputAxes,
outputAxes, total}`). A layer belongs to exactly one scene, so "this layer to
ITS world" has a single right answer, and the server states it once. The
client reduces `asAffine` to the spatial 4×4 by axis NAME in exactly one
place — `placementToSpatialAffine` in
`@/mikro-next/lib/coords/transformGraph.ts` — and NEVER walks `pathToWorld`
into a matrix: a second composition is a second source of truth that can
disagree with the first. `pathToWorld` is selected for provenance only (the
placement inspector, scene reconciliation keys). **A layer whose `asAffine` is
null is not placeable and is not drawn** (`isPlaceable`, gated once in
`shell/LayerRenderer.tsx` for every layer kind; the layer panel says why):
unregistered (no path), or a path the server cannot condense (a FIELD step
without a closed form, a singular inverse — the scene queries' `errorPolicy:
"all"` nulls that one field instead of discarding the scene). The only edges
the client still evaluates are WITHIN a dataset: the lens/level-0 `toParent`
prefix (§3.1) and the per-level pyramid factors (§3.2). Do not compose
matrices ad-hoc anywhere else.

**R2 — Store what was authored or measured; derive everything else.**
Server-derived (we consume, never re-implement): `Lens.renderAxes` (axis
mapping from axis TYPES), `Lens.toParent` (crop translation from slice
starts), `DataArray.toParent` (per-level pixel scale from actual shapes),
`Layer.pathToWorld` / `ImageLayer.levelPaths` (path resolution over the
graph), `Layer.asAffine` (that path composed). Client-derived (we own): the
spatial 4×4 reduced from `asAffine` plus the lens prefix, relative level
factors, GPU uniforms, frustums. If you find yourself persisting any of
these, stop.

**R3 — Coordinate systems are nodes, not strings.** Everything spatial is
anchored by CS id: datasets, pyramid levels, lenses, mesh collections, ROIs.
Axis names are only meaningful *within* a CS; all name lookups here go
through a specific CS's axis list.

---

## 2. What the server ships (the scene fragment)

```
Scene
├─ worldCoordinateSystem            # the scene's shared frame; axes may carry units
├─ (coordinateSystems NOT selected) # edges self-describe their axis order now
├─ registrations[]                  # scene-level edges (registrations), each with
│                                   #   inputAxes/outputAxes (param order)
└─ layers[]
   ├─ pathToWorld[]                 # SERVER-RESOLVED: ordered {transformation,
   │                                #   inverted} steps, source CS → world.
   │                                #   null = unregistered, [] = source IS world
   └─ ImageLayer
      ├─ (levelPaths NOT selected)  # exists in the schema (per-level paths) but
      │                             #   deliberately unqueried: it costs a server
      │                             #   path resolution per pyramid level and
      │                             #   duplicates the registration tail per level,
      │                             #   while the renderer uses one matrix per
      │                             #   layer + relative factors. Reselect when
      │                             #   per-level placement lands (§3.1).
      └─ lens
         ├─ renderAxes {x y z t intensity}   # derived from axis types (server)
         ├─ coordinateSystem                 # the lens' own (cropped) space
         ├─ toParent                         # lens → level-0 array space
         ├─ slices[]                         # authored selection
         └─ dataset
            ├─ intrinsicSystem               # the level-0 PIXEL grid: structural,
            │                                #   calibration-independent, what
            │                                #   pyramids/lenses/ROIs resolve against
            ├─ calibrations[]  (not selected) # PHYSICAL spaces, one edge from
            │                                #   intrinsic; recalibration bumps that
            │                                #   edge, nothing drawn in pixels moves
            └─ dataArrays[]                  # pyramid levels
               ├─ coordinateSystem           # this level's array space
               └─ toParent                   # level → intrinsic PIXELS — the scale
                                             #   IS the relative pyramid factor
```

**The unit story.** Intrinsic and array systems are unitless pixel/index
spaces — `Axis.unit` is null there (and `Axis.discrete` no longer exists;
discreteness follows from the system's kind). Units live on CALIBRATED
(`PHYSICAL`) systems and, usually, the world system. Physical voxel size is
therefore NOT in the pyramid's `toParent` edges anymore — it is the
calibration edge (intrinsic → physical), which arrives inside `pathToWorld`.
The scale bar still reads the world CS's first SPACE axis unit, falling back
to "px" (`sceneStore`).

GraphQL documents: `graphql/mikro-next/fragments/{scene,lens,layer,
coordinatesystem,dataroi,meshcollection}.graphql`. The `Transformation`
fragment expands composite edges (Sequence / ByDimension / Bijection) to a
FIXED depth — real edges are shallow (a pyramid level is
`Sequence[Scale, Translation]`; a registration is an `Affine` or
`ByDimension[Identity|Affine]`). If the server ever nests deeper, the extra
depth silently drops out of the query — extend the fragment, not the parser.

Gone from the wire (and from `ImageLayerFragment`): `Layer.affineMatrix`,
`ImageLayer.xDim/yDim/zDim/tDim/intensityDim`, `DataArray.scaleFactors`,
`Scene.spatialUnit/temporalUnit`, `DataRoi.dataset/xDim/yDim/zDim`,
`ADataset.coordinateSystem` (→ `intrinsicSystem` + `calibrations`),
`Axis.discrete`, `AxisType.ARRAY`, and `DataRoi`/`ShapeLayer` themselves
(→ `Annotation` in an `AnnotationCollection`, drawn by an `AnnotationLayer`).

**Deliberate fragment omissions (perf):**
- `lens.coordinateSystem` / `dataset.intrinsicSystem` are selected **id+name
  only** — their axis order equals the layer's dims by contract ("a selection
  never drops or reorders an axis"), so selecting axes only duplicated dims
  in every payload.
- `scene.coordinateSystems` is NOT selected (removed once §7 item 1 shipped):
  every edge carries `inputAxes`/`outputAxes`, which was the global list's
  only client-side job. The axis-resolution order in `transformGraph.ts` is
  edge-carried lists → CS index (world only now) → layer dims.
- `ZarrStore.accessGrant` / `ParquetStore.accessGrant` are NOT selected in the
  scene fragment — each grant is a server-side STS call; selecting them per
  store would turn one scene query into a dozen credential mints. Grants are
  requested lazily (zarr: existing store flow; parquet: mutation on mesh-layer
  mount).
- `CoordinateAnchor.valueHistogram` IS still selected (clim defaults + the
  brick pool's global min/max normalization need it, `platform/model/dataRange.ts`).
  It is always PRECOMPUTED server-side — there is no on-demand evaluation
  path; the field is either present or null. So selecting it costs only wire
  size (a few hundred floats per anchor), and a null histogram simply means
  clims resolve against the dtype range (the fallback `dataRange.ts` already
  implements).

---

## 3. What the client derives, and where

One rule of altitude: **everything below `@/mikro-next/lib/coords/transformGraph.ts` and
`platform/model/layerModel.ts` still sees the pre-migration flat facts.** The octree
planner, culling, slab math, probes and panels were not rewritten — they
consume derived fields with the exact semantics the server fields used to
have. The migration is an adapter, not a rewrite.

| Derived fact | From | Where | Consumed by |
| --- | --- | --- | --- |
| `LayerState.affineMatrix` (voxel→world 4×4, x/y/z rows) | local prefix (`lens.toParent`, level-0 `toParent`) ∘ `pathToWorld` steps | `composeLayerAffine` (`@/mikro-next/lib/coords/transformGraph.ts`), once per scene load in `normalizeLayer` | `worldTransform.buildAffineMatrix` (the rendered frame — corner-anchored, §0), `nodePlanning` 2D slab inverse, `visibility`, `RoiDrawer` |
| `LayerState.xAxis/yAxis/zAxis/tAxis/intensityAxis` | `lens.renderAxes` | `normalizeLayer` (`platform/model/layerModel.ts`) | `resolveAxisIndices` and ~15 call sites (slice signature, probes, panels) |
| Relative level factors (old `scaleFactors` semantics) | `toParent` pixel scales, `rel = abs_L / abs_0` (a no-op now that level 0 = 1) | `relativeLevelScaleFactors` / `buildLevelSources` (`platform/coords/levelGeometry.ts`) | level geometry, plan tracker, residency, pool viability, probe geometry |
| `spatialUnit` | first SPACE axis of the world CS | `sceneStore` | `ScaleBar` |
| Mesh transforms | `MeshLayer.asAffine` via `placementToSpatialAffine` | `platform/model/collectionPlacement.ts` | `features/meshes/FabriksCollectionLayer` |

Raw-fragment code paths that run BEFORE normalization (`lodPlanning`,
`renderCost`, `renderGraph.defaultLayerGraph`, `colormap-utils`) read
`layer.lens.renderAxes` directly.

### 3.1 `composeLayerAffine` — local prefix + server path

```
lens voxel ──toParent──▶ level-0 array ──toParent──▶ intrinsic pixels
 (crop translation)      (pyramid factor, ≈identity)
                                │
                 pathToWorld steps, evaluated in order
                                ▼
        … ──calibration edge──▶ physical ──registration──▶ world
             (pixel size — the ONLY place it lives)
```

- The `pathToWorld` span is NOT walked: `placementToSpatialAffine(layer.asAffine,
  lensTriple, worldTriple)` reduces the server's composed map to the spatial
  4×4 by axis name — rows by `outputAxes`, columns by `inputAxes`. (The
  `inverted` flags, `invert4` and step evaluation are the server's problem
  now; `invert4` survives only for the registration form's preview.)
- The path starts at the layer's SOURCE system, but the renderer's voxel
  frame is the LENS grid — so `composeLayerAffine` prepends whatever local
  prefix the path does not cover, keyed off the path's actual start CS:
  starts at the lens CS → no prefix; at the level-0 array CS → prepend
  `lens.toParent`; anywhere else (intrinsic, typically) → prepend both
  `toParent`s. This makes the client indifferent to which source the server
  chooses, and immune to double-applying the crop.
- `asAffine: null` → the layer is NOT PLACEABLE and is not drawn
  (`isPlaceable` / `unplaceableReason` in `platform/model/layerModel.ts`;
  gated once in `shell/LayerRenderer.tsx`, skipped by `sceneFit`, flagged by
  `shell/layerPanel/UnplaceableNotice.tsx`). Two reasons: `pathToWorld:
  null` (unregistered) or a non-null path the server could not condense.
  `composeLayerAffine` then returns only the local prefix, which is not a
  world position. `[]` (source IS world) composes to an identity `asAffine`
  → local prefix only.
- Arrays (`scale`, `translation`, affine rows/cols) are in the **axis order
  of the edge's input CS**. The spatial subset is extracted **by axis name**
  via `renderAxes` (never by position). Axis orders come from
  `scene.coordinateSystems` (fetched with full axes precisely for this);
  unknown systems fall back to the layer's dim order.
- Affine edges are `M × (N+1)`, rows in OUTPUT axis order, last column the
  translation — `evalTransform` maps the spatial block name-by-name between
  input and output systems (tested against the FLIM registration numbers).
- **The input and output sides are named separately.** `asAffine.inputAxes`
  are the layer's source-system names (`row,col` for a Visium bin lattice;
  the lens' `renderAxes` pick the x/y/z among them) and `outputAxes` are the
  WORLD's (`spatialAxisTriple(scene.worldCoordinateSystem)` — `x,y`).
  Every reducer — `composeLayerAffine`, the collection/annotation
  `resolveCollectionMatrix`, points, tracks — passes both triples. A world
  without typed axes keeps the lens names (older payloads, fixtures).
  Handing input names to the output side indexOf's every slot to -1 and
  drops the registration — that is a warned null, never a silent identity.
- An `asAffine` whose row count disagrees with its `outputAxes` is refused
  (`affine-arity` warning, identity) — one row per output axis is the
  contract; fix such payloads server-side.
- **Degradation is always to identity, never to a wrong matrix.** Edge kinds
  the evaluator cannot represent as a spatial affine (MapAxis permutations,
  Bijections, Displacement fields) warn once and drop out. If you add support
  for a kind, add it to `evalTransform`'s switch and to
  `transformGraph.test.ts` — nowhere else.
- `ImageLayer.levelPaths` (per pyramid level → world) is NOT selected: the
  octree renderer keeps one matrix per layer plus relative level factors, so
  querying it would pay per-level server path resolutions for nothing. When
  per-level placement lands (e.g. with the translation work below), it needs
  a server-composed map per level (`LevelPlacement.asAffine`, not in the
  schema yet) — the client will not walk `levelPaths[level].path` either.

### 3.2 Per-level scales: pixel factors in, relative factors out

RFC-5 levels are a STAR, not a chain: every level's `toParent` outputs the
same intrinsic system. With intrinsic = the level-0 PIXEL grid, a level edge's
scale IS the true relative factor (derived from actual shapes — a 36-slice z
pyramid gives 1,2,4,9,18,36, not the nominal-but-false 1,2,4,8,16,32), and
physical voxel size lives exclusively on the calibration edge.
`relativeLevelScaleFactors` still divides by level 0 — a no-op now (level 0 =
1), kept so physical-scaled level edges from older data remain correct.
Because `scale·shape == const` per axis, declared factors agree with
`resolveAxisScale`'s shape-ratio fallback by construction — they just
short-circuit it, and pyramids whose edges we can't read (missing `toParent`,
affine level edges) fall back cleanly.

`buildLevelSources` is THE one `LevelSource[]` builder (plan tracker,
residency manager and pool-viability probe all call it). Do not hand-roll a
fourth copy.

**Deferred on purpose — per-level TRANSLATION.** `Sequence[Scale,
Translation]` level edges carry the half-voxel offset introduced by
downsampling (`(f−1)/2`, in intrinsic pixels). The renderer does not consume it
yet: sampling assumes corner-aligned levels, which is the pre-migration
status quo (coarse LODs draw up to half a coarse voxel off — reads as "soft
when zoomed out"). Consuming it is a LOCKSTEP change across
`nodeBaseBox`/`slabLevelZ` (planner), `brickNodeMaterials` (TSL sampling
map), and `brickSampling` (CPU probe march) — see OCTREE_RENDERER.md P15/P14
for why these three must move together. Recommended shape: apply translation
exactly in the *sampling* path, keep brick *addressing* corner-aligned.

**Known planner nit for true-factor pyramids:** adjacent levels need not
divide evenly (z 4→9 is 2.25×), so `childrenOf` boxes don't nest exactly and
the DFS can visit a straddling child from two parents (no visited-set).
Bounded double-accounting; add dedup in `planLayerNodes` when translation
work lands.

### 3.3 Lenses and the crop offset

A cropped lens' voxel coordinates are OFFSET from its dataset's;
`lens.toParent` records that offset. Composition folds it into the layer
matrix, so anything downstream of `affineMatrix` is crop-correct.
Residual pre-existing hole (unchanged by the migration): the octree fetch
path plans in DATASET voxel space and applies `lens.slices` only to
non-spatial dims (`brickResidency.ts` fixed-index collapse) — a spatially
cropped lens fetches the full extent. Fixing that means clamping the
planner's visible box to the lens window; the transform side is already
correct.

`buildSliceSignature` keeps its exact semantics (axis mapping + non-spatial
slices; `currentZ` deliberately excluded — see OCTREE_RENDERER.md P15).

### 3.4 Annotations (the old ROIs)

An `Annotation` is **collection**-anchored, not CS-anchored and not
dataset/dim-string-anchored: the `AnnotationCollection` owns the coordinate
system its shapes' `vectors` are expressed in, and one collection is drawn by
one `AnnotationLayer` per scene. Styling (`strokeColor`/`fillColor`/
`strokeWidth`/`filled`) is per-shape — the layer renders a whole collection, so
a color on the layer could not tell its shapes apart.

Creation (`features/annotations/RoiDrawer.tsx`): the mutation takes `scene`, and the
server finds the scene's collection or mints it on first use together with its
CS, its registration into the world, and its layer. That registration is an
identity into the world, so the drawn **world** points are submitted as-is —
there is no inverse transform at creation any more, and no per-armed-layer copy.
Arming plays no part: a shape lands in the scene's own coordinate system, so
there is no layer for the user to be pointing at. EDIT mode + an active tool is
the whole precondition for drawing.

Reading (`features/annotations/AnnotationLayer.tsx`): the layer reduces its own
server-composed `asAffine` via `placementToSpatialAffine`, the same way the
mesh layer does; without one it is not drawn. `createdWithTransforms` is
provenance only — never used for resolution.

### 3.5 Axis mapping is structural now

`renderAxes` is derived server-side from axis TYPES (SPACE/TIME/CHANNEL), so
the P16 class of bug (`intensityAxis === zAxis`, 16 phantom channels, 512 MB
atlas) is structurally impossible — a dim cannot be two types. The
`resolveAxisIndices` collision guard stays as defense in depth. The spatial
dims are no longer user-editable, and the intensity mapping is persisted
through the render graph (`ChannelSourceNode.intensityAxis`), not a flat
layer field.

---

## 4. Frames: corner-anchored, pathToWorld is the placement

Every layer renders corner-anchored at its plain affine (§0): voxel `v` of an
image sits at world `affine(v)`, a mesh coordinate `c` at `pathToWorld(c)`,
an annotation likewise. Three-space IS world µm — the camera-pose frame map
(`cameraState.buildSceneToWorldMatrix`) is the identity, camera fit
(`sceneFit`) pushes the corners of `[0..shape]` through the plain affine, and
the probe/trace/visibility code reads layer-local coordinates directly as
voxel indices.

One asymmetry that looks like an oversight and is not: the 3D volume
hover-probes in ANNOTATE mode and the 2D plane does not. Inside a volume there
is no draw plane, so the probe IS the placement — every 3D annotation vertex
comes from it, and the `RoiDrawer`'s own interaction plane deliberately stands
down for non-primitive tools there — it stays mounted purely to CAPTURE the
click, which is why in 3D it is camera-facing at the orbit pivot rather than
lying on the world XY plane: a fixed quad at z≈0 is crossed by the view ray
wherever a tilted camera happens to point it, routinely far outside any finite
quad, and a missed quad means no drawer handler runs at all. Nothing about
placement depends on where it sits — every consumer re-derives its geometry
from `event.ray` or from the probe, never from `event.point`. In 2D that plane
drives the rubber band itself, and a second hover probe would only compete with
it for the pointer event. `platform/probe/probeGating.ts` makes this explicit with its
`annotateProbes` flag rather than leaving each layer to re-derive it.

**Which space answers which question** (the world-metric LOD contract —
OCTREE_RENDERER.md §2.6, `orkestrator.worldLod`): the affine is generally
ANISOTROPIC (calibrated µm voxels, e.g. 0.5×0.5×5), so voxel space preserves
neither distances nor angles. Screen questions — LOD footprints, foveation
angles, the planner's aniso-discount direction, the shader's
`desiredLevelAt`/tricubic gate — are measured in WORLD units via the
per-axis voxel world size (`voxelWorldSizeOf(affine)` = column norms).
Grid questions — frustum culling, box clamping, brick addressing, the
marching stride ("one sample per voxel crossing") — stay in voxel space.
Mixing them is the bug class this contract exists to name: dividing a
world-px focal length by a voxel distance made the refinement region a
fixed-orientation world ellipsoid instead of a view-centered sphere.

This IS the "scene-root frame normalization" this section used to track: the
per-layer centering + y-flip frame (`voxelFrame.buildCenteringMatrix` /
`buildVolumeVoxelToWorld`, both deleted) and the mesh layer's anchor-to-an-
image-layer hack (`resolveCollectionMatrix`'s old anchor search, deleted) are
gone. Meshes, annotations and images co-register through the graph alone;
until the server's transforms encode a y-down raster convention for image
data, images render un-flipped relative to the old client behavior — a
data/registration matter, not a client one.

---

## 5. Debugging a misplaced layer

1. Layer not on the canvas and its card shows "not placed": the SERVER
   returned `asAffine: null`. "no registration" = `pathToWorld: null`, the
   layer isn't registered into this scene; "could not be composed" = a path
   exists but the server refused to condense it (FIELD step, singular
   inverse) — either way a data/registration question, not a client bug.
   There is no client fallback by design (§1 R1).
2. `console.warn` next — every degradation path warns once with the edge
   type and CS ids (`[transformGraph] …`, `[collection] …`). A silent wrong
   position means the numbers composed; a warned identity means the
   `asAffine` payload could not be read. If the source axes are NOT named
   like the world's (`row,col` vs `y,x`) look for the `writes [y,x] but none
   of the output slots …` warning: the placement's output side was reduced
   with the wrong names. `affine-arity` means the server shipped an affine
   whose rows do not match its `outputAxes`. `partial (asAffine.total =
   false)` is informational: the path constrains only some world axes.
   A placement with a negative determinant (a flipped lattice) is legitimate
   data — the plane materials are double-sided so the mirrored quad is not
   back-face culled.
3. Check the numbers: `composeLayerAffine` and `placementToSpatialAffine`
   are pure — feed them the fragment from Apollo devtools and compare
   against the `asAffine.matrix` by hand (rows = `outputAxes`, columns =
   `inputAxes`, last column translation). `transformGraph.test.ts` has worked
   examples (the Visium bin lattice) to copy from.
4. Axis-order suspicion: `asAffine.inputAxes` must be the layer's source
   axis names and `outputAxes` the world's; the lens `renderAxes` and
   `spatialAxisTriple(world)` pick the x/y/z among each. A world without
   typed axes falls back to the lens names — check the `Axis` fragment
   selected `type`.
5. Crop applied twice (or not at all): the local-prefix detection keys off
   the path's start CS (`pathStartId`). Compare the first step's input (or
   output, if inverted) CS id against `lens.coordinateSystem.id` and the
   level-0 array CS id.
6. Level scale suspicion: `relativeLevelScaleFactors` must equal the shape
   ratios (`scale·shape == const` invariant). If they don't, the server wrote
   inconsistent `toParent` edges — that's a data bug, surface it, don't
   patch it client-side.
7. Half-a-coarse-voxel offsets at coarse LOD only: that's the deferred
   translation (§3.2), not a regression.

---

## 6. Server-side performance expectations

The scene query resolves a CS (+axes) per lens, per dataset, a `toParent`
per data array, plus ONE `pathToWorld` graph resolution per layer (the
per-level `levelPaths` field is deliberately unqueried — see §2). That is
fine **if** the resolvers prefetch (`select_related`/dataloaders); if
`levelPaths` is ever reselected, its path search must be memoized per
(dataset, scene) — every level shares the registration tail. If scene loads
regress, profile the backend before touching the client — the fragment shape
is already minimal (see §2's deliberate omissions).

---

## 7. Strict-backend contract (proposed enforcement)

Observed divergences from live payloads (debug scene 82, 2026-07-14) and the
rule that prevents each. The client degrades safely around all of them, but
degradation hides data bugs — enforce these server-side:

1. **Edges self-describe their axis order.** ✅ SHIPPED (2026-07-14):
   `Transformation.inputAxes/outputAxes` are non-null interface fields —
   parameter order for scale/translation/affine columns, SUBSET-only for
   ByDimension children (unnamed axes pass through untouched; the evaluator
   leaves identity rows for them). The client dropped
   `scene.coordinateSystems` from the fragment; axis resolution is
   edge-carried → world-CS index → layer dims.
2. **An ACTIVE layer always has a path to world.** Scene 82's layer ships
   `pathToWorld: null` with empty `registrations` — the layer was
   never registered. Placing a layer into a scene MUST create the
   registration edge (identity by default, editable later); if a layer can
   legitimately be unregistered, give it a distinct `status` so the client
   can badge it instead of silently drawing in the pixel frame.
3. **`ChannelSourceNode.intensityAxis` must name a CHANNEL-typed axis.**
   Live data shipped `intensityAxis: "t"` on a time-lapse — 16 timepoints
   would render as 16 stacked channel slabs (the P16 failure shape) and the
   t-slider would vanish (t counts as "rendered"). The client now guards
   (`resolveIntensityDim`, `platform/model/dims.ts`: graph mapping wins only when it
   doesn't name a spatial/time render axis), but the write path should
   reject it.
4. **Histogram bins are linear — ship the rule, not the samples.** STILL
   OPEN: `ValueHistogram.bins` remains 256 floats of uniformly spaced bin
   EDGES (fully derivable from min/max/count); in scene 82's payload it
   dwarfs everything else. Replace with `binMin/binMax/binCount` (+ keep the
   count array); the levels-editor histogram consumes `bins` today and
   adapts trivially.
5. **`worldCoordinateSystem` non-null** on Scene (the client treats a missing
   world as "nothing registers anywhere").

Shipped alongside item 1 (unconsumed for now): `Scene.epoch` — the
wall-clock origin of the world time axis (`wall_clock = epoch + t·unit`).
The natural consumer is the t-slider's label (absolute timestamps instead of
frame indices) once a TIME calibration edge maps frame → physical time; see
the dim-slider follow-ups in OCTREE_RENDERER.md §2.2.

## 8. Test map

| Concern | Tests |
| --- | --- |
| Edge evaluation, `invert4`, placement-path composition (incl. inverted steps), layer prefix detection, unregistered degradation | `@/mikro-next/lib/coords/transformGraph.test.ts` |
| Pixel-factor and legacy physical-scale level edges, identity/translation edges, fallback | `@/mikro-next/lib/coords/transformGraph.test.ts` ("level scale factors") |
| Planner/geometry under true factors | `features/bricks/octree/nodePlanning.test.ts`, `levelGeometry` coverage via existing octree tests |
| Mesh cell math, planning, decoding, cache | `features/meshes/fabriks/fabriksCore.test.ts` |

The reference scene document (confocal + FLIM + mesh collection) doubles as
the fixture source — its hand-computed numbers (the 0.325/0.5 µm calibration
scale, the 0.998/±0.021 FLIM affine, true z factors 1,2,4,9,18,36) appear
verbatim in the tests. When the schema evolves, update the tests from a NEW
hand computation, not from the code's output.

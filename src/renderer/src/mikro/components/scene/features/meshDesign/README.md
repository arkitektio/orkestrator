# The mesh designer (`features/meshDesign`)

DESIGN mode builds fabriks mesh collections interactively. You pick a tool in
the in-viewport toolbar, gesture on the data, and look at a PREVIEW before
anything joins a mesh. Meshes accumulate in a SESSION and commit together as
ONE single-level fabriks collection (`commit/commitDesign.ts`); editing a
committed collection loads its objects back and commits a new version
`derivedFrom` the old.

## How it is used

1. **Hold a tool's key** — the scene navigates exactly as in Navigate
   until a tool key is down; while it is, the left button is that tool's
   (`modeStore.designTool`). Releasing the key gives the button back to the
   camera. Clicking a toolbar button (or tapping the key) only SELECTS the
   tool, which shows its panel (`modeStore.selectedDesignTool`).
2. **Gesture** — with the key held, drag along a structure (Trace, C) or
   click one (Seed, V).
3. **Tune the preview** — the result appears as an amber CANDIDATE. Moving
   any slider, or switching the reconstructor, rebuilds it from the same
   gesture (once the slider is let go); nothing has to be redrawn.
4. **Accept** — Enter / *Add* unions it into the active mesh (one undo
   step); Esc / *Discard* drops it. Starting the next gesture — with any
   tool — accepts the pending candidate first.

The active mesh is the one selected in the sidebar's *Design staging* card
(or by clicking a mesh while no tool key is held). With nothing
selected an accepted candidate starts a new mesh.

## Reconstructors

Trace and Seed only capture a gesture. WHAT the data under it becomes is the
reconstructor picked in the tool's panel (`reconstruct/registry.ts`):

| gesture | reconstructor | what it builds |
|---|---|---|
| stroke (Trace) | **Fitted** `tube-fit` | the centerline through the stroke, a radius measured at every station from the brightness falloff (`fit/radialProfile.ts`), swept as a round tube of varying width |
| stroke (Trace) | **Surface** `tube-surface` | the intensity isosurface inside the stroke's corridor, at the Wrap threshold |
| click (Seed) | **Fitted** `ball-fit` | the sphere / oriented ellipsoid with the same centre and second moments as the bright object under the click (`fit/moments.ts`) |
| click (Seed) | **Surface** `ball-surface` | the isosurface of the structure connected to the click, grown until it closes |

FITTED reconstructors return an analytic stamp: smooth, regular, cheap, and
only as detailed as the model. SURFACE reconstructors return the data's own
surface, bumps included. The click reconstructors can take their threshold
from the click itself (*Auto*: half the clicked brightness).

Adding a reconstructor = one module with a `run(ctx)` returning a
`ReconstructResult` (a world-space surface, or a `Stamp`), one entry in
`RECONSTRUCTORS`, its id in `ReconstructorId` (`store/meshDesignStore.ts`)
and its knobs in `ui/reconstructPanels.tsx` — a `Record` over the ids, so a
missing panel fails the build. A reconstructor never touches the session:
`reconstruct/candidate.ts` turns its result into the candidate
(`buildCandidate`) and applies the verdict (`commitCandidate`).

## Editing tools

Every one ends in a single `applySculpt` (one undo step).

- **X carve** — drag over the mesh; the stroke's capsule is subtracted and
  the cut closes.
- **B sculpt** — drag ON the mesh: inflate / deflate / smooth.
- **S stamp** — click places the chosen primitive (sphere / box / ellipsoid).
- *More* menu:
  - **T trim** — drag a screen line; the plane cuts the active mesh.
  - **K split** — two clicks on the mesh; it parts at the watershed, the far
    half becoming a new object.
  - **G bridge** — two clicks; the brightest geodesic between them becomes a
    connecting tube.
  - **L lift** — click a LABEL instance (2D plane or 3D label volume) and its
    connected region floods into the design.
  - **Loft selected polygons** / **Tube from selected path** — one-shot
    actions on the annotation selection.

## What runs where

A field is up to 8 M cells, and marching, polishing and simplifying walk the
whole surface — none of that may run on the main thread.

- **Worker** (`worker/`): every tool's tail — voxelize / stamp / union /
  carve → march → polish → simplify → normals. A tool describes it as a
  `DesignJob` (plain data; stamps travel as `StampSpec`, not closures) and
  awaits `designDispatcher().run(job)`. One worker, one job at a time, in
  order: a session's edits are a chain. A queued job whose caller has moved
  on (`superseded`) is dropped before it starts.
- **GPU**: the centerline and isosurface extraction (the brush's kernels).
- **Main thread, time-sliced**: the two fits (`reconstruct/fit/`). They read
  voxels from the resident brick cache, which lives here, so they stay —
  bounded (96 stations × 48 ray steps; 200 k flood cells) and yielding to
  the event loop every few milliseconds (`fit/timeSlice.ts`).
- **Never**: a probe march per pointer move. DESIGN publishes no hover probe;
  the volume's move handler is armed only while a stroke tool's key is held,
  and only marches while a stroke is being painted.

`perf.ts` puts `design:*` User Timing measures around the stages, for a
DevTools Performance recording.

## Submodules

| dir | owns |
|-----|------|
| `worker/` | the geometry job (`designJob.ts`, pure), its Web Worker entry and the dispatcher with a same-thread twin for tests |
| `reconstruct/` | the reconstructor registry and its four modules, the pure fits (`fit/`), the world-space intensity sampler, the candidate build/commit, and the run pipeline shared by a first run and every re-run |
| `field/` | the SDF core every tool speaks: `sculptField` (grid, march, mesh → signed distance), `stamps` (analytic sphere/box/ellipsoid/oriented ellipsoid/capsule chain/tapered chain/halfspace + `applyStamp`), `loft` (serial-section contours), `split` (two-seed watershed) |
| `ops/` | geometry post-processing: `weld`, `smoothMesh` (Taubin), `simplify` (meshopt, absolute Detail error), `postProcess` (the shared polish→simplify tail), `sculpt` (legacy triangle ops) |
| `tools/` | one module per tool + `registry.ts`. The toolbar, keys and the `?` overlay derive from the registry — a tool cannot exist half-wired |
| `ui/` | the toolbar and its panels (`MeshDesignToolbar`, `ReconstructPanel`, `reconstructPanels`), the in-canvas overlay with the candidate preview and the surface/screen gesture hosts (`MeshDesignSession`), the sidebar staging card, the commit dialog |
| `commit/` | bake → upload → register (`commitDesign`), and the edit-existing loader (`loadCollection`) |
| `store/` | the session store: meshes (geometry + field), selection, the pending candidate, the reconstructor choice and its params, undo/redo snapshots |
| `brush.ts` | the one door into `features/annotations`: the brush's gesture store, extraction engines and their types |

## Gesture routing

`platform/stores/modeStore.DESIGN_TOOL_GESTURES` says who captures a tool's
gesture. `designTool` there is the ARMED tool (the selected one while its key
is held, else null), which is what the camera and the volume layers branch
on.

- `volume-stroke` / `volume-click` — captured by the brick/label layers into
  the brush store and dispatched on release by `useBrushSkeleton.extract` →
  `tools/registry` → the tool's `run`. Trace and Seed hand the gesture to
  `reconstruct/run.ts`.
- `surface` / `screen` — owned by `ui/MeshDesignSession`.

The engine-level extraction shared with ANNOTATE's skeleton brush lives in
`annotations/enhancers/paths/brushSkeleton/extraction.ts`.

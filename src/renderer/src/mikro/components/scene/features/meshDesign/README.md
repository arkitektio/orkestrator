# The mesh designer (`features/meshDesign`)

DESIGN mode builds fabriks mesh collections interactively. It navigates like
NAVIGATE — a HELD key arms exactly one tool, and every tool ends in one
`applySculpt` (one undo step). Meshes accumulate in a SESSION and commit
together as ONE single-level fabriks collection (`commit/commitDesign.ts`);
editing a committed collection loads its objects back and commits a new
version `derivedFrom` the old.

## Submodules

| dir      | owns |
|----------|------|
| `field/` | the SDF core every tool speaks: `sculptField` (grid, march), `meshSdf` half of `sculptField` (mesh → signed distance), `stamps` (analytic sphere/box/ellipsoid/capsule/halfspace + `applyStamp`), `loft` (serial-section contours), `split` (two-seed watershed) |
| `ops/`   | geometry post-processing: `weld`, `smoothMesh` (Taubin), `simplify` (meshopt, absolute Detail error), `postProcess` (the shared polish→simplify tail), `sculpt` (legacy triangle ops) |
| `tools/` | one module per verb + `registry.ts`. Keys, hints and the `?` overlay derive from the registry — a tool cannot exist half-wired |
| `ui/`    | the in-canvas overlay + surface/screen gesture hosts (`MeshDesignSession`), the toolbar, the commit dialog |
| `commit/`| bake → upload → register (`commitDesign`), and the edit-existing loader (`loadCollection`) |
| `store/` | the session store: meshes (geometry + field), selection, undo/redo snapshots, tool settings |

## Tools (held key → verb)

- **C brush** — paint along a structure; corridor tube surface unions in.
- **V blob** — click; a surface grows at the Wrap threshold until it closes.
- **W wand** — blob, but thresholded at the CLICKED voxel's own brightness.
- **X carve** — the stroke's capsule is subtracted; the cut closes.
- **S stamp** — click places the toolbar primitive (sphere/box/ellipsoid).
- **B sculpt** — drag ON the mesh: inflate / deflate / smooth falloff.
- **T trim** — drag a screen line; the plane cuts the active mesh.
- **L lift** — click a LABEL instance (2D plane; the 3D label raymarcher has
  no probe) and its connected region floods into the design.
- **G bridge** — two clicks; the brightest geodesic between them becomes a
  connecting tube.
- **K split** — two clicks on the mesh; it parts at the watershed, the far
  half becoming a new object.
- Toolbar actions: **Loft** (selected polygon annotations across slices),
  **Tube** (sweep the selected path annotation at the brush radius).

Gesture routing: `platform/stores/modeStore.DESIGN_TOOL_GESTURES` — volume
gestures are captured by the brick layers into the brush store and dispatched
by `useBrushSkeleton.extract` → `tools/registry`; surface/screen gestures are
owned by `ui/MeshDesignSession`. The engine-level extraction shared with
ANNOTATE lives in `annotations/enhancers/paths/brushSkeleton/extraction.ts`.

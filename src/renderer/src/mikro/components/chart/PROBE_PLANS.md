# Probing a chart of values: row plans

**Status:**
- The server side is built: backend e7789fd, `docs/attribute-plans-api.md`
  there.
- The client is built (2026-11-07). It has not been checked against a live
  plan yet.

## What for

A point of a value layer (a scatter) is a row. Clicking it pins it, and the chart's
**Probe** tab answers what probing a voxel answers in a scene: what is this,
and what is it connected to? It covers both cases:

- **A point is a mesh** (per-mesh features): the mesh, as a chip that opens
  it framed in its scene.
- **A point is a cluster:** its members, and their meshes.

## What the server publishes

`rowPlan(table:, maxJoinDepth:)` is the row-side twin of
`attributePlans(system:)`:

- **No sample.** `key` names the table's INDEX column, and the picked row's
  value is held under `key.axis`. `hops[0]` is the row itself, and every later
  hop binds from its parent, as in an attribute plan.
- **`HopVia.direction`** says how each hop crosses:
  - **FORWARD:** as declared.
  - **REVERSE:** a `references` read backwards. The parent row's INDEX is
    bound into the child's referencing column. It returns MANY rows, and the
    members carry their own ids.
  - **SAME_ROWS:** the same row in another table (a PCA), across the edge
    between the two frames. The lookup's `keyMap` maps the held id when that
    edge relabels it.
  - REVERSE and SAME_ROWS appear only in row plans. Scene plans are unchanged.
- **`TableKey.structure`** says what a row IS: `@mikro/meshobject` (id
  `<collection>:<id>`) for a table keyed by a mesh collection, and null for
  mask labels.
- **A table without exactly one INDEX column is refused.** The Probe tab
  shows the server's message.

## Where the client does it

- **`mikro/lib/attributes`:**
  - `RowPlanLike` and `PlanLike` (`attributeTypes.ts`); `planIdentity` is
    `row:<table>`.
  - `executeRowPlan` (`executePlan.ts`): REVERSE and SAME_ROWS bind the parent
    ROW's ids, `keyMap` maps them, `manyLimit` caps a MANY hop, and each hop
    carries the `ids` its rows are.
  - `RowPlanCache` (`planCache.ts`), and `rowPlanFor` / `executeRowPlan` on the
    attribute service.
  - The blocks are `ui/AttributeBlocks.tsx`, shared with the scene. A
    reference follow-up is injected through `FollowReferenceContext`.
- **The chart:**
  - A point reads its row's INDEX (`indexColumn`, `pointsSql`'s `__id`), and
    its hit carries `pick`.
  - A click that isn't a drag (`PlaneFrame` `onPick`) pins it
    (`chartStore.pinnedRow`), and a ring marks it.
  - `features/probe/` runs the plan and draws the tab.

## Arrays in the Probe tab (2026-11-07)

An ARRAY hop of a row plan reads lines out of a dense array, as it does in a
scene. The tab plots them instead of drawing the sparkline. Not yet checked
against a live plan.

- **One line:** the pinned row's own trace (`PlanRowsState.series`).
- **Members' lines:** an ARRAY hop whose parent returned several ids (a
  cluster's members, through REVERSE) reads one line per id
  (`PlanRowsState.lines`, binding `arrays` in `executePlan.ts`).
  - The ids are capped by `manyLimit` like the members are, and at
    `ARRAY_LINES_CAP` (the reader's LRU size), past which `truncated` says so.
  - Absent lines are dropped. The hop is an error only when every read failed.
- **The plot:** `core/data/plot/chrome/ProbeLinePlot` has ticks, a crosshair
  and the line nearest the pointer in the readout. A click picks a member's
  line. The scene keeps its sparklines; a host plots through
  `AttributePlanBlock`'s `lineView`.
- **Chart:** `features/probe/ProbeLines.tsx` lays the picked (or only) line out
  through its one-position lens (`ensureChannelLens`):
  - "In a new chart" runs `autoVisualize`.
  - "Add to this chart" creates a trace layer.

Gaps:

- **No units on the line's axis.** The plan's array dataset carries no axis
  unit or step (`valueAxisMaps` is client-only, not in `LookupStep`), so x
  reads in samples along the axis. This is a backend ask: publish the value
  axis' map into a unit-carrying space.
- **Placement.** Charting the line needs the array's value axis placed in a
  one-axis world. A derived `(cell, t)` array may have no such edge, and the
  server's refusal is shown as is.
- Members' lines need the members' rows to carry the array hop's via column
  (the server's choice of attributes).

## The mesh in the Probe tab (2026-11-07)

A row of a table keyed by a mesh collection IS a mesh (`keyedBy` →
`@mikro/meshobject`), so no hop is needed to reach it. The Probe tab draws it:

- **Which mesh:** the pinned row's own, when the row is a mesh. For a cluster,
  only the member that is picked, by its chip or by its line in a plot. Both
  are one pick (`features/probe/ProbePick.ts`, `meshToShow`), so each
  highlights the other.
- **Through the host slot.** The tab renders
  `<StructureViewer identifier="@mikro/meshobject">`. It does not import the
  scene: mikro registers a `@mikro/meshobject` viewer (`mikro/viewers/MeshObjectViewer.tsx`).
- **The viewer:**
  - It opens the collection's fabriks store off any scene (`openFabriksCollection`).
  - It extracts the one object at its finest level (`loadObjectsFromCollection`).
  - It draws it in its own small WebGPU canvas, with orbiting and a fit on load.
  - Opened collections and read objects are kept per client
    (`meshObjectGeometry.ts`).
  - Over 3M indices it says the mesh is too large instead of downloading it.

Gaps:

- **Proportions.** The mesh is drawn in the collection's own (voxel) frame, so
  an anisotropic z-step draws flattened. `voxelSize` exists only on
  `ArrayLens`. This is a backend ask: `voxelSize` on the mesh lens or
  collection.
- **Detail.** It always reads the finest level. Coarser levels exist per object
  (`entry.cells`), but the extractor does not take them.
- **GPU.** Each viewer is its own WebGPU device. The tab shows at most one.

## Not yet

- **Distributions:** a bin or a box is many rows. Probing one means
  selecting the rows inside it by predicate.
- **Label rows:** a mask's label has no structure (`structure: null`), so a
  mask-keyed row shows its attributes but no chip.
- **Switching to the tab:** a pin doesn't switch the rail to the Probe tab
  (`Sidebars` has no way to select a tab from code).

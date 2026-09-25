# The point layer

A point cloud drawn from a table dataset's coordinate columns, coloured by a table column or by
one slice of a sparse matrix.

This is the third and last way a sparse dataset gets drawn. Its object axis is identified by a
`DATASET` (a mask → the label layer), a `MESH_COLLECTION` (→ the mesh layer) or a `TABLE` — and
a table's rows have positions and nothing else, so until this module they had no renderer at
all. `PointLayerRenderer` was `() => null` in the old `stubs.tsx`, since deleted. See the server's
`docs/visualising-a-sparse-dataset.md`.

## What is on the GPU, and why it is not an instanced attribute

The scene is **WebGPU-only** — `platform/gpu/webgpuSupport.ts` gates it before `<Canvas>` mounts
and refuses rather than falling back, because three 0.184 silently swaps in a WebGL2 backend and
offers no `forceWebGPU`. So this takes the WebGPU path rather than the portable one.

Per-object position and value live in `StorageInstancedBufferAttribute`s, read in the shader as
`storage(...).element(instanceIndex)`. The quad's corner comes from `vertexIndex % 6` — six
vertices, no index buffer, no position attribute, no geometry to keep in step with the data.

Against instanced vertex attributes, storage buffers buy two things:

- **The two buffers are independent.** A colour change writes the value buffer and never touches
  positions. That is the same split that took the colormap out of the label LUT, and it is what
  makes switching genes cheap.
- **A compute stage can read and write the same buffers.** Nothing here does yet; this is the
  shape that admits it. See "what is not built".

## Positions are read columnar

`lib/attributes/columnarReads.ts`, not the row path. `readAcross` ends in
`result.toArray().map(rowToRecord)` — roughly seven allocations per row per column — and
positions are two columns through a single-column reader, so the row path would be two full
scans of the parquet. `readPointPositions` is one scan and one `Float64Array` per column.

They are read **once per table**. A colouring never re-reads them.

## The cap, and why it refuses rather than subsamples

`POINT_MAX_BYTES` is 16 MB; per point that is 8 B of `xy` plus 4 B of value, so about 1.4 M
points. Over it nothing is drawn and the reason is surfaced, the way `labelColorLut.ts` refuses.

It is deliberately not a subsample. Drawing a random subset of a point cloud misrepresents
**density**, which is usually the thing being looked at — a quieter failure than drawing
nothing, and a worse one.

There is no level of detail to fall back on. `features/meshes/fabriks/fabriksPlanner.ts` handles
budget pressure by substituting *pre-authored coarser geometry* and refuses to drop cells
because "a dropped cell is a hole in a surface". A point set has no pyramid, so aggregation
would have to be invented rather than reached for.

## Placement

A point layer has **no lens**, so `composeLayerAffine` does not apply — it walks a lens's render
axes. The server already composes `pathToWorld` into one map, so the fragment asks for
`asAffine` and the group binds it.

`placementInvariance` says whether a world-space `pointSize` is a well-defined length at all:
it is, from SIMILARITY up. Below that the number still draws and means nothing, so the layer
says so rather than implying a scale.

## Colouring

Both arms, and the renderer does not care which: a table column and a sparse slice both arrive
as `Map<objectId, value>`, which is why the sparse work needed no second painter.

The one thing that differs from the other two layer kinds is **reachability**. A point layer's
objects ARE rows of its table, so a colouring by one of its own columns needs no FIELD edge and
no attribute plan — the server seeds that table into the reachable set for the same reason
(`core/mutations/table_layer.py`, `point_reachable_tables`).

A point the colouring says nothing about takes the range's floor rather than being dropped. For
a sparse slice that IS its value — a slice is the complete truth for its feature, so an absent
point is a real zero, which is also why 0 is forced into the range.

## The two compute passes

`pointsCompute.ts`. Both exist for one reason: the CPU should touch a number of things
proportional to the ANSWER, not to the point count.

**Scatter.** A slice is a few thousand non-zero `(objectIndex, value)` pairs against however
many points the table holds. Only those pairs are uploaded, and a compute pass writes them —
JS never allocates or fills a per-point value array. Two dispatches, and the order is the
semantics: a clear pass sets every point to the range's floor, then the pairs overwrite the
ones they mention. A point a slice omits is a real zero, because a slice is the complete truth
for its feature.

The dispatch covers the buffer's CAPACITY, not the live pair count — a compute node's dispatch
size is fixed when the node is built, and a gene switch changes the count. A `uCount` guard
stops the tail reading stale pairs from a longer slice. The alternative is rebuilding the node
per gene.

**Cull.** A compute pass appends surviving indices to a list and writes the count into the
indirect draw's `instanceCount`, so the GPU decides how many points to draw. The append uses
`atomicAdd` on that same word — the count the draw reads and the count the pass produced are
the same `u32`, so they cannot disagree. Without `toAtomic()` every invocation would read the
same cursor and the survivors would overwrite each other.

The draw side pays one extra storage read per vertex: `instanceIndex` becomes a cursor into the
survivors and the point is `visible[instanceIndex]`.

The indirect buffer is `[vertexCount, instanceCount, firstVertex, firstInstance]` — WebGPU's
`drawIndirect` args, in that order, with `vertexCount` seeded to 6 because a quad always is.
It starts at zero instances, so nothing draws until the cull has run. A wrong word here fails
silently, which is why the layout is unit-tested.

Culling tests against a box in the DATA's own space, not the camera frustum: the layer's affine
sits between the data and the world, so a world-space test would need the inverse per point.
The box is currently unbounded — threading a viewport box through is the one place to change.

## What is not built

- **Aggregation.** Culling removes what is off-screen, never what is redundant on-screen, so
  zoomed out the survivors still overdraw each other. `fabriksPlanner.ts` answers that by
  substituting pre-authored coarser geometry, which a point set has none of.
- **Filter authoring.** `filterBys` ARE applied (a per-point uint mask ANDed into the cull
  pass — `pointsFilterMask.ts`), but the card cannot yet ADD one: the picker needs a
  table-rooted options query the server does not publish (`PointLayerCard.tsx`). Rules over
  other tables or through joins are skipped and logged, exactly as the mesh path skips them.

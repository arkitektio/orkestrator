# konnektion, as this reader reads it

The client half of [`konnektion`](https://github.com/jhnnsrs/konnektion): a
level-of-detail **graph** wire format — octree-partitioned node/edge networks
written to any object store. Sibling to `fabriks` (meshes): where fabriks
partitions *surfaces*, konnektion partitions *networks* — traced neurons, vessel
trees, skeletons, connectomes, tracking graphs with divisions.

The prefix is laid out exactly like a fabriks collection, so a reader who knows
one knows the other:

```
<prefix>/konnektion.json          the manifest, written LAST
<prefix>/catalog/cells.parquet
<prefix>/catalog/objects.parquet
<prefix>/level0/part-00000.parquet
<prefix>/level1/part-00000.parquet   ...
```

That shared layout is why the transport, the Parquet row-group plumbing and the
Morton addressing live in `platform/parquet/` rather than here — konnektion's own
`octree.py` says its addressing is "deliberately identical to fabriks's".

## The two things that fail SILENTLY

Both produce a plausible wrong picture with no error at any layer. They are the
reason this reader validates rather than defaults, and they are the first
assertions in `konnektionCore.test.ts`.

### 1. Ghosts are quantized against the OWNER's cell

An edge whose endpoints fall in two cells is the analogue of a mesh's clipped
triangle, and it is handled the opposite way. fabriks **splits** the triangle at
the plane. konnektion **copies** the foreign endpoint, because splitting an edge
means inventing a degree-2 node — and an invented degree-2 node in a morphology
is a measurement artefact, not a rendering detail. Node count is a published
statistic of a traced arbor; branch-point degree is data. A format that silently
added nodes at cell planes would make the octree's cell size readable off the
biology.

So the edge is kept whole and the foreign endpoint is stored as a **ghost**: a
read-only copy at the tail of the cell's node array.

```
positions = [ ...owned (node_count) , ...ghosts (ghost_count) ]
```

An edge index `>= node_count` addresses a ghost. There is no ghost bitset — the
two counts already say which is which, and a second copy of a fact is a chance
for the two to disagree.

**A ghost inverts against the box of the cell that OWNS it**, whose Morton code
is in the parallel `ghost_cells` blob. This is forced rather than chosen: a ghost
is by definition outside the storing cell, so its normalized coordinate lands
past 1.0 and the encoder refuses it against the local box. Inverting against the
owner also makes the ghost reconstruct **bit-identically** to what the owning
cell stores — which is what makes konnektion's `verify(tier="topology")` an
exact check, and what lets our test assert `toBe` rather than `toBeCloseTo`.

Decoding a ghost against the storing cell's box compiles, runs, and throws every
crossing edge to the wrong place.

### 2. The edge blob's ARITY

Edges are `uint32` **pairs** — 8 bytes an edge. A mesh has one obvious
primitive; a graph has two, and a flat `uint32` array is a segment list or a
triangle list depending only on what you reshape it to. Reshaped to three it
divides evenly whenever the edge count is a multiple of three, indexes in range,
and draws nonsense. So `encoding.edges` is a **required** manifest key, checked
against the vocabulary, never defaulted.

## The manifest

`konnektion.json` is written AFTER every file it names, so a prefix without one
is an interrupted write rather than an empty collection — a 404 is reported as
such. `files[*].bytes` is load-bearing: a Parquet footer sits at the END of a
file and the transport speaks get/get-range only, with no HEAD.

The one spelling trap: the writer camel-cases exactly **one** encoding key,
`nodeIds`. Everything else is lowercase. A parser assuming either convention
throughout rejects every real collection.

The server mirrors the manifest onto the `KonnektionStore` node, so opening a
collection costs **zero S3 round trips**. The mirrored object still goes through
the same parser — and since the GraphQL scalars are `JSON`/`Any` (i.e. `any`),
that parser is the *only* validation those values ever get.

## Levels are optional, and we draw exactly one

Depth is chosen from the data. `levels: 1` is the **expected** case for traced
data, not a degenerate one: two arbors of 942 nodes get one level, nothing
pruned, nothing straightened, and the manifest says so with `pruning: NONE` /
`simplification: NONE`.

Coarsening is two operations, declared separately because a level can run one and
not the other:

- **Strahler pruning** drops whole branches — the one that makes a dense arbor
  *legible* zoomed out. You do not want a dendrite drawn with three points
  instead of three hundred; you want the twigs gone.
- **Douglas–Peucker** straightens the runs that survive.

Nothing ever *moves* a node. Both operations remove nodes; neither repositions
one, so a coarse level is a sub-graph of the fine one rather than an
approximation of it.

**konnektion makes no boundary claim**, and its absence is a design decision
rather than an omission — a branch present at level 0 may be absent at level 1
entirely, and no amount of pinning recovers that. So `konnektionPlanner.ts`
selects **one level for the whole collection** and culls within it. A seam
between levels here is not a crack; it is a missing branch, and mixing them
would draw a dendrite stopping in mid-air.

What the format offers instead is that every level is *independently* correct:
coarsening is decided per object over the whole graph and only then partitioned
into cells, so within one level every cell agrees and a ghost is always a copy of
a node that really is there. Drawing a contiguous region at one level is cheap
here in a way it is not for meshes — a graph is far smaller than the surface it
runs through, which is also why this reader has no streaming state machine.

## Fixtures

`__fixtures__/` holds committed BYTES plus `generate.py`, which writes them
through the konnektion checkout's venv:

```
/home/jhnnsrs/Code/packages/konnektion/.venv/bin/python __fixtures__/generate.py __fixtures__
```

It also emits `expected.json` — what the **Python** reader decodes for every
cell — so the test compares two independent implementations of one format rather
than the TS reader against its own output.

- `crossing` — three collinear nodes, 16-voxel cells, so every edge spans two
  cells and every cell carries one ghost. The discriminator for §1.
- `arbor` — a 60-node branching tree with per-node `FLOAT32` radii.
- `arbor_zstd` — the same, with ZSTD-compressed blobs (whose expanded length
  comes from the row's counts; the framing carries no size of its own).

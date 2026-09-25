"""Generate the konnektion fixtures the TS reader test asserts against.

Run with the konnektion checkout's venv:
    /home/jhnnsrs/Code/packages/konnektion/.venv/bin/python genfix.py <out-dir>

Committed as bytes, not generated at test time — `konnektionCore.test.ts`
resolves __fixtures__ via import.meta.url, exactly as fabriksCore.test.ts does.
"""
import json, sys, pathlib
import numpy as np
import konnektion

out = pathlib.Path(sys.argv[1])

def write(name, objects, *, cell_size, radii=None, compression="NONE",
          coarsening=None, levels=None, row_group_bytes=None):
    collection = konnektion.build_collection(
        objects, cell_size=cell_size, axes=("x", "y", "z"),
        radii=radii, compression=compression, coarsening=coarsening, levels=levels,
    )
    store = konnektion.DirectoryStore(str(out / name))
    if row_group_bytes is None:
        collection.write(store, "")
    else:
        konnektion.write_collection(collection, store, "", row_group_bytes=row_group_bytes)
    report = konnektion.verify(konnektion.open_collection(store, ""), tier="topology")
    print(f"{name}: ok={report.ok}")
    if not report.ok:
        print(report)
        raise SystemExit(1)
    return collection

# --- 1. the CROSSING fixture: one edge spanning two cells => a ghost --------
# cell_size 16 on x, so nodes at x=8 and x=24 land in cells (0,0,0) and (1,0,0).
nodes = np.array([[8.0, 8.0, 8.0], [24.0, 8.0, 8.0], [40.0, 8.0, 8.0]])
edges = np.array([[0, 1], [1, 2]])
write("crossing", {1: (nodes, edges)}, cell_size=(16, 16, 16))

# --- 2. a small branching arbor, with per-node radii ------------------------
rng = np.random.default_rng(7)
pts = [[32.0, 32.0, 32.0]]
segs = []
for i in range(1, 60):
    parent = max(0, i // 2 - 1)
    p = np.array(pts[parent]) + rng.normal(0, 6, 3)
    pts.append(list(np.clip(p, 1, 120)))
    segs.append([parent, i])
arbor = np.array(pts)
radii = np.linspace(2.0, 0.4, len(pts))
write("arbor", {7: konnektion.Network(arbor, np.array(segs), radii)},
      cell_size=(32, 32, 32), radii="FLOAT32")

# --- 3. the same arbor, ZSTD-compressed blobs -------------------------------
write("arbor_zstd", {7: (arbor, np.array(segs))},
      cell_size=(32, 32, 32), compression="ZSTD")

# --- 4. TWO objects sharing cells: exercises the per-object offset fenceposts.
# `object_node_offsets` are START offsets with length n, NOT n+1 — a reader
# treating them as fenceposts reads one object too few and silently drops the
# last arbor in every shared cell. With one object per fixture that branch never
# runs, so this fixture is the only thing that covers it.
def blob(seed, origin):
    rng = np.random.default_rng(seed)
    pts = [list(origin)]
    segs = []
    for i in range(1, 40):
        parent = max(0, i // 2 - 1)
        p = np.array(pts[parent]) + rng.normal(0, 4, 3)
        pts.append(list(np.clip(p, 1, 60)))
        segs.append([parent, i])
    return np.array(pts), np.array(segs)

a_nodes, a_edges = blob(11, (20.0, 20.0, 20.0))
b_nodes, b_edges = blob(12, (30.0, 30.0, 30.0))
write("two_objects", {3: (a_nodes, a_edges), 9: (b_nodes, b_edges)},
      cell_size=(64, 64, 64))

# --- 5. quantized radii: the branch with the non-obvious rule --------------
# UINT16_QUANTIZED_PER_CELL divides by QUANT_MAX and scales by the cell's
# LARGEST extent, not per axis — a radius is one scalar and has no axis to be
# quantized along.
write("arbor_qradii", {7: konnektion.Network(arbor, np.array(segs), radii)},
      cell_size=(32, 32, 32), radii="UINT16_QUANTIZED_PER_CELL")

# --- 6. MULTIPLE ROW GROUPS in one part ------------------------------------
# Every other fixture has rowGroups: 1, so `rowGroup` is always 0 and a
# cumulative-row-offset bug in ParquetPart.readRowGroup would be invisible: the
# `wanted` filter would simply drop the mis-addressed rows, drawing a partial
# network with no error. A tiny row-group budget over the arbor's own cells
# forces several groups, so the locator has to actually resolve.
write("many_groups", {7: (arbor, np.array(segs))},
      cell_size=(8, 8, 8), row_group_bytes=512)

# --- expected.json: what the PYTHON decoder says, per cell ------------------
# The TS reader is asserted against these, so the test compares two independent
# implementations of the byte contract rather than the TS one against itself.
expected = {}
for name in ("crossing", "arbor", "arbor_zstd", "two_objects", "arbor_qradii", "many_groups"):
    store = konnektion.DirectoryStore(str(out / name))
    opened = konnektion.open_collection(store, "")
    cells = {}
    for (level, cell), entry in sorted(opened.cells.items()):
        decoded = opened.read_cell(level, cell)
        cells[f"{level}:{cell}"] = {
            "nodeCount": int(decoded.node_count),
            "ghostCount": int(decoded.ghost_count),
            "positions": [round(float(v), 9) for v in decoded.positions.reshape(-1)],
            "edges": [int(v) for v in decoded.edges.reshape(-1)],
            "radii": None if decoded.radii is None
                     else [round(float(v), 9) for v in decoded.radii.reshape(-1)],
            # Per-object identity, so the fencepost expansion is checked
            # against Python rather than against our own loop.
            "objectIds": [int(v) for v in decoded.object_ids],
            "objectNodeOffsets": [int(v) for v in decoded.object_node_offsets],
            "objectGhostOffsets": [int(v) for v in decoded.object_ghost_offsets],
        }
    expected[name] = {
        "manifest": json.loads((out / name / "konnektion.json").read_bytes()),
        "cells": cells,
    }
(out / "expected.json").write_text(json.dumps(expected, indent=1))
print("expected.json written")

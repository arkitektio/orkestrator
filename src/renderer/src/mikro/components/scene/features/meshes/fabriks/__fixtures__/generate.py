"""Deterministic small fabriks collections for the TS reader's tests.

Three variants so every decode branch has a real-writer oracle:
  raw    : codec NONE,    compression NONE   (the default path)
  zstd   : codec NONE,    compression ZSTD   (per-blob, length from row counts)
  meshopt: codec MESHOPT, compression NONE   (stride-8 padded, drop 4th)

`row_group_bytes` is deliberately tiny so parts carry SEVERAL row groups --
otherwise the (part, row_group) locator is untested.
"""
import json, shutil, sys, pathlib
import numpy as np, trimesh, fabriks

ROOT = pathlib.Path(sys.argv[1])
if ROOT.exists():
    shutil.rmtree(ROOT)

def demo_objects():
    objects = {}
    for n, oid in enumerate([7, 3, 11, 42, 108, 4711]):
        centre = np.array([40 + 55 * n, 40 + 17 * (n % 3), 30 + 11 * (n % 4)], dtype=float)
        m = trimesh.creation.icosphere(subdivisions=2, radius=14.0 + 3 * (n % 3))
        objects[oid] = m.apply_translation(centre)
    return objects

VARIANTS = {
    "raw":     dict(codec="NONE",    compression="NONE"),
    "zstd":    dict(codec="NONE",    compression="ZSTD"),
    "meshopt": dict(codec="MESHOPT", compression="NONE"),
}

summary = {}
for name, kwargs in VARIANTS.items():
    out = ROOT / name
    manifest = fabriks.write_meshes(
        demo_objects(), fabriks.DirectoryStore(str(out)), prefix="",
        cell_size=(64, 64, 32), levels=3,
        row_group_bytes=8192,      # force multiple row groups per part
        **kwargs,
    )
    summary[name] = manifest.to_dict()
    lv = manifest.to_dict()["files"]["levels"]
    groups = {k: [e["rowGroups"] for e in v] for k, v in lv.items()}
    print(f"{name:8s} encoding={kwargs} rowGroups/level={groups}")

(ROOT / "manifests.json").write_text(json.dumps(summary, indent=2))

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ClippingGroup } from "three/webgpu";

import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { bindField } from "@/core/data/scene/stores/bindStore";
import { useMikro } from "@/mikro/api/funcs";
import { getMikroKulisseUrl } from "@/mikro/datalayer/mikroAccess";

import { collectionSlabThickness, useCollectionPlacement } from "../../platform/collections/useCollectionPlacement";
import { CROP_PLANE_FAR, createCropPlanes, updateCropPlanes } from "../../platform/coords/cropBox";
import { createSlabPlanes, updateSlabPlanes } from "../../platform/coords/slabClip";
import { sceneZExtent } from "../../platform/coords/worldTransform";
import type { FixtureLayerFragment } from "../../platform/model/layerGuards";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import {
  adoptMeshes,
  applyAppearance,
  createOverrideMaterial,
  lensClipPlanes,
  type FixtureMeshRecord,
} from "./fixtureScene";
import { acquireGltf, releaseGltf } from "@/mikro/lib/fixtures/gltfCache";
import { setFixtureLoadFailure } from "./loadFailures";

/**
 * FixtureLayer renderer: one binary glTF — a coverslip, a dish, a holder —
 * placed by the layer's `asAffine` like a mesh collection (`collectionPlacement.ts`).
 *
 * The model's coordinate system names its vertex slots (its axes, in order),
 * and those axes carry the exporter's unit, so the server's matrix already
 * turns millimetres into the world's micrometres; nothing here scales.
 *
 * One component for both modes, as the collection layers are: in 2D it clips
 * itself to a slab around `currentZ` and draws as an overlay. The scene's crop
 * box and the lens' own clip box clip it in both.
 */
export const FixtureLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || layer.__typename !== "FixtureLayer" || !layer.fixture) return null;
  return <FixtureGroup layer={layer} model={layer.fixture} />;
};

type FixtureRef = NonNullable<FixtureLayerFragment["fixture"]>;

const FixtureGroup = ({ layer, model }: { layer: FixtureLayerFragment; model: FixtureRef }) => {
  const rawInvalidate = useThree((state) => state.invalidate);
  const transformContext = useSceneStore((s) => s.transformContext);
  const viewerApi = useViewerStoreApi();
  const datalayer = useDatalayerEndpoint();
  const client = useMikro();

  // An opaque part is a volume OCCLUDER, and the compositor caches its depth:
  // every change that moves pixels bumps the volume inputs, or the volume keeps
  // the stale occlusion until the camera moves (the mesh layer's contract).
  const invalidate = useCallback(() => {
    viewerApi.getState().volumeInputs.bump("fixture");
    rawInvalidate();
  }, [viewerApi, rawInvalidate]);

  // The vertex slots are the model's axes, in order: what `createFixture`
  // declared, and what placement reads the matrix's columns as.
  const slots = useMemo(() => model.coordinateSystem.axes.map((axis) => axis.name), [model.coordinateSystem]);
  const placeable = useMemo(
    () => ({ id: model.id, coordinateSystem: model.coordinateSystem, store: { id: model.store.id, axes: slots } }),
    [model.id, model.coordinateSystem, model.store.id, slots],
  );
  const { matrix } = useCollectionPlacement(layer, placeable, transformContext);

  // The clip planes, allocated once and handed to the group once: a z-scrub,
  // a crop drag and a placement change mutate their constants only.
  const group = useMemo(() => new ClippingGroup(), []);
  const planes = useMemo(
    () => ({ slab: createSlabPlanes(), crop: createCropPlanes(), lens: createCropPlanes() }),
    [],
  );
  useEffect(() => {
    group.clippingPlanes = [...planes.slab, ...planes.crop, ...planes.lens];
  }, [group, planes]);

  // The file, shared across layers and remounts; the scene clone and its
  // per-layer materials are this layer's.
  const storeKey = model.store.id;
  const [records, setRecords] = useState<FixtureMeshRecord[] | null>(null);
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const override = useMemo(() => createOverrideMaterial(), []);
  useEffect(() => {
    if (!datalayer) return;
    let cancelled = false;
    let adopted: FixtureMeshRecord[] = [];
    acquireGltf(storeKey, () => getMikroKulisseUrl(model.store, client, datalayer))
      .then((gltf) => {
        if (cancelled) return;
        const scene = gltf.scene.clone(true);
        adopted = adoptMeshes(scene);
        setFixtureLoadFailure(layer.id, null);
        setRoot(scene);
        setRecords(adopted);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(`[fixture] cannot load model ${model.id}:`, error);
        setFixtureLoadFailure(layer.id, error);
      });
    return () => {
      cancelled = true;
      for (const record of adopted) for (const material of record.authored) material.dispose();
      setRoot(null);
      setRecords(null);
      releaseGltf(storeKey);
    };
    // `model.store` is read for its key and id only, both in `storeKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey, client, datalayer, layer.id, model.id]);
  useEffect(() => () => override.dispose(), [override]);
  useEffect(() => () => setFixtureLoadFailure(layer.id, null), [layer.id]);

  // Placement and the lens clip box, which is stated in the model's own space
  // and so moves with it.
  useEffect(() => {
    if (!root) return;
    root.matrixAutoUpdate = false;
    root.matrix.copy(matrix);
    root.matrixWorldNeedsUpdate = true;
    lensClipPlanes(layer.clip ?? [], slots, matrix, planes.lens);
    invalidate();
  }, [root, matrix, layer.clip, slots, planes, invalidate]);

  // Appearance, recomputed from the file's own materials on every change.
  const displayMode = useModeStore((s) => s.displayMode);
  const slab = displayMode !== "3D";
  const opacity = layer.opacity ?? 1;
  useEffect(() => {
    if (!records) return;
    applyAppearance(records, override, { opacity, materialColor: layer.materialColor, wireframe: layer.wireframe, slab });
    invalidate();
  }, [records, override, opacity, layer.materialColor, layer.wireframe, slab, invalidate]);

  const visible = layer.visible !== false;
  useEffect(() => {
    group.visible = visible;
    invalidate();
  }, [group, visible, invalidate]);

  // The 2D slab, one z-step thick (the finest image's, else one model unit in
  // world), bound to `currentZ` without re-rendering this component.
  const slabStep = useSceneStore((s) => sceneZExtent(s.layers)?.step);
  const slabThickness = useMemo(() => collectionSlabThickness(slabStep, matrix, 1), [slabStep, matrix]);
  useEffect(() => {
    if (!slab) {
      // An idle slab clips nothing; the crop box below still applies.
      planes.slab[0].constant = CROP_PLANE_FAR;
      planes.slab[1].constant = CROP_PLANE_FAR;
    }
    const unsubscribeSlab = slab
      ? bindField(viewerApi, (state) => state.currentZ, (z) => {
          updateSlabPlanes(planes.slab, { z, thickness: slabThickness });
          invalidate();
        })
      : () => {};
    const unsubscribeCrop = bindField(viewerApi, (state) => state.cropBox, (box) => {
      updateCropPlanes(planes.crop, box);
      invalidate();
    });
    return () => {
      unsubscribeSlab();
      unsubscribeCrop();
    };
  }, [slab, slabThickness, viewerApi, planes, invalidate]);

  return (
    <primitive object={group}>
      {root && <primitive object={root} />}
    </primitive>
  );
};

/**
 * A vector-valued lens — an optical flow, a deformation field, an orientation map —
 * drawn as instanced glyphs sampled from the grid.
 *
 * One component for both view modes, the mesh/network shape. The data path is a
 * single strided CPU read (`vectorsSource.ts`) rather than the brick engine — see the
 * `NonBrickLensTypename` carve-out in `layerGuards.ts` for why — and everything after
 * the read is uniforms: a glyph switch, a scale change or a recolour never touches a
 * buffer.
 *
 * ## The scale is stated in SCENE units and honoured in DATA units
 *
 * `glyphScale` is scene-units-per-magnitude-unit (the server's `pointSize` rule, so
 * it is well defined from SIMILARITY up, badged below). The glyphs are placed in the
 * lens' voxel frame under the layer's affine, so the stated scale is divided by the
 * affine's uniform factor once, here — the material never knows the world exists.
 * Null auto-normalizes: the longest sampled vector draws just short of one sampling
 * stride, so neighbouring glyphs cannot overlap into unreadability.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { useDatalayerEndpoint, useMikro } from "@/core/app/Arkitekt";
import { collapsibleLensDims } from "../../platform/model/dimExtents";
import { createSettler } from "@/core/lib/scene/perf/settle";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { composeLayerAffine } from "@/core/lib/scene/coords/transformGraph";
import { affineToMatrix4 } from "../../platform/coords/worldTransform";
import { paletteRowFor, DEFAULT_MEASURE_COLORMAP } from "../../platform/attributes/valueLut";
import { isVectorLayer, type VectorLayerFragment } from "../../platform/model/layerGuards";
import { createVectorMaterial, type VectorGlyphKind, type VectorMaterialBundle } from "./vectorsMaterial";
import { loadVectorField, type VectorField } from "./vectorsSource";
import { bindFields } from "@/core/lib/scene/stores/bindStore";

export const VectorLayerRenderer = ({ layerId }: { layerId: string }) => {
  const layer = useSceneStore((s) => s.sceneLayers.find((candidate) => candidate.id === layerId));
  if (!layer || !isVectorLayer(layer)) return null;
  return <VectorField layer={layer} />;
};

/**
 * How long a dim scrubber must rest before the field is re-read.
 *
 * Equal to `MIN_REPLAN_INTERVAL_MS` in the brick residency's plan tracker: the
 * same slider drives both, and matching the cadence is what makes a flow field
 * and the image beneath it land on the new frame together.
 */
const VECTOR_REREAD_SETTLE_MS = 200;

/** The GraphQL enum's members, lowered to the material's vocabulary. */
const glyphKindOf = (glyph: string | null | undefined): VectorGlyphKind =>
  glyph === "LINE" ? "line" : glyph === "CONE" ? "cone" : "arrow";

const VectorField = ({ layer }: { layer: VectorLayerFragment }) => {
  const invalidate = useThree((state) => state.invalidate);
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();
  const transformContext = useSceneStore((s) => s.transformContext);

  const [field, setField] = useState<VectorField | null>(null);
  const bundleRef = useRef<VectorMaterialBundle | null>(null);
  const [bundle, setBundle] = useState<VectorMaterialBundle | null>(null);

  const affine = useMemo(
    () => affineToMatrix4(composeLayerAffine(transformContext, layer as never)),
    [transformContext, layer],
  );

  /**
   * The affine's uniform scale factor: what one voxel is worth in scene units.
   * Read off the x basis column; under SIMILARITY (the only invariance a stated
   * `glyphScale` is defined at) every column agrees, and below it the number
   * still draws while `placementInvariance` says it means nothing.
   */
  const voxelInSceneUnits = useMemo(() => {
    const basis = new THREE.Vector3().setFromMatrixColumn(affine, 0).length();
    return basis > 0 ? basis : 1;
  }, [affine]);

  /**
   * The dims a scrubber can move for THIS layer — its collapsed axes, the same
   * set `DimSliderPanel` offers sliders for. The subscription below re-reads
   * only when one of these changes: a `tau` scrub in a scene that also holds a
   * FLIM stack must not refetch a flow field that has no tau, exactly as
   * `buildSliceSignature` keeps a foreign dim out of a brick layer's identity.
   */
  const scrubbableDims = useMemo(
    () =>
      collapsibleLensDims(layer.lens, [
        layer.lens.renderAxes.x,
        layer.lens.renderAxes.y,
        layer.lens.renderAxes.z,
        layer.lens.renderAxes.intensity,
        layer.lens.renderAxes.phasor,
        layer.vectorAxis,
      ]),
    [layer.lens, layer.vectorAxis],
  );

  // ------------------------------------------------------------------ the read
  /**
   * Re-runs when what is READ changes: the lens, the stride, or a scrubber on one
   * of this layer's own collapsed dims.
   *
   * `dimSelections` is read IMPERATIVELY, never through a selector. P17
   * (`ARCHITECTURE.md`): `AnimationPlayer` writes `setDimSelection` from inside
   * `useFrame` while a camera tour plays, so a React subscription here would
   * re-render this layer at frame rate. A vanilla subscription with an identity
   * latch — which is what `setDimSelection`'s no-op guard and fresh-object-on-
   * change exist to support — touches React not at all.
   *
   * The re-read is SETTLED rather than immediate: a slider drag would otherwise
   * fire a ranged zarr read per pointer event. 200 ms matches
   * `MIN_REPLAN_INTERVAL_MS`, the cadence at which the same scrub replans the
   * brick layers, so a flow field and the image under it arrive together instead
   * of popping in staggered.
   */
  const viewerApi = useViewerStoreApi();
  useEffect(() => {
    if (!datalayer) return;
    let cancelled = false;

    const read = (dimSelections: Readonly<Record<string, number>>) => {
      void loadVectorField(client, datalayer, layer, dimSelections)
        .then((result) => {
          if (cancelled) return;
          if ("error" in result) {
            console.warn("[vectors] not drawn:", result.error);
            return;
          }
          setField(result);
        })
        .catch((error: unknown) => {
          if (!cancelled) console.warn("[vectors] could not read the field:", error);
        });
    };

    const settler = createSettler<Readonly<Record<string, number>>>({
      delayMs: VECTOR_REREAD_SETTLE_MS,
      emit: read,
    });

    // Only OUR dims: a scrub of a dim this layer does not carry changes nothing
    // about what it reads. `bindFields` applies once at bind time, which is the
    // immediate first read — a settle there would leave the viewport empty for
    // the window on every mount.
    let first = true;
    const unsubscribe = bindFields(
      viewerApi,
      scrubbableDims.map((dim) => (state: { dimSelections: Readonly<Record<string, number>> }) =>
        state.dimSelections[dim],
      ),
      (state) => {
        if (first) {
          first = false;
          read(state.dimSelections);
          return;
        }
        settler.push(state.dimSelections);
      },
    );

    return () => {
      cancelled = true;
      settler.cancel();
      unsubscribe();
    };
    // The layer object identity churns with scene re-emissions; the read only
    // depends on the lens, the stride and this layer's own scrubbable dims.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, datalayer, layer.lens.id, layer.glyphStride, scrubbableDims, viewerApi]);

  // ------------------------------------------------------------------ the meshes
  useEffect(() => {
    if (!field) return;
    const made = createVectorMaterial(field.count);
    (made.positions.array as Float32Array).set(field.positions);
    (made.vectors.array as Float32Array).set(field.vectors);
    made.markUploaded();
    made.setCount(field.count);
    bundleRef.current = made;
    setBundle(made);
    return () => {
      made.dispose();
      bundleRef.current = null;
      setBundle(null);
    };
  }, [field]);

  // ------------------------------------------------------------------ appearance
  // Uniform writes and a 1 KB palette row; never a buffer.
  useEffect(() => {
    const current = bundleRef.current;
    if (!current || !field) return;

    current.setGlyph(glyphKindOf(layer.glyph as unknown as string));

    // Stated scale is scene units per magnitude unit; the material works in voxels.
    const stated = layer.glyphScale;
    current.nodes.uGlyphScale.value =
      stated != null && stated > 0
        ? stated / voxelInSceneUnits
        : (field.stride * 0.85) / Math.max(field.maxMagnitude, 1e-9);

    // A flat RGBA wins over the colormap where both are set — the server's
    // colour-wins rule for the intensity tint, applied to glyphs.
    const flat = layer.color as unknown as number[] | null | undefined;
    if (flat && flat.length >= 3) {
      current.nodes.uFlatColor.value = new THREE.Color(flat[0] / 255, flat[1] / 255, flat[2] / 255);
      current.nodes.uColorize.value = 0;
    } else {
      const colormap = ((layer.vectorColormap as unknown as string) ??
        DEFAULT_MEASURE_COLORMAP) as never;
      current.setPalette(paletteRowFor(colormap));
      current.nodes.uColorize.value = 1;
    }

    // The magnitude window: the layer's, or the sampled maximum — a live default
    // rather than an infinite one, because an unbounded window maps everything to
    // the palette's floor.
    current.nodes.uClimMin.value = layer.climMin ?? 0;
    current.nodes.uClimMax.value = layer.climMax ?? Math.max(field.maxMagnitude, 1e-9);
    current.nodes.uOpacity.value = layer.opacity ?? 1;
    invalidate();
  }, [bundle, field, layer.glyph, layer.glyphScale, layer.vectorColormap, layer.color, layer.climMin, layer.climMax, layer.opacity, voxelInSceneUnits, invalidate]);

  // A world-space glyph scale is a well-defined length only from SIMILARITY up.
  useEffect(() => {
    const invariance = layer.placementInvariance;
    if (layer.glyphScale != null && invariance && invariance !== "ISOMETRY" && invariance !== "SIMILARITY") {
      console.warn(
        `[vectors] this layer's placement is ${invariance}, so 'glyphScale' in scene units is not a well-defined length here`,
      );
    }
  }, [layer.placementInvariance, layer.glyphScale]);

  if (layer.visible === false || !bundle) return null;

  return (
    <group matrix={affine} matrixAutoUpdate={false}>
      {bundle.meshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
};

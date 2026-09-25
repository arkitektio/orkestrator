/* eslint-disable react-hooks/immutability --
 * Driving TSL UNIFORM NODES is this module's whole job, and a uniform node is a
 * deliberately mutable handle into an already-compiled shader graph — writing
 * `.value` is how a frame's data reaches the GPU without rebuilding the
 * material. The rule reads that as mutating a hook argument; treating these as
 * React state instead would mean recompiling the shader on every camera move,
 * which is exactly what the uniform-push contract exists to avoid. */
import { useThree } from "@react-three/fiber";
import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import { useMikro } from "@/mikro/api/funcs";
import { useCallback, useEffect, useRef } from "react";

import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { level0StoreIdOf, systemIdOf } from "../../platform/model/layerLevel0";
import type { LayerState } from "../../platform/model/layerModel";
import { setLabelColorLut, setLabelColorStyle, type LabelLutNodes } from "./labelNodeMaterials";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";
import { buildLabelColorLut } from "./labelColorLut";
import {
  DEFAULT_MEASURE_COLORMAP,
  paletteRowFor,
  type ValueLutArena,
} from "../../platform/attributes/valueLut";
import { qualitativePalette } from "../../platform/layerui/colormap-utils";
import { loadSparseSource, makeSparseReader } from "@/mikro/lib/sparse/sparseSource";
import { useActivePickers } from "../../platform/attributes/useActivePickers";
import { usePickerResolution } from "../../platform/attributes/pickerResolution";

/**
 * Resolve a label layer's ACTIVE colouring and filter rules into the material's
 * colour LUT, and keep it in step as the picker changes.
 *
 * Shared by the 2D plane and the 3D raymarcher because the answer is the same
 * one: both bind the same table and index it the same way, and
 * `setLabelColorLut` already takes the structural `LabelLutNodes` subset both
 * materials expose. The 2D/3D difference is in how a texel is USED (a fill or a
 * first-hit surface), never in how it is built.
 *
 * The lifecycle is the reason this is worth a hook rather than two copies: it is
 * an async build with a cancellation protocol, and getting the cancelled branch
 * wrong leaks a GPU texture per keystroke in the picker.
 */
export const useLabelColorLut = (
  nodes: LabelLutNodes | undefined,
  layer: LayerState | undefined,
): void => {
  const attributeService = useAttributeServiceOrNull();
  const invalidate = useThree((state) => state.invalidate);
  const viewerStoreApi = useViewerStoreApi();
  const client = useMikro();
  const datalayer = useDatalayerEndpoint();

  const render = layer?.labelRender;
  /**
   * Both arms render. A SPARSE entry names a matrix and a position rather than
   * a table and a column, and is answered from the store directly — there is
   * no SQL and no database in that path.
   *
   * The keys come from `entryKeys.ts` rather than being spelled here, and that
   * is a FIX, not just deduplication. This used to build them by hand with the
   * colormap in the STYLE key and absent from the DATA key — but
   * `buildValueLut` branches on the colormap's class, writing RANKS for a
   * qualitative one where a measure colouring gets normalised values. Switching
   * viridis -> hues therefore recomposed the palette without rebuilding the
   * table, leaving rank colours sampled with value-derived codes. `entryKeys`
   * puts the qualitative CLASS (not the colormap itself) in the data key for
   * exactly this reason, and says so.
   */
  const {
    colorBy: activeColorBy,
    rules: activeRules,
    sparseDatasetId,
    dataKey,
    appearanceKey: styleKey,
  } = useActivePickers(render);

  const systemId = layer ? systemIdOf(layer) : null;
  const storeId = layer ? level0StoreIdOf(layer) : null;

  /**
   * The table the last build painted into, offered to the next one.
   *
   * A gene switch, a filter edit and a colormap-independent colorBy change all
   * produce a table of the SAME slot count, so this is the difference between
   * refilling a buffer and allocating a fresh multi-megabyte one — plus a GPU
   * texture destroyed and recreated — on every one of them.
   *
   * A ref rather than state: nothing renders off it, and making it state would
   * re-run the effect that sets it.
   */
  const arenaRef = useRef<ValueLutArena | null>(null);

  /**
   * The DATA half, through the shared resolution lifecycle
   * (`platform/attributes/pickerResolution.ts`). The choreography it owns —
   * run on key change, let only the still-wanted build reach the GPU, hand the
   * loser to `dispose` — used to be spelled out here and, near-identically,
   * in three other layers. What stays here is the part that is actually about
   * masks: which reads the build needs, and what binding one means.
   */
  const off = useCallback(() => {
    if (!nodes) return;
    setLabelColorLut(
      nodes,
      { texture: null, width: 0, height: 0, idOffset: 0, valueMin: 0, valueMax: 1 },
      { colorize: false, filter: false },
    );
    // `setLabelColorLut` disposes what it unbinds, so the arena's texture is
    // gone with it. Holding the reference would offer a destroyed
    // `GPUTexture` to the next build.
    arenaRef.current = null;
    viewerStoreApi.getState().volumeInputs.bump("label-lut");
  }, [nodes, viewerStoreApi]);

  const ready =
    nodes && attributeService && systemId && storeId &&
    (activeColorBy !== null || activeRules.length > 0);

  usePickerResolution<Awaited<ReturnType<typeof buildLabelColorLut>>>(
    ready ? `${dataKey}|${sparseDatasetId ?? ""}` : null,
    {
      build: async ({ stillWanted }) => {
        const plans = await attributeService!.plansFor(systemId!);
        // Fetched here rather than in the builder so the builder stays free of
        // Apollo — the same reason `readColumn` is injected on the column side.
        const sparse =
          sparseDatasetId && datalayer
            ? await loadSparseSource(client, datalayer, sparseDatasetId)
            : null;
        return buildLabelColorLut({
          colorBy: activeColorBy,
          sparse,
          readSparse: makeSparseReader(client, datalayer),
          filterBys: activeRules,
          plans,
          storeId: storeId!,
          engine: attributeService!.engine,
          reuse: arenaRef.current,
          // Checked inside, after the reads and before the first write:
          // the arena is REUSED, so a superseded build that painted would
          // overwrite the answer the user is actually looking at.
          stillWanted,
        });
      },
      apply: (lut) => {
        // The builder can also bow out on its own (`superseded`), in which
        // case it owns a texture nobody will bind.
        if (lut.superseded) {
          if (lut.texture && lut.texture !== arenaRef.current?.texture) lut.texture.dispose();
          return;
        }
        if (lut.skipped.length > 0) {
          console.warn("[label] picker entries that do not render yet:", lut.skipped);
        }
        // Adopted before the bind: `setLabelColorLut` disposes what it
        // replaces, and what it replaces is the arena we are letting go of.
        arenaRef.current = lut.arena ?? null;
        setLabelColorLut(nodes!, lut, {
          colorize: activeColorBy !== null,
          filter: activeRules.length > 0,
        });
        viewerStoreApi.getState().volumeInputs.bump("label-lut");
        invalidate();
      },
      // The one it must NOT free is the reused arena's: that texture is still
      // bound to the live material.
      dispose: (lut) => {
        if (lut.texture && lut.texture !== arenaRef.current?.texture) lut.texture.dispose();
      },
      reset: off,
      onError: (error) => console.warn("[label] could not build the colour lookup:", error),
    },
  );

  // The appearance half. Synchronous, no await, no allocation: two uniform
  // writes and a 1 KB palette row, both of which the table is indifferent to.
  useEffect(() => {
    if (!nodes || !activeColorBy) return;
    const palette = paletteRowFor(activeColorBy.colormap ?? DEFAULT_MEASURE_COLORMAP);
    // A qualitative colouring writes its ranks normalised onto 0..1 already, so
    // its window is the unit interval and a clim would only smear the classes
    // into each other. The UI never offers one; this makes that structural.
    const qualitative = qualitativePalette(activeColorBy.colormap) !== null;
    setLabelColorStyle(nodes, {
      palette,
      climMin: qualitative ? 0 : (activeColorBy.min ?? Number.NEGATIVE_INFINITY),
      climMax: qualitative ? 1 : (activeColorBy.max ?? Number.POSITIVE_INFINITY),
    });
    invalidate();
    // `activeColorBy` is read inside; `styleKey` decides whether this re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, styleKey, invalidate]);
};

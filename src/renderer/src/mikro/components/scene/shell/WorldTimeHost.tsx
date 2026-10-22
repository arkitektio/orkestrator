import { useEffect, useMemo, useRef } from "react";
import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import type { MikroClient } from "@/core/data/zarr/store/types";
import {
  affineInstants,
  lookupFor,
  lookupInstants,
  type AxisInstants,
  type PlacementWithFields,
} from "@/core/data/scene/coords/axisTime";
import { useMikro } from "@/mikro/api/funcs";
import { createWindowReader, type WindowStore } from "@/mikro/lib/zarr/windowReader";
import type { DimSliceFragment } from "@/mikro/api/graphql";
import { collapsibleLensDims } from "../platform/model/dimExtents";
import { buildSliceMap, resolveSpatialSelection } from "../platform/coords/selection";
import { isVectorLayer } from "../platform/model/layerGuards";
import { useSceneStore, useSceneStoreApi } from "../platform/stores/sceneStore";
import { useViewerStoreApi } from "../platform/stores/viewerStore";

/**
 * Publishes, per layer, where its frames sit along the world axes it does not
 * render (`viewerStore.layerAxisInstants`), so `DimSliderPanel` can offer one
 * world-unit slider and `selectionsFor` can turn its value into each layer's frame.
 *
 * Headless, beside `BrickSystemHost`. A regularly sampled dim is read straight off
 * the layer's `asAffine` row; a dim given by a lookup needs its array of instants,
 * fetched ONCE per dataset through the window reader and kept for the scene's life
 * (a times array is a few kilobytes, and it never changes).
 *
 * Read with `fidelity: "exact"`: instants are float64 seconds, and the default
 * float32 promotion would merge frames 100 µs apart an hour into a recording.
 */
type TimedLayer = {
  id: string;
  visible?: boolean | null;
  asAffine?: PlacementWithFields & {
    fields?: readonly (NonNullable<PlacementWithFields["fields"]>[number] & {
      dataset?: { id: string; dataArrays: readonly { level: number; store: { id: string; key: string } }[] } | null;
    })[] | null;
  } | null;
  lens: { id: string; axisNames: readonly string[]; shape: readonly number[]; slices: readonly DimSliceFragment[] };
  rendered: (string | null | undefined)[];
};

export function WorldTimeHost() {
  const client = useMikro() as MikroClient | undefined;
  const datalayer = useDatalayerEndpoint();
  const live = useRef({ client, datalayer });
  live.current = { client, datalayer };

  const sceneStoreApi = useSceneStoreApi();
  const viewerApi = useViewerStoreApi();

  // A scalar key over what the instants depend on: each layer's placement and lens.
  const key = useSceneStore((s) =>
    [...s.layers, ...s.sceneLayers.filter(isVectorLayer)]
      .map((layer) => `${layer.id}:${layer.visible === false ? 0 : 1}:${JSON.stringify(layer.asAffine ?? null)}:${(layer as { lens?: { id: string } }).lens?.id ?? ""}`)
      .join("|"),
  );

  const reader = useMemo(
    () =>
      createWindowReader(() => {
        const { client: c, datalayer: d } = live.current;
        return c && d ? { client: c, datalayer: d } : null;
      }),
    [],
  );
  const values = useRef(new Map<string, Promise<Float64Array>>());
  // Only the entries THIS host wrote are its to remove: table-backed layers
  // publish their own (`usePublishWorldTimeline`) once their scan returns.
  const published = useRef(new Set<string>());
  useEffect(() => () => reader.dispose(), [reader]);

  useEffect(() => {
    let cancelled = false;
    const { layers, sceneLayers } = sceneStoreApi.getState();

    const timed: TimedLayer[] = [
      ...layers.map((layer) => ({
        id: layer.id,
        visible: layer.visible,
        asAffine: layer.asAffine as TimedLayer["asAffine"],
        lens: layer.lens,
        rendered: [layer.xAxis, layer.yAxis, layer.zAxis, layer.intensityAxis, layer.phasorAxis],
      })),
      ...sceneLayers.filter(isVectorLayer).map((layer) => ({
        id: layer.id,
        visible: layer.visible,
        asAffine: layer.asAffine as TimedLayer["asAffine"],
        lens: layer.lens,
        rendered: [layer.renderAxes.x, layer.renderAxes.y, layer.renderAxes.z, layer.vectorAxis],
      })),
    ];

    const readValues = (dataset: NonNullable<NonNullable<NonNullable<TimedLayer["asAffine"]>["fields"]>[number]["dataset"]>) => {
      const cached = values.current.get(dataset.id);
      if (cached) return cached;
      const level0 = dataset.dataArrays.find((array) => array.level === 0) ?? dataset.dataArrays[0];
      const promise = reader
        .read(level0.store as WindowStore, [null], { fidelity: "exact" })
        .then((window) => Float64Array.from(window.data as ArrayLike<number>));
      promise.catch(() => values.current.delete(dataset.id));
      values.current.set(dataset.id, promise);
      return promise;
    };

    const setInstants = viewerApi.getState().setLayerAxisInstants;
    const publish = (layerId: string, instants: AxisInstants[] | null) => {
      if (instants === null) published.current.delete(layerId);
      else published.current.add(layerId);
      setInstants(layerId, instants);
    };
    const seen = new Set<string>();

    for (const layer of timed) {
      seen.add(layer.id);
      if (layer.visible === false || !layer.asAffine) {
        publish(layer.id, null);
        continue;
      }
      const sliceMap = buildSliceMap(layer.lens.slices);
      const dims = collapsibleLensDims(layer.lens, layer.rendered);
      const positionsOf = (dim: string) =>
        resolveSpatialSelection(sliceMap[dim], layer.lens.shape[layer.lens.axisNames.indexOf(dim)] ?? 1);

      const sync: AxisInstants[] = [];
      const pending: Promise<AxisInstants | null>[] = [];
      for (const dim of dims) {
        const lookup = lookupFor(layer.asAffine, dim) as (NonNullable<NonNullable<TimedLayer["asAffine"]>["fields"]>[number] & ReturnType<typeof lookupFor>) | null;
        if (lookup?.dataset) {
          const { dataset } = lookup;
          pending.push(readValues(dataset).then((array) => lookupInstants(lookup, array, positionsOf(dim))));
          continue;
        }
        const instants = affineInstants(layer.asAffine, dim, positionsOf(dim));
        if (instants) sync.push(instants);
      }

      if (pending.length === 0) {
        publish(layer.id, sync);
        continue;
      }
      void Promise.all(pending)
        .then((resolved) => {
          if (cancelled) return;
          publish(layer.id, [...sync, ...resolved.filter((entry): entry is AxisInstants => entry !== null)]);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          console.warn("[world time] could not read a lookup's instants:", error);
          publish(layer.id, sync);
        });
    }

    // A removed layer's frames leave the slider with it.
    for (const id of [...published.current]) {
      if (!seen.has(id)) publish(id, null);
    }

    return () => {
      cancelled = true;
    };
  }, [key, reader, sceneStoreApi, viewerApi]);

  return null;
}

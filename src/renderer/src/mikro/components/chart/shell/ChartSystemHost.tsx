import { useEffect, useRef } from "react";
import { useDatalayerEndpoint } from "@/core/connection/arkitekt/host";
import type { MikroClient } from "@/core/data/zarr/store/types";
import { useMikro } from "@/mikro/api/funcs";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { createWindowReader, type WindowStore } from "@/mikro/lib/zarr/windowReader";
import { createChartSystem, type ChartDeps, type ChartScopeStores } from "./chartSystem";

/**
 * Hosts the chart system for one scope: builds it when the scope is ready,
 * disposes it when the scope is rebuilt or the page leaves. Headless — the
 * system's work is all vanilla subscriptions and store writes (P17).
 *
 * Dependencies come from React context (the mikro client, the datalayer, the
 * attribute service's parquet engine) and are handed over as GETTERS over a
 * ref, so a context value arriving or changing never rebuilds the drivers
 * (which would refetch everything).
 */
export const ChartSystemHost = ({ scope }: { scope: ChartScopeStores }) => {
  const client = useMikro() as MikroClient | undefined;
  const datalayer = useDatalayerEndpoint();
  const attributes = useAttributeServiceOrNull();
  const live = useRef({ client, datalayer, attributes });
  live.current = { client, datalayer, attributes };

  useEffect(() => {
    const reader = createWindowReader(() => {
      const { client: c, datalayer: d } = live.current;
      return c && d ? { client: c, datalayer: d } : null;
    });
    const deps: ChartDeps = {
      // `storeByLevelId` holds the fragment objects the layer was built from,
      // so this is the real store (id + key), only typed structurally.
      readWindow: (store, ranges, opts) => reader.read(store as WindowStore, ranges, opts),
      engine: () => live.current.attributes?.engine ?? null,
    };
    const system = createChartSystem(scope, deps);
    return () => {
      system.dispose();
      reader.dispose();
    };
  }, [scope]);

  return null;
};

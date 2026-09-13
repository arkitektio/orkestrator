import { useEffect } from "react";
import { useWidgetRegistry } from "@/rekuest/widgets/WidgetsContext";
import { useConnection } from "./hooks";
import { Service, ServiceBuilderMap } from "./types";

/**
 * Automatically registers wards from connected services into the WidgetRegistry.
 * Replaces individual ward components (MikroNextWard, KraphWard, etc.)
 * by reading the `ward` field from each Service and the `wardKey` from each ServiceDefinition.
 */
export const WardRegistrar = () => {
  const connection = useConnection();
  const { registry } = useWidgetRegistry();

  const serviceMap = connection?.serviceMap;
  const serviceBuilderMap = connection?.serviceBuilderMap as ServiceBuilderMap | undefined;

  useEffect(() => {
    if (!serviceMap || !serviceBuilderMap || !registry) return;

    const cleanups: (() => void)[] = [];

    for (const [key, definition] of Object.entries(serviceBuilderMap)) {
      const wardKey = definition.wardKey;
      if (!wardKey) continue;

      const service = serviceMap[key] as Service | undefined;
      if (!service?.ward) continue;

      const unregister = registry.registerWard(wardKey, service.ward);
      cleanups.push(unregister);
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [serviceMap, serviceBuilderMap, registry]);

  return null;
};

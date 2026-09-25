import { useMemo } from "react";
import { manifest } from "@/constants";
import { buildArkitekt } from "@/lib/arkitekt";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import { coordinationBase } from "@/lib/arkitekt/coordination";
import { useArkitektStore } from "@/lib/arkitekt/provider";
import { ModuleRegistry, ServiceBuilderMap } from "@/lib/arkitekt/types";
import { selfService } from "@/lok/service";
import { MODULES, moduleRegistryOf, servicesOf } from "./modules";
import { createLivekitClient } from "@/lib/livekit copy/client";

export const electronRedirect = async (
  url: string,
  _abortController: AbortController,
) => {
  return await window.api.authenticate(url);
};


export const serviceMap = {
  ...servicesOf(MODULES),
  // Host services: no module, no rail tile, just a client.
  livekit: {
    key: "livekit",
    service: "io.livekit.livekit",
    optional: true,
    omitchallenge: true,
    forceinsecure: true,
    builder: ({ alias }) => {
      return {
        client: createLivekitClient({
          url: aliasToHttpPath(alias, ""),
        }),
        alias
      };
    },
  },
  datalayer: {
    key: "datalayer",
    service: "live.arkitekt.s3",
    optional: true,
    omitchallenge: true,
    builder: ({ alias }) => {
      return {
        client: { url: aliasToHttpPath(alias, "") },
        alias
      };
    },
  },
} as const satisfies ServiceBuilderMap;

export const moduleRegistry: ModuleRegistry = moduleRegistryOf(MODULES);

// Check if running in tauri
export const Arkitekt = buildArkitekt({ manifest, serviceBuilderMap: serviceMap, moduleRegistry, selfServiceBuilder: selfService });

export const Guard = {
  Lok: Arkitekt.Guard,
  Mikro: Arkitekt.buildServiceGuard("mikro"),
  Fluss: Arkitekt.buildServiceGuard("fluss"),
  Rekuest: Arkitekt.buildServiceGuard("rekuest"),
  Kabinet: Arkitekt.buildServiceGuard("kabinet"),
  OmeroArk: Arkitekt.buildServiceGuard("omero_ark"),
  Livekit: Arkitekt.buildServiceGuard("livekit"),
  Kraph: Arkitekt.buildServiceGuard("kraph"),
  Alpaka: Arkitekt.buildServiceGuard("alpaka"),
  Elektro: Arkitekt.buildServiceGuard("elektro"),
  Lovekit: Arkitekt.buildServiceGuard("lovekit"),
  Dokuments: Arkitekt.buildServiceGuard("dokuments"),
  Datalayer: Arkitekt.buildServiceGuard("datalayer"),
};

export const useMikro = () => {
  return Arkitekt.useService("mikro").client;
};

export const useKabinet = () => {
  return Arkitekt.useService("kabinet").client
};

export const useRekuest = () => {
  return Arkitekt.useService("rekuest").client;
};

export const useLok = () => {
  return Arkitekt.useSelfService()?.client;
};

export const useFluss = () => {
  return Arkitekt.useService("fluss").client
};

export const useOmeroArk = () => {
  return Arkitekt.useService("omero_ark").client
};

export const useKraph = () => {
  return Arkitekt.useService("kraph").client;
}

export const useAlpaka = () => {
  return Arkitekt.useService("alpaka").client;
};

export const useLovekit = () => {
  return Arkitekt.useService("lovekit").client;
};

export const useElektro = () => {
  return Arkitekt.useService("elektro").client;
};

export const useLivekit = () => {
  return Arkitekt.useService("livekit").client;
};

export const useFake = () => {
  return Arkitekt.usePotentialService("mikro")?.client;
}

export const useDokuments = () => {
  return Arkitekt.useService("dokuments").client;
};
/**
 * Where lok's media lives: the coordination server's base path, not the
 * `datalayer` service from fakts (that one is the modules' store).
 */
export const useCoordinationEndpoint = (): string | undefined => {
  const baseUrl = useArkitektStore((state) => state.connection?.endpoint?.base_url);
  return useMemo(() => (baseUrl ? coordinationBase(baseUrl) : undefined), [baseUrl]);
};

export const useDatalayerEndpoint = (): string | undefined => {
  const url = Arkitekt.usePotentialService("datalayer")?.client?.url;
  return url;
};

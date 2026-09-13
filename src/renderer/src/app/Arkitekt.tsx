import alpakaResult from "@/alpaka/api/fragments";
import { manifest } from "@/constants";
import dokumentsResult from "@/dokuments/api/fragments";
import elektroResult from "@/elektro/api/fragments";
import kabinetResult from "@/kabinet/api/fragments";
import kraphResult from "@/kraph/api/fragments";
import { buildArkitekt } from "@/lib/arkitekt";
import { aliasToHttpPath } from "@/lib/arkitekt/alias/helpers";
import { createGraphQLServiceBuilder } from "@/lib/arkitekt/builders/graphQlServiceBuidler";
import { ModuleRegistry, ServiceBuilderMap } from "@/lib/arkitekt/types";
import {
  ALPAKA_TYPE_POLICIES,
  ELEKTRO_TYPE_POLICIES,
  FLUSS_TYPE_POLICIES,
  KABINET_TYPE_POLICIES,
  KRAPH_TYPE_POLICIES,
  LOK_TYPE_POLICIES,
  LOVEKIT_TYPE_POLICIES,
  MIKRO_TYPE_POLICIES,
  REKUEST_TYPE_POLICIES,
} from "@/app/cachePolicies";
import { createLivekitClient } from "@/lib/livekit copy/client";
import lokResult from "@/lok-next/api/fragments";
import lovekitResult from "@/lovekit/api/fragments";
import mikroResult from "@/mikro-next/api/fragments";
import omeroArkResult from "@/omero-ark/api/fragments";
import flussResult from "@/reaktion/api/fragments";
import rekuestResult from "@/rekuest/api/fragments";

export const electronRedirect = async (
  url: string,
  _abortController: AbortController,
) => {
  return await window.api.authenticate(url);
};


export const serviceMap = {
  mikro: {
    key: "mikro",
    service: "live.arkitekt.mikro",
    optional: true,
    wardKey: "mikro",
    describe: true,
    builder: createGraphQLServiceBuilder(mikroResult.possibleTypes, { describe: true, typePolicies: MIKRO_TYPE_POLICIES }),
  },
  rekuest: {
    key: "rekuest",
    service: "live.arkitekt.rekuest",
    optional: true,
    wardKey: "rekuest",
    describe: true,
    builder: createGraphQLServiceBuilder(rekuestResult.possibleTypes, { describe: true, typePolicies: REKUEST_TYPE_POLICIES }),
  },
  lovekit: {
    key: "lovekit",
    service: "live.arkitekt.lovekit",
    optional: true,
    builder: createGraphQLServiceBuilder(lovekitResult.possibleTypes, { typePolicies: LOVEKIT_TYPE_POLICIES }),
  },
  fluss: {
    key: "fluss",
    service: "live.arkitekt.fluss",
    optional: true,
    wardKey: "fluss",
    builder: createGraphQLServiceBuilder(flussResult.possibleTypes, { typePolicies: FLUSS_TYPE_POLICIES }),
  },
  kabinet: {
    key: "kabinet",
    service: "live.arkitekt.kabinet",
    optional: true,
    wardKey: "kabinet",
    builder: createGraphQLServiceBuilder(kabinetResult.possibleTypes, { typePolicies: KABINET_TYPE_POLICIES }),
  },
  omero_ark: {
    key: "omero_ark",
    service: "live.arkitekt.omero_ark",
    optional: true,
    wardKey: "omero_ark",
    builder: createGraphQLServiceBuilder(omeroArkResult.possibleTypes),
  },
  kraph: {
    key: "kraph",
    service: "live.arkitekt.kraph",
    optional: true,
    wardKey: "kraph",
    builder: createGraphQLServiceBuilder(kraphResult.possibleTypes, { typePolicies: KRAPH_TYPE_POLICIES }),
  },
  alpaka: {
    key: "alpaka",
    service: "live.arkitekt.alpaka",
    optional: true,
    wardKey: "alpaka",
    builder: createGraphQLServiceBuilder(alpakaResult.possibleTypes, { typePolicies: ALPAKA_TYPE_POLICIES }),
  },
  dokuments: {
    key: "dokuments",
    service: "live.arkitekt.dokuments",
    optional: true,
    builder: createGraphQLServiceBuilder(dokumentsResult.possibleTypes),
  },
  elektro: {
    key: "elektro",
    service: "live.arkitekt.elektro",
    optional: true,
    wardKey: "elektro",
    builder: createGraphQLServiceBuilder(elektroResult.possibleTypes, { typePolicies: ELEKTRO_TYPE_POLICIES }),
  },
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

export const moduleRegistry = {
  mikro: {
    key: "mikro",
    route: "/mikro",
    label: "Mikro",
    requirement: { serviceKey: "mikro" },
  },
  rekuest: {
    key: "rekuest",
    route: "/rekuest",
    label: "Rekuest",
    requirement: { serviceKey: "rekuest" },
  },
  fluss: {
    key: "fluss",
    route: "/fluss",
    label: "Fluss",
    requirement: { serviceKey: "fluss" },
  },
  kabinet: {
    key: "kabinet",
    route: "/kabinet",
    label: "Kabinet",
    requirement: { serviceKey: "kabinet" },
  },
  omero_ark: {
    key: "omero_ark",
    route: "/omero_ark",
    label: "Omero Ark",
    requirement: { serviceKey: "omero_ark" },
  },
  kraph: {
    key: "kraph",
    route: "/kraph",
    label: "Kraph",
    requirement: { serviceKey: "kraph" },
  },
  alpaka: {
    key: "alpaka",
    route: "/alpaka",
    label: "Alpaka",
    requirement: { serviceKey: "alpaka" },
  },
  elektro: {
    key: "elektro",
    route: "/elektro",
    label: "Elektro",
    requirement: { serviceKey: "elektro" },
  },
  lovekit: {
    key: "lovekit",
    route: "/lovekit",
    label: "Lovekit",
    requirement: { serviceKey: "lovekit" },
  },
  dokuments: {
    key: "dokuments",
    route: "/dokuments",
    label: "Dokuments",
    requirement: { serviceKey: "dokuments" },
  },
} as const satisfies ModuleRegistry;

// Check if running in tauri
export const Arkitekt = buildArkitekt({ manifest, serviceBuilderMap: serviceMap, moduleRegistry, selfServiceBuilder: createGraphQLServiceBuilder(lokResult.possibleTypes, { typePolicies: LOK_TYPE_POLICIES }) });

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
export const useDatalayerEndpoint = (): string | undefined => {
  const url = Arkitekt.usePotentialService("datalayer")?.client?.url;
  return url;
};

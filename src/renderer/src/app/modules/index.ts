import { manifest as alpaka } from "@/alpaka/manifest";
import { service as alpakaService } from "@/alpaka/service";
import { manifest as dokuments } from "@/dokuments/manifest";
import { service as dokumentsService } from "@/dokuments/service";
import { manifest as elektro } from "@/elektro/manifest";
import { service as elektroService } from "@/elektro/service";
import { manifest as fluss } from "@/fluss/manifest";
import { service as flussService } from "@/fluss/service";
import { manifest as kabinet } from "@/kabinet/manifest";
import { service as kabinetService } from "@/kabinet/service";
import { manifest as kraph } from "@/kraph/manifest";
import { service as kraphService } from "@/kraph/service";
import type { ModuleManifest } from "@/core/lib/module-spec";
import { manifest as lok } from "@/lok/manifest";
import { manifest as lovekit } from "@/lovekit/manifest";
import { service as lovekitService } from "@/lovekit/service";
import { manifest as mikro } from "@/mikro/manifest";
import { service as mikroService } from "@/mikro/service";
import { manifest as omeroark } from "@/omeroark/manifest";
import { service as omeroarkService } from "@/omeroark/service";
import { manifest as rekuest } from "@/rekuest/manifest";
import { service as rekuestService } from "@/rekuest/service";
import { modulePathsOf } from "./paths";

/**
 * Every first-party module the host knows, as data plus its service binding.
 *
 * This is the ONE list of modules in the app. Registries (rail, routes,
 * services, dialogs, displays, actions, sections, ...) are derived from it, so
 * adding a module is adding a line here — and, once manifests arrive from the
 * hub, not even that. Order is rail order.
 *
 * Deliberately data-only (manifests + client builders): `app/Arkitekt` reads
 * this, and a component import here would pull module code into the one file
 * everything else imports (see `./builtins` for the code half).
 */
export const MODULES = [
  { manifest: mikro, service: mikroService },
  { manifest: rekuest, service: rekuestService },
  { manifest: fluss, service: flussService },
  { manifest: kabinet, service: kabinetService },
  { manifest: omeroark, service: omeroarkService },
  { manifest: kraph, service: kraphService },
  { manifest: alpaka, service: alpakaService },
  { manifest: elektro, service: elektroService },
  { manifest: lovekit, service: lovekitService },
  { manifest: dokuments, service: dokumentsService },
] as const;

/** The session's own module: lok, served by the self service. Not on the rail list. */
export const SELF_MODULE: ModuleManifest = lok;

export const ALL_MANIFESTS: readonly ModuleManifest[] = [
  ...MODULES.map((module) => module.manifest),
  SELF_MODULE,
];

type ModuleEntry = (typeof MODULES)[number];

/** `{ [service.key]: service }`, with every key and builder type kept. */
export type ServicesOf<M extends readonly ModuleEntry[]> = {
  [E in M[number] as E["service"]["key"]]: E["service"];
};

export const servicesOf = <M extends readonly ModuleEntry[]>(modules: M): ServicesOf<M> =>
  Object.fromEntries(modules.map((module) => [module.service.key, module.service])) as ServicesOf<M>;

/** The rail registry: one entry per module, routed by namespace. */
export const moduleRegistryOf = (modules: readonly ModuleEntry[]) =>
  Object.fromEntries(
    modules.map(({ manifest, service }) => [
      manifest.namespace,
      {
        key: manifest.namespace,
        route: `/${manifest.namespace}`,
        label: manifest.label,
        requirement: { serviceKey: service.key },
      },
    ]),
  );

export const MODULE_PATHS: readonly string[] = modulePathsOf(ALL_MANIFESTS);

export const isModulePath = (segment?: string): segment is string =>
  !!segment && MODULE_PATHS.includes(segment);

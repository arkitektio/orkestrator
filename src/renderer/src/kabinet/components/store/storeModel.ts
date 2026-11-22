import {
  AppFilter,
  AppHardware,
  AppOrder,
  Ordering,
  ComponentContext,
  PodStatus,
  ShelfAppFragment,
  StoreAppFragment,
  StoreFlavourFragment,
  StoreReleaseFragment,
  StoreRepoBlokFragment,
} from "../../api/graphql";
// The identity helpers are shared with the release and flavour surfaces now;
// re-exported here because the store has always reached for them by this name.
import { type AppIdentity, hueFor, logoFor, releaseIdentity, splitIdentifier } from "../../appIdentity";

export { hueFor, logoFor, splitIdentifier };

export type StoreSelector = StoreFlavourFragment["selectors"][number];
export type StoreDefinition = StoreFlavourFragment["definitions"][number];
export type StoreBlok = StoreFlavourFragment["blokImplementations"][number];

/**
 * What the store offers as a blok: panels and scenes. Logos only dress up
 * their app and its actions, so they are no thing to install.
 */
export const isOfferedBlok = (blok: Pick<StoreBlok, "context">): boolean =>
  blok.context === ComponentContext.Panel || blok.context === ComponentContext.Scene;

export type Hardware = "gpu" | "cpu";

/**
 * One registered app as every store surface draws it. A list reads it from
 * `apps` (`fromStoreApp`: its newest release plus what the server works out over
 * all of its releases); a page that holds an app's or a release's releases folds
 * them with `groupApps`.
 */
export type StoreApp = {
  /** The `App` row's id — what the app's model page is keyed by. */
  id: string;
  identifier: string;
  name: string;
  publisher: string | null;
  /** Newest release first: what the caller had. A listed app has only its newest. */
  releases: StoreReleaseFragment[];
  /** How many releases the app has. */
  releaseCount: number;
  latest: StoreReleaseFragment;
  flavours: StoreFlavourFragment[];
  definitions: StoreDefinition[];
  /**
   * The panels and scenes its latest release brings, one per key: every
   * build of a release declares the same bloks, so the first build's is shown.
   */
  bloks: StoreBlok[];
  hardware: Hardware[];
  accelerators: string[];
  services: string[];
  scopes: string[];
  repos: NonNullable<StoreFlavourFragment["repo"]>[];
  runningCount: number;
  deploymentCount: number;
  /** The LOGO blok of the newest release that brings one. */
  logoBlok: { id: string; hash: string } | null;
  logo: string | null;
  hue: number;
  /**
   * Kabinet's `Embedding` scalar, `<model id>:<floats>`. Drives the generated
   * mark an app without a logo falls back to; null until the backend has
   * indexed the app, which just means a plain plate instead of a symbol.
   */
  embedding: string | null;
};

const GPU_SELECTORS: Record<string, string> = {
  CudaSelector: "CUDA",
  RocmSelector: "ROCm",
  OneApiSelector: "oneAPI",
};

export const selectorLabel = (selector: StoreSelector): string => {
  switch (selector.__typename) {
    case "CudaSelector":
      return [
        "CUDA",
        selector.cudaVersion,
        selector.computeCapability && `≥ ${selector.computeCapability}`,
      ]
        .filter(Boolean)
        .join(" ");
    case "RocmSelector":
      return ["ROCm", selector.apiVersion].filter(Boolean).join(" ");
    case "OneApiSelector":
      return "oneAPI";
    case "CPUSelector":
      return ["CPU", selector.arch].filter(Boolean).join(" ");
    case "RAMSelector":
      return "RAM";
    case "LabelSelector":
      return "Label";
    default:
      return (selector as { kind: string }).kind;
  }
};

const uniqueBy = <T>(items: T[], key: (item: T) => string): T[] => {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(key(item))) seen.set(key(item), item);
  }
  return [...seen.values()];
};

/** Releases arrive newest first; order is preserved within each app. */
export const groupApps = (releases: StoreReleaseFragment[]): StoreApp[] => {
  const byIdentifier = new Map<string, StoreReleaseFragment[]>();
  for (const release of releases) {
    const list = byIdentifier.get(release.app.identifier) ?? [];
    list.push(release);
    byIdentifier.set(release.app.identifier, list);
  }

  return [...byIdentifier.entries()].map(([identifier, appReleases]) => {
    const latest = appReleases[0];
    const flavours = appReleases.flatMap((r) => r.flavours);
    const latestFlavours = latest.flavours;
    const selectors = flavours.flatMap((f) => f.selectors);
    const accelerators = uniqueBy(
      selectors.filter((s) => s.__typename && s.__typename in GPU_SELECTORS),
      (s) => s.__typename!,
    ).map((s) => GPU_SELECTORS[s.__typename!]);

    const hardware: Hardware[] = [];
    if (accelerators.length) hardware.push("gpu");
    // A flavour without any GPU selector runs on plain CPU backends.
    if (
      flavours.some(
        (f) => !f.selectors.some((s) => s.__typename && s.__typename in GPU_SELECTORS),
      )
    ) {
      hardware.push("cpu");
    }

    const deployments = flavours.flatMap((f) => f.deployments);
    const { name, publisher } = splitIdentifier(identifier);
    const repos = uniqueBy(
      flavours.flatMap((f) => (f.repo ? [f.repo] : [])),
      (r) => r.id,
    );

    return {
      id: latest.app.id,
      identifier,
      name,
      publisher: publisher ?? repos[0]?.user ?? null,
      releases: appReleases,
      releaseCount: appReleases.length,
      latest,
      flavours,
      // Actions come from the latest release so the store shows what you get today.
      definitions: uniqueBy(
        (latestFlavours.length ? latestFlavours : flavours).flatMap((f) => f.definitions),
        (d) => d.id,
      ),
      bloks: uniqueBy(
        latestFlavours.flatMap((f) => f.blokImplementations).filter(isOfferedBlok),
        (b) => b.key,
      ),
      hardware,
      accelerators,
      services: [
        ...new Set(flavours.flatMap((f) => f.requirements.map((r) => r.service))),
      ].sort(),
      scopes: [...new Set(appReleases.flatMap((r) => r.scopes))].sort(),
      repos,
      runningCount: deployments.filter((d) => d.status === PodStatus.Running).length,
      deploymentCount: deployments.length,
      logoBlok: appReleases.map((r) => r.logoBlok).find(Boolean) ?? null,
      logo:
        logoFor(latest) ??
        latestFlavours.map(logoFor).find(Boolean) ??
        null,
      hue: hueFor(identifier),
      // Codegen types the Embedding scalar as `any`; it is a string on the wire
      // and `decodeEmbedding` is the only thing that reads it, so narrow here
      // rather than trusting the shape further in.
      embedding: typeof latest.app.embedding === "string" ? latest.app.embedding : null,
    };
  });
};

const HARDWARE: Record<AppHardware, Hardware> = { [AppHardware.Gpu]: "gpu", [AppHardware.Cpu]: "cpu" };

/**
 * A listed app: drawn from its newest release, with the facts the server works
 * out over all of its releases (deployments, hardware, accelerators, services).
 * An app without a release yet has nothing to draw, and is left out.
 */
export const fromStoreApp = (app: StoreAppFragment): StoreApp | null => {
  if (!app.latestRelease) return null;
  const [folded] = groupApps([app.latestRelease]);
  return {
    ...folded,
    id: app.id,
    releaseCount: app.releaseCount,
    hardware: app.hardware.map((hardware) => HARDWARE[hardware]),
    accelerators: app.accelerators,
    services: [...app.services].sort(),
    runningCount: app.runningCount,
    deploymentCount: app.deploymentCount,
    embedding: typeof app.embedding === "string" ? app.embedding : folded.embedding,
  };
};

export const fromStoreApps = (apps: readonly StoreAppFragment[]): StoreApp[] =>
  apps.flatMap((app) => {
    const listed = fromStoreApp(app);
    return listed ? [listed] : [];
  });

/** What a shelf tile draws: the icon, the name, the newest version and how many actions it brings. */
export type ShelfTile = AppIdentity & {
  id: string;
  publisher: string | null;
  version: string;
  actionCount: number;
};

/** A listed app as a shelf tile. */
export const shelfTileOf = (app: StoreApp): ShelfTile => ({
  id: app.id,
  identifier: app.identifier,
  name: app.name,
  publisher: app.publisher,
  logo: app.logo,
  logoBlok: app.logoBlok,
  embedding: app.embedding,
  hue: app.hue,
  version: app.latest.version,
  actionCount: app.definitions.length,
});

/**
 * A `ShelfApp` (newest release, action ids only) as a shelf tile. An app
 * without a release yet has nothing to draw, and is left out.
 */
export const fromShelfApp = (app: ShelfAppFragment): ShelfTile | null => {
  const latest = app.latestRelease;
  if (!latest) return null;
  return {
    ...releaseIdentity({ ...latest, app: { id: app.id, identifier: app.identifier, embedding: app.embedding } }),
    id: app.id,
    publisher: splitIdentifier(app.identifier).publisher,
    version: latest.version,
    actionCount: new Set(latest.flavours.flatMap((flavour) => flavour.definitions.map((definition) => definition.id))).size,
  };
};

/** `bloks` lists the panels and scenes instead of the apps. */
export type StoreFilter = "all" | "gpu" | "cpu" | "installed" | "bloks";
export type StoreSort = "recent" | "name";

/** The server's filter for the store's chips and search. */
export const storeAppFilter = ({
  search,
  filter,
  service,
}: {
  search: string;
  filter: StoreFilter;
  service: string | null;
}): AppFilter => ({
  ...(search.trim() ? { search: search.trim() } : {}),
  ...(filter === "gpu" ? { hardware: [AppHardware.Gpu] } : {}),
  ...(filter === "cpu" ? { hardware: [AppHardware.Cpu] } : {}),
  ...(filter === "installed" ? { deployed: true } : {}),
  ...(filter === "bloks" ? { bloks: true } : {}),
  ...(service ? { service } : {}),
});

/** The server's order for the store's sort buttons. */
export const storeAppOrder = (sort: StoreSort): AppOrder[] =>
  sort === "name" ? [{ identifier: Ordering.Asc }] : [{ releasedAt: Ordering.Desc }];

const blokMatches = (blok: StoreBlok, needle: string): boolean =>
  blok.key.toLowerCase().includes(needle) ||
  !!blok.description?.toLowerCase().includes(needle);

/** A blok the store offers, with the app that brings it (and installs it). */
export type StoreAppBlok = { app: StoreApp; blok: StoreBlok };

/**
 * The panels and scenes of the listed apps, narrowed to the bloks the search
 * names unless it names their app. Which apps bring one, and which a search
 * names, is the server's answer (`AppFilter.bloks`, `search`); this only picks
 * the bloks within each app.
 */
export const filterAppBloks = (apps: StoreApp[], { search }: { search: string }): StoreAppBlok[] => {
  const needle = search.trim().toLowerCase();
  return apps.filter((app) => app.bloks.length > 0).flatMap((app) => {
    const appMatches =
      !needle ||
      app.identifier.toLowerCase().includes(needle) ||
      app.name.toLowerCase().includes(needle);
    return app.bloks
      .filter((blok) => appMatches || blokMatches(blok, needle))
      .map((blok) => ({ app, blok }));
  });
};

/** The app the store spotlights: the one with the most to explore. */
export const pickFeatured = (apps: StoreApp[]): StoreApp | null =>
  apps.reduce<StoreApp | null>(
    (best, app) =>
      !best ||
      app.definitions.length + app.flavours.length >
        best.definitions.length + best.flavours.length
        ? app
        : best,
    null,
  );

/** An installed copy of a repository blok, as rekuest keeps it. */
export type InstalledCopy = { id: string; origin?: string | null; originHash?: string | null };

/**
 * Where a repository blok stands in rekuest: not there, there as published
 * (`installed`), or there as an older version (`outdated`). An installed copy
 * keeps the `installHash` it was installed with, which changes with anything
 * installing writes (its dependencies too, not only what it draws).
 */
export type RepoBlokState =
  | { kind: "missing" }
  | { kind: "installed"; copy: InstalledCopy }
  | { kind: "outdated"; copy: InstalledCopy };

export const repoBlokState = (
  blok: Pick<StoreRepoBlokFragment, "origin" | "installHash">,
  installed: ReadonlyMap<string, InstalledCopy>,
): RepoBlokState => {
  const copy = installed.get(blok.origin);
  if (!copy) return { kind: "missing" };
  return copy.originHash === blok.installHash ? { kind: "installed", copy } : { kind: "outdated", copy };
};

/** rekuest's custom bloks by the origin they were installed from. */
export const installedByOrigin = (bloks: readonly InstalledCopy[]): ReadonlyMap<string, InstalledCopy> =>
  new Map(bloks.flatMap((blok) => (blok.origin ? [[blok.origin, blok] as const] : [])));

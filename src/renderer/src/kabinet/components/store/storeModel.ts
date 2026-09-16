import {
  PodStatus,
  StoreFlavourFragment,
  StoreReleaseFragment,
} from "../../api/graphql";

export type StoreSelector = StoreFlavourFragment["selectors"][number];
export type StoreDefinition = StoreFlavourFragment["definitions"][number];

export type Hardware = "gpu" | "cpu";

/**
 * One registered app, folded together from all of its releases. The backend
 * has no `apps` listing, so the store groups releases by `app.identifier`.
 */
export type StoreApp = {
  identifier: string;
  name: string;
  publisher: string | null;
  /** Newest release first. */
  releases: StoreReleaseFragment[];
  latest: StoreReleaseFragment;
  flavours: StoreFlavourFragment[];
  definitions: StoreDefinition[];
  hardware: Hardware[];
  accelerators: string[];
  services: string[];
  scopes: string[];
  repos: NonNullable<StoreFlavourFragment["repo"]>[];
  runningCount: number;
  deploymentCount: number;
  logo: string | null;
  hue: number;
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
      return selector.kind;
  }
};

const isUrl = (value?: string | null): value is string =>
  !!value && /^(https?:|data:|blob:)/.test(value);

export const logoFor = (entity: {
  logo?: string | null;
  originalLogo?: string | null;
}): string | null =>
  isUrl(entity.logo) ? entity.logo : isUrl(entity.originalLogo) ? entity.originalLogo : null;

/** Stable hue per identifier, so every app keeps its colour across renders. */
export const hueFor = (identifier: string): number => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

/** `org.example.napari-viewer` → name "Napari Viewer", publisher "org.example". */
export const splitIdentifier = (
  identifier: string,
): { name: string; publisher: string | null } => {
  const parts = identifier.split(/[./]/).filter(Boolean);
  const last = parts.pop() ?? identifier;
  const name = last
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return { name: name || identifier, publisher: parts.length ? parts.join(".") : null };
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
      identifier,
      name,
      publisher: publisher ?? repos[0]?.user ?? null,
      releases: appReleases,
      latest,
      flavours,
      // Actions come from the latest release so the store shows what you get today.
      definitions: uniqueBy(
        (latestFlavours.length ? latestFlavours : flavours).flatMap((f) => f.definitions),
        (d) => d.id,
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
      logo:
        logoFor(latest) ??
        latestFlavours.map(logoFor).find(Boolean) ??
        null,
      hue: hueFor(identifier),
    };
  });
};

export type StoreFilter = "all" | "gpu" | "cpu" | "installed";
export type StoreSort = "recent" | "name" | "actions";

export const filterApps = (
  apps: StoreApp[],
  {
    search,
    filter,
    service,
  }: { search: string; filter: StoreFilter; service: string | null },
): StoreApp[] => {
  const needle = search.trim().toLowerCase();
  return apps.filter((app) => {
    if (filter === "gpu" && !app.hardware.includes("gpu")) return false;
    if (filter === "cpu" && !app.hardware.includes("cpu")) return false;
    if (filter === "installed" && app.deploymentCount === 0) return false;
    if (service && !app.services.includes(service)) return false;
    if (!needle) return true;
    return (
      app.identifier.toLowerCase().includes(needle) ||
      app.name.toLowerCase().includes(needle) ||
      app.definitions.some(
        (d) =>
          d.name.toLowerCase().includes(needle) ||
          d.description?.toLowerCase().includes(needle),
      )
    );
  });
};

export const sortApps = (apps: StoreApp[], sort: StoreSort): StoreApp[] => {
  if (sort === "recent") return apps;
  const copy = [...apps];
  if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "actions")
    copy.sort((a, b) => b.definitions.length - a.definitions.length);
  return copy;
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

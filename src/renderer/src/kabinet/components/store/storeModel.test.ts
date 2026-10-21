import { describe, expect, it, vi } from "vitest";

// graphql.ts pulls in the Arkitekt app through its hooks; only enums/types are needed.
vi.mock("@/kabinet/api/hooks", () => ({}));

import {
  ActionKind,
  ComponentContext,
  PodStatus,
  StoreFlavourFragment,
  StoreReleaseFragment,
} from "../../api/graphql";
import {
  filterAppBloks,
  filterRepoBloks,
  installedByOrigin,
  repoBlokState,
  filterApps,
  groupApps,
  logoFor,
  pickFeatured,
  sortApps,
  splitIdentifier,
} from "./storeModel";

const flavour = (
  id: string,
  overrides: Partial<StoreFlavourFragment> = {},
): StoreFlavourFragment => ({
  id,
  name: "vanilla",
  image: { imageString: `img/${id}`, buildAt: null },
  requirements: [],
  selectors: [],
  definitions: [],
  deployments: [],
  blokImplementations: [],
  assets: [],
  ...overrides,
});

const release = (
  id: string,
  identifier: string,
  version: string,
  flavours: StoreFlavourFragment[],
): StoreReleaseFragment => ({
  id,
  name: `${identifier}:${version}`,
  version,
  scopes: ["read"],
  entrypoint: "app",
  app: { id: identifier, identifier },
  flavours,
});

const def = (id: string, name: string, description?: string) => ({
  id,
  name,
  description,
  kind: ActionKind.Function,
});

const blok = (flavourId: string, key: string, context: ComponentContext, description?: string) => ({
  id: `${flavourId}:${key}`,
  flavourId,
  key,
  context,
  default: false,
  description,
  hash: `hash-${key}`,
});

describe("storeModel", () => {
  const releases = [
    release("r3", "org.lab.napari-viewer", "2.0.0", [
      flavour("f3", {
        definitions: [def("d1", "Show image", "Opens an image"), def("d2", "Segment")],
        requirements: [{ key: "mikro", service: "live.arkitekt.mikro", optional: false }],
        deployments: [{ id: "x", status: PodStatus.Running }],
        blokImplementations: [
          blok("f3", "logo", ComponentContext.Logo),
          blok("f3", "layers", ComponentContext.Html, "Pick the visible layers"),
          blok("f3", "volume", ComponentContext.Scene),
        ],
      }),
      flavour("f4", {
        name: "cuda",
        selectors: [{ __typename: "CudaSelector", kind: "cuda", required: true }],
        blokImplementations: [blok("f4", "layers", ComponentContext.Html, "Pick the visible layers")],
      }),
    ]),
    release("r2", "stardist", "0.1.0", [flavour("f2", { definitions: [def("d3", "Predict")] })]),
    release("r1", "org.lab.napari-viewer", "1.0.0", [flavour("f1")]),
  ];

  it("groups releases per app, newest first", () => {
    const apps = groupApps(releases);
    expect(apps.map((a) => a.identifier)).toEqual(["org.lab.napari-viewer", "stardist"]);
    const napari = apps[0];
    // The App row's id, not the identifier: every store tile links to the app's
    // model page by it, so an undefined here is a dead link on every card.
    expect(napari.id).toBe("org.lab.napari-viewer");
    expect(napari.latest.version).toBe("2.0.0");
    expect(napari.releases).toHaveLength(2);
    expect(napari.name).toBe("Napari Viewer");
    expect(napari.publisher).toBe("org.lab");
    expect(napari.hardware).toEqual(["gpu", "cpu"]);
    expect(napari.accelerators).toEqual(["CUDA"]);
    expect(napari.definitions.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(napari.services).toEqual(["live.arkitekt.mikro"]);
    expect(napari.runningCount).toBe(1);
  });

  it("summarises a single release, which is how the release page reads one", () => {
    // ReleasePage hands `groupApps` one release rather than a whole store, so
    // that it can reuse the app page's panels instead of growing its own. That
    // only holds while one release in means exactly one summary out.
    const one = releases.filter((r) => r.version === "2.0.0");
    const summary = groupApps(one);

    expect(summary).toHaveLength(1);
    expect(summary[0].latest).toBe(one[0]);
    expect(summary[0].releases).toEqual(one);
    expect(summary[0].identifier).toBe("org.lab.napari-viewer");
  });

  it("filters by search over actions, hardware and deployment", () => {
    const apps = groupApps(releases);
    const ids = (f: Parameters<typeof filterApps>[1]) =>
      filterApps(apps, f).map((a) => a.identifier);
    expect(ids({ search: "predict", filter: "all", service: null })).toEqual(["stardist"]);
    expect(ids({ search: "", filter: "gpu", service: null })).toEqual(["org.lab.napari-viewer"]);
    expect(ids({ search: "", filter: "installed", service: null })).toEqual([
      "org.lab.napari-viewer",
    ]);
    expect(ids({ search: "", filter: "all", service: "live.arkitekt.mikro" })).toHaveLength(1);
  });

  it("offers the latest release's panels and scenes once per key", () => {
    const [napari, stardist] = groupApps(releases);
    // Logos are left out, and the cuda build's copy of "layers" is the same blok.
    expect(napari.bloks.map((b) => b.id)).toEqual(["f3:layers", "f3:volume"]);
    expect(stardist.bloks).toEqual([]);
  });

  it("filters bloks by their key, description or app", () => {
    const apps = groupApps(releases);
    const keys = (search: string) =>
      filterAppBloks(apps, { search, service: null }).map(({ blok }) => blok.key);
    expect(keys("")).toEqual(["layers", "volume"]);
    expect(keys("visible")).toEqual(["layers"]);
    expect(keys("napari")).toEqual(["layers", "volume"]);
    expect(keys("predict")).toEqual([]);
    // An app is found by its bloks, too.
    expect(filterApps(apps, { search: "volume", filter: "all", service: null })).toHaveLength(1);
    expect(filterApps(apps, { search: "", filter: "bloks", service: null })).toHaveLength(1);
  });

  it("searches repository bloks and tells installed from outdated", () => {
    const repoBlok = (key: string, hash: string) => ({
      id: key,
      key,
      name: `The ${key}`,
      description: null,
      context: ComponentContext.Html,
      hash: `draws-${key}`,
      installHash: hash,
      origin: `github:lab/bloks:main#${key}`,
      repo: { id: "1", name: "lab/bloks:main" },
    });
    const bloks = [repoBlok("layers", "h1"), repoBlok("volume", "h2"), repoBlok("plot", "h3")];
    expect(filterRepoBloks(bloks, "vol").map((b) => b.key)).toEqual(["volume"]);
    expect(filterRepoBloks(bloks, "lab/bloks")).toHaveLength(3);

    const installed = installedByOrigin([
      { id: "a", origin: bloks[0].origin, originHash: "h1" },
      { id: "b", origin: bloks[1].origin, originHash: "old" },
      { id: "c", origin: null },
    ]);
    expect(bloks.map((b) => repoBlokState(b, installed).kind)).toEqual(["installed", "outdated", "missing"]);
  });

  it("sorts and features", () => {
    const apps = groupApps(releases);
    expect(sortApps(apps, "name").map((a) => a.name)).toEqual(["Napari Viewer", "Stardist"]);
    expect(pickFeatured(apps)?.identifier).toBe("org.lab.napari-viewer");
    expect(pickFeatured([])).toBeNull();
  });

  it("only uses url-like logos", () => {
    expect(logoFor({ logo: "s3/key.png", originalLogo: "https://x/y.png" })).toBe(
      "https://x/y.png",
    );
    expect(logoFor({ logo: null, originalLogo: null })).toBeNull();
    expect(splitIdentifier("plain")).toEqual({ name: "Plain", publisher: null });
  });
});

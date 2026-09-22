import { describe, expect, it } from "vitest";
import { hueFor, logoFor, releaseIdentity, splitIdentifier } from "./appIdentity";

describe("logoFor", () => {
  it("prefers the stored logo, then the upstream one", () => {
    expect(logoFor({ logo: "https://a/l.png", originalLogo: "https://b/l.png" })).toBe(
      "https://a/l.png",
    );
    expect(logoFor({ logo: null, originalLogo: "https://b/l.png" })).toBe("https://b/l.png");
    expect(logoFor({ logo: null, originalLogo: null })).toBeNull();
  });

  it("rejects a value an <img> could not load", () => {
    // Either field may hold a bare storage key rather than a URL, and a broken
    // <img> would hide the mark behind it.
    expect(logoFor({ logo: "logos/abc.png" })).toBeNull();
    expect(logoFor({ logo: "" })).toBeNull();
    for (const scheme of ["https://", "http://", "data:image/png;base64,AA", "blob:x"]) {
      expect(logoFor({ logo: `${scheme}x` }), scheme).not.toBeNull();
    }
  });
});

describe("hueFor", () => {
  it("is stable per identifier and always a legal hue", () => {
    expect(hueFor("org.example.app")).toBe(hueFor("org.example.app"));
    for (const id of ["", "a", "org.example.napari-viewer", "x".repeat(200)]) {
      const hue = hueFor(id);
      expect(hue, id).toBeGreaterThanOrEqual(0);
      expect(hue, id).toBeLessThan(360);
    }
  });
});

describe("splitIdentifier", () => {
  it("reads a display name out of a reverse-domain identifier", () => {
    expect(splitIdentifier("org.example.napari-viewer")).toEqual({
      name: "Napari Viewer",
      publisher: "org.example",
    });
    expect(splitIdentifier("standalone")).toEqual({ name: "Standalone", publisher: null });
  });
});

describe("releaseIdentity", () => {
  const release = {
    logo: null as string | null,
    originalLogo: null as string | null,
    app: { identifier: "org.example.napari-viewer", embedding: null as unknown },
    flavours: [] as { logo?: string | null; originalLogo?: string | null }[],
  };

  it("derives everything an icon needs from a release row", () => {
    expect(releaseIdentity(release)).toEqual({
      identifier: "org.example.napari-viewer",
      name: "Napari Viewer",
      logo: null,
      embedding: null,
      hue: hueFor("org.example.napari-viewer"),
    });
  });

  it("falls back to a flavour's logo when the release has none", () => {
    expect(
      releaseIdentity({ ...release, flavours: [{ logo: "https://f/l.png" }] }).logo,
    ).toBe("https://f/l.png");
  });

  it("prefers the release's own logo over its flavours'", () => {
    // A flavour logo describes one build; all builds are the same app.
    expect(
      releaseIdentity({
        ...release,
        logo: "https://r/l.png",
        flavours: [{ logo: "https://f/l.png" }],
      }).logo,
    ).toBe("https://r/l.png");
  });

  it("narrows the Embedding scalar, which codegen types as any", () => {
    expect(
      releaseIdentity({ ...release, app: { ...release.app, embedding: "m:0.1,0.2" } })
        .embedding,
    ).toBe("m:0.1,0.2");
    for (const bad of [undefined, null, 42, {}, ["m:0.1"]]) {
      expect(
        releaseIdentity({ ...release, app: { ...release.app, embedding: bad } }).embedding,
        String(bad),
      ).toBeNull();
    }
  });

  it("copes with a release that has no flavours at all", () => {
    const { flavours: _flavours, ...noFlavours } = release;
    expect(releaseIdentity(noFlavours).logo).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { MARK_SPEC_VERSION } from "./constants";
import { cyrb53, mulberry32 } from "./hash";
import { decodeEmbedding, markParams, markText } from "./markParams";
import { SPEC } from "./spec";

describe("markText", () => {
  // This string is the contract with whatever computes the embedding
  // (`mark_text()` in the offline fit). If the two drift apart every mark
  // quietly changes, so the cases are pinned rather than described.
  it("separates the name's words and joins the description with a period", () => {
    expect(markText("stardist-node")).toBe("stardist node");
    expect(markText("stardist_node")).toBe("stardist node");
    expect(markText("live.arkitekt.stardist")).toBe("live arkitekt stardist");
    expect(markText("stardist-node", "Star-convex segmentation")).toBe(
      "stardist node. Star-convex segmentation",
    );
    expect(markText("hexmap", "")).toBe("hexmap");
  });
});

describe("hash primitives", () => {
  // Golden values. These seed every mark's pose and fallback plate, so a
  // refactor that changes them silently reshuffles every app's icon.
  it("holds its golden values", () => {
    expect(cyrb53("")).toBe(3338908027751811);
    expect(cyrb53("a")).toBe(7929297801672961);
    expect(cyrb53("live.arkitekt.stardist")).toBe(1231620293403121);
    expect(cyrb53("org.example.napari-viewer")).toBe(2392386183062972);
    const rnd = mulberry32(cyrb53("live.arkitekt.stardist"));
    const first = [rnd(), rnd(), rnd()];
    const again = mulberry32(cyrb53("live.arkitekt.stardist"));
    expect([again(), again(), again()]).toEqual(first);
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("markParams without an embedding", () => {
  // The state kabinet is actually in today: no vector anywhere in the schema.
  const input = { name: "stardist-node", identifier: "live.arkitekt.stardist" };

  it("is deterministic", () => {
    expect(markParams(input)).toEqual(markParams(input));
  });

  it("never claims a semantic match", () => {
    const p = markParams(input);
    expect(p.matched).toBe(false);
    expect(p.topic).toBeNull();
    expect(p.element).toBe("none");
    expect(p.confidence).toBe(0);
  });

  it("only ever picks a plain plate and a palette colour", () => {
    // The expressive symbols stay reserved for real matches — an app that
    // merely hashes to `star` must not look like it was recognised as one.
    for (const identifier of [
      "live.arkitekt.stardist",
      "org.example.napari-viewer",
      "com.acme.hexmap",
      "io.test.zarr-convert",
      "",
    ]) {
      const p = markParams({ name: "whatever", identifier });
      expect(SPEC.fallbackGeoms).toContain(p.geom);
      expect(SPEC.palette).toContain(p.baseColor);
      expect(p.ink).toBe(SPEC.ink);
    }
  });

  it("keeps the pose in a band that leaves the letter readable", () => {
    for (const identifier of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const p = markParams({ name: "X", identifier });
      expect(Math.abs(p.yaw)).toBeLessThanOrEqual(0.15);
      expect(Math.abs(p.roll)).toBeLessThanOrEqual(0.08);
    }
  });

  it("gives different identifiers different marks", () => {
    const a = markParams({ name: "same name", identifier: "org.one.app" });
    const b = markParams({ name: "same name", identifier: "org.two.app" });
    expect([a.geom, a.baseColor, a.yaw]).not.toEqual([b.geom, b.baseColor, b.yaw]);
  });
});

describe("the letter", () => {
  it("is the first alphanumeric, uppercased", () => {
    expect(markParams({ name: "stardist-node" }).letter).toBe("S");
    expect(markParams({ name: "  napari viewer" }).letter).toBe("N");
    expect(markParams({ name: "-_.zarr" }).letter).toBe("Z");
    expect(markParams({ name: "3d-viewer" }).letter).toBe("3");
  });

  it("falls back to a question mark when there is nothing to take", () => {
    expect(markParams({ name: "" }).letter).toBe("?");
    expect(markParams({ name: "🎉" }).letter).toBe("?");
    expect(markParams({ name: "---" }).letter).toBe("?");
  });
});

describe("decodeEmbedding", () => {
  // Kabinet's `Embedding` scalar: `<model id>:<comma-separated floats>`.
  const vector = (n: number, fill = 0.1) => Array.from({ length: n }, () => fill).join(",");

  it("reads the backend's wire format", () => {
    const v = decodeEmbedding(`${SPEC.model}:${vector(SPEC.dim)}`, SPEC.dim, SPEC.model);
    expect(v).toBeInstanceOf(Float32Array);
    expect(v).toHaveLength(SPEC.dim);
    expect(v![0]).toBeCloseTo(0.1, 6);
  });

  it("accepts the bare model name as well as the full hub id", () => {
    // The spec records `minishlab/potion-base-8M`; kabinet's own examples use
    // `potion-base-8M`. Same model, so the org prefix must not reject it.
    const bare = SPEC.model.split("/").pop()!;
    expect(decodeEmbedding(`${bare}:${vector(SPEC.dim)}`, SPEC.dim, SPEC.model)).not.toBeNull();
    expect(
      decodeEmbedding(`${bare.toUpperCase()}:${vector(SPEC.dim)}`, SPEC.dim, SPEC.model),
    ).not.toBeNull();
  });

  it("rejects a vector from a different model", () => {
    // The schema carries the model id precisely because vectors from different
    // models are not comparable. Matching one against these anchors would
    // produce a confident, wrong symbol.
    expect(
      decodeEmbedding(`some-other-model:${vector(SPEC.dim)}`, SPEC.dim, SPEC.model),
    ).toBeNull();
  });

  it("rejects the wrong number of dimensions", () => {
    expect(decodeEmbedding(`${SPEC.model}:${vector(8)}`, SPEC.dim, SPEC.model)).toBeNull();
    expect(
      decodeEmbedding(`${SPEC.model}:${vector(SPEC.dim + 1)}`, SPEC.dim, SPEC.model),
    ).toBeNull();
  });

  it("rejects anything it cannot parse, rather than producing NaNs", () => {
    for (const value of [
      "",
      "no-colon-at-all",
      ":0.1,0.2",
      `${SPEC.model}:`,
      `${SPEC.model}:${vector(SPEC.dim - 1)},oops`,
    ]) {
      expect(decodeEmbedding(value, SPEC.dim, SPEC.model), value).toBeNull();
    }
  });
});

describe("a malformed embedding", () => {
  // A bad value must degrade to the hash-only mark rather than take an icon —
  // or a whole grid — down.
  it("degrades to the unmatched mark instead of throwing", () => {
    for (const embedding of ["", "not an embedding at all", "model:", "model:1,2,3"]) {
      const p = markParams({ name: "app", identifier: "x", embedding });
      expect(p.matched, embedding).toBe(false);
      expect(SPEC.fallbackGeoms, embedding).toContain(p.geom);
    }
  });

  it("keeps the same mark it would have had with no embedding at all", () => {
    const without = markParams({ name: "app", identifier: "x" });
    const broken = markParams({ name: "app", identifier: "x", embedding: "garbage" });
    expect(broken).toEqual(without);
  });
});

describe("a real embedding", () => {
  it("drives the symbol and colour off the vector, not the hash", () => {
    // Two apps with identical identifiers but different vectors must differ,
    // and an app with a vector must be able to leave the fallback palette.
    const anchor = SPEC.shapes[0].vec;
    const shifted = SPEC.mean.map((m, i) => m + anchor[i] * 4);
    const value = `${SPEC.model}:${shifted.join(",")}`;

    const p = markParams({ name: "app", identifier: "x", embedding: value });
    expect(p.matched).toBe(true);
    expect(p.geom).toBe(SPEC.shapes[0].geom);
    expect(p.matchedShape).toBe(SPEC.shapes[0].id);
    expect(p.score).toBeGreaterThanOrEqual(SPEC.shapeMinSimilarity);
  });

  it("is deterministic", () => {
    const value = `${SPEC.model}:${SPEC.mean.map((m, i) => m + SPEC.topics[1].vec[i] * 3).join(",")}`;
    const input = { name: "app", identifier: "x", embedding: value };
    expect(markParams(input)).toEqual(markParams(input));
  });
});

describe("the spec version", () => {
  it("matches the literal the cache key is built from", () => {
    // The tripwire: refitting the anchors changes every mark, so the spec
    // bump has to force a cache-key bump with it.
    expect(MARK_SPEC_VERSION).toBe(SPEC.version);
  });
});

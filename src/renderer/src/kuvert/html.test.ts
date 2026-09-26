import { describe, expect, it } from "vitest";
import { buildSrcDoc, cidReferences, rewriteCidImages } from "./html";

describe("cid images", () => {
  const html = '<img src="cid:logo@x"><img src=cid:Part.2%40y><div style="background:url(cid:bg)">';

  it("finds every reference, normalized", () => {
    expect(cidReferences(html)).toEqual(["logo@x", "part.2@y", "bg"]);
  });

  it("points each one it knows at its URL", () => {
    const out = rewriteCidImages(
      html,
      new Map([
        ["<logo@x>", "https://s3/logo"],
        ["part.2@y", "https://s3/part2"],
      ]),
    );
    expect(out).toBe(
      '<img src="https://s3/logo"><img src=https://s3/part2><div style="background:url(cid:bg)">',
    );
  });
});

describe("buildSrcDoc", () => {
  it("blocks remote images unless allowed", () => {
    expect(buildSrcDoc("<p>hi</p>", { imageOrigins: ["https://dl.example"] })).toContain(
      "img-src data: blob: https://dl.example;",
    );
    expect(buildSrcDoc("<p>hi</p>", { allowRemote: true })).toContain("img-src data: blob: https: http:;");
  });

  it("never allows scripts", () => {
    expect(buildSrcDoc("")).toContain("script-src 'none'");
  });
});

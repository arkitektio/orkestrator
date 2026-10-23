// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseBsxSafe } from "@/core/blok/bsx/parse";
import { defaultBlokCatalog } from "@/core/blok/renderer/catalog";
import { LOGO_ANIMATIONS, LOGO_PAINT_TOKENS } from "@/core/blok/renderer/bloks/logo";
import { normalizeBlokComponentTree, preflightBlokDocument } from "@/core/blok/renderer/runtime";
import { HOST_ACTION_LOGOS } from "./logos";

const attributes = (source: string, name: string) =>
  [...source.matchAll(new RegExp(`\\s${name}="([^"]*)"`, "g"))].map((match) => match[1]);

describe("the host actions' logos", () => {
  it.each(Object.entries(HOST_ACTION_LOGOS))("%s is an ActionLogo this catalog draws, in the palette", (_, source) => {
    const parsed = parseBsxSafe(source);
    if (!parsed.ok) throw parsed.error;
    expect(parsed.tree.component).toBe("ActionLogo");

    const preflight = preflightBlokDocument(normalizeBlokComponentTree([parsed.tree]).roots, defaultBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);

    const paints = [...attributes(source, "fill"), ...attributes(source, "stroke")];
    expect(paints.filter((paint) => !(LOGO_PAINT_TOKENS as readonly string[]).includes(paint))).toEqual([]);
    expect(
      attributes(source, "animate").filter((name) => !(LOGO_ANIMATIONS as readonly string[]).includes(name)),
    ).toEqual([]);
  });
});

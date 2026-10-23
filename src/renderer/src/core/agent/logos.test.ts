// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/smart/registry", () => ({ smartRegistry: { findModel: vi.fn() } }));

import { LOGO_ANIMATIONS, LOGO_PAINT_TOKENS } from "@/core/blok/renderer/bloks/logo";
import "./actions";
import { parseBsxSafe } from "@/core/blok/bsx/parse";
import { defaultBlokCatalog } from "@/core/blok/renderer/catalog";
import { normalizeBlokComponentTree, preflightBlokDocument } from "@/core/blok/renderer/runtime";
import { ACTION_LOGOS } from "./logos";
import { globalRegistry } from "./registry";

const attributes = (source: string, name: string) =>
  [...source.matchAll(new RegExp(`\\s${name}="([^"]*)"`, "g"))].map((match) => match[1]);

describe("orkestrator's action logos", () => {
  it("draw every action this app offers", () => {
    for (const entry of globalRegistry.entries) {
      expect(ACTION_LOGOS[entry.name], entry.name).toBeDefined();
    }
  });

  // Registered in the main process (src/main), out of this test's sight.
  it.each(["watch_directory", "choose_directory"])("draw %s, which the Electron side offers", (name) => {
    expect(ACTION_LOGOS[name]).toBeDefined();
  });

  it.each(Object.entries(ACTION_LOGOS))("%s parses into a tree this catalog draws", (_, logo) => {
    const parsed = parseBsxSafe(logo.source);
    if (!parsed.ok) throw parsed.error;
    const preflight = preflightBlokDocument(normalizeBlokComponentTree([parsed.tree]).roots, defaultBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
  });

  it.each(Object.entries(ACTION_LOGOS))("%s is an ActionLogo in the palette, named for this app", (name, logo) => {
    expect(logo.key).toBe(`orkestrator_${name}_logo`);
    expect(logo.source.startsWith('<ActionLogo viewBox="0 0 24 24"')).toBe(true);
    // The server refuses any paint outside the palette.
    const paints = [...attributes(logo.source, "fill"), ...attributes(logo.source, "stroke")];
    expect(paints.filter((paint) => !(LOGO_PAINT_TOKENS as readonly string[]).includes(paint))).toEqual([]);
    expect(
      attributes(logo.source, "animate").filter((name) => !(LOGO_ANIMATIONS as readonly string[]).includes(name)),
    ).toEqual([]);
  });
});

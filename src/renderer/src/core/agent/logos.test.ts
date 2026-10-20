// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/smart/registry", () => ({ smartRegistry: { findModel: vi.fn() } }));

import { LOGO_ANIMATIONS, LOGO_PAINT_TOKENS } from "@/core/blok/renderer/bloks/logo";
import "./actions";
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

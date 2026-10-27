// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { cleanup, screen } from "@testing-library/react";
import { renderBsx } from "./bloks/testing";
import { addBlokComponents, defaultBlokCatalog } from "./catalog";
import { specOwnedComponents } from "./modules";
import { createBlokCatalog, createBlokComponent } from "./runtime";

const part = (name: string) => createBlokComponent({ name, schema: z.object({}) }, () => null);

describe("addBlokComponents", () => {
  it("adds a module's components and takes them back out", () => {
    const catalog = createBlokCatalog("test", [part("Card")]);
    const undo = addBlokComponents([part("MikroScene")], catalog);
    expect([...catalog.components.keys()]).toEqual(["Card", "MikroScene"]);
    undo();
    expect([...catalog.components.keys()]).toEqual(["Card"]);
  });

  it("refuses a name the catalog already holds, adding none of them", () => {
    const catalog = createBlokCatalog("test", [part("Card"), part("foreach"), part("MikroScene")]);
    // Base's names and the app's own are never drawn over.
    expect(() => addBlokComponents([part("Fresh"), part("foreach")], catalog)).toThrow(/foreach/);
    expect(() => addBlokComponents([part("Fresh"), part("MikroScene")], catalog)).toThrow(/MikroScene/);
    expect([...catalog.components.keys()]).toEqual(["Card", "foreach", "MikroScene"]);
  });

  it("lets a module draw over a standard component, once, and puts it back", () => {
    const standard = part("Slider");
    const mine = part("Slider");
    const catalog = createBlokCatalog("test", [standard]);
    const undo = addBlokComponents([mine], catalog);
    expect(catalog.components.get("Slider")).toBe(mine);
    // A second module cannot draw over it again.
    expect(() => addBlokComponents([part("Slider")], catalog)).toThrow(/Slider/);
    undo();
    expect(catalog.components.get("Slider")).toBe(standard);
  });

  it("renders the module's component where a blok uses the name", () => {
    const mine = createBlokComponent({ name: "Slider", schema: z.object({}) }, () => <span>my slider</span>);
    const undo = addBlokComponents([mine], defaultBlokCatalog);
    try {
      renderBsx(defaultBlokCatalog, "<Card><Slider /></Card>");
      expect(screen.queryByText("my slider")).not.toBeNull();
    } finally {
      cleanup();
      undo();
    }
  });

  it("registers a drawn-over standard component as the module's own", () => {
    const catalog = createBlokCatalog("test", [part("Slider")]);
    expect(specOwnedComponents(catalog).has("Slider")).toBe(true);
    const undo = addBlokComponents([part("Slider")], catalog);
    expect(specOwnedComponents(catalog).has("Slider")).toBe(false);
    undo();
    expect(specOwnedComponents(catalog).has("Slider")).toBe(true);
  });
});

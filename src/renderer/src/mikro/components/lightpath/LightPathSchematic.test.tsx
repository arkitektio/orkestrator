// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { brightfield, confocal, graph, widefield } from "./lightPath.fixtures";
import { LightPathSchematic } from "./LightPathSchematic";

describe("LightPathSchematic", () => {
  it.each([
    ["widefield", widefield],
    ["confocal", confocal],
    ["brightfield", brightfield],
  ])("draws every element and beam of %s", (_name, fixture) => {
    const { container } = render(<LightPathSchematic graph={fixture} />);
    expect(container.querySelectorAll("[data-element]")).toHaveLength(fixture.elements.length);
    expect(container.querySelectorAll("[data-beam]")).toHaveLength(fixture.edges.length);
    for (const element of fixture.elements) expect(container.textContent).toContain(element.label);
  });

  it("colours a beam with a stated wavelength and dashes one without", () => {
    const { container } = render(<LightPathSchematic graph={widefield} />);
    const strokes = [...container.querySelectorAll("[data-beam] path:last-child")];
    expect(strokes.some((path) => path.getAttribute("stroke")?.startsWith("rgb("))).toBe(true);
    const plain = render(<LightPathSchematic graph={brightfield} />).container;
    for (const path of plain.querySelectorAll("[data-beam] path:last-child")) {
      expect(path.getAttribute("stroke-dasharray")).toBe("3 3");
    }
  });

  it("opens the 3D view from the picture and from its button", () => {
    const onExpand = vi.fn();
    const { container, getByRole } = render(<LightPathSchematic graph={widefield} onExpand={onExpand} />);
    getByRole("button", { name: "Open the light path in 3D" }).click();
    (container.querySelector("[data-lightpath]") as HTMLElement).click();
    expect(onExpand).toHaveBeenCalledTimes(2);
  });

  it("says so when the graph is empty", () => {
    const { container } = render(<LightPathSchematic graph={graph([], [])} />);
    expect(container.textContent).toBe("no elements recorded");
  });
});

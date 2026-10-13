import { describe, expect, it, vi } from "vitest";

// Only the PortKind enum is needed; the generated module drags in the Apollo
// client and `window`.
vi.mock("@/rekuest/api/graphql", () => ({
  PortKind: { String: "STRING", Interface: "INTERFACE", Dict: "DICT", Structure: "STRUCTURE" },
}));

import { PortKind } from "@/rekuest/api/graphql";
import { WidgetRegistry } from "./Registry";
import type { ArgPort, ReturnPort } from "./types";

const Unknown = () => null;
const UnknownReturn = () => null;
const UnknownEffect = () => null;
const StringInput = () => null;
const StringReturn = () => null;
const SliderInput = () => null;

const registry = new WidgetRegistry(Unknown, UnknownReturn, UnknownEffect);
registry.registerInputWidgetFallback(PortKind.String, StringInput);
registry.registerReturnWidgetFallback(PortKind.String, StringReturn);
registry.registerInputWidget("SliderAssignWidget", SliderInput);

const arg = (over: Record<string, unknown>) => over as unknown as ArgPort;
const ret = (over: Record<string, unknown>) => over as unknown as ReturnPort;

describe("WidgetRegistry widget selection", () => {
  it("uses the widget typename when registered", () => {
    expect(
      registry.getInputWidgetForPort(
        arg({ kind: PortKind.String, widget: { __typename: "SliderAssignWidget" } }),
      ),
    ).toBe(SliderInput);
  });

  it("falls back to the port kind for an unregistered widget typename", () => {
    expect(
      registry.getInputWidgetForPort(
        arg({ kind: PortKind.String, widget: { __typename: "StringAssignWidget" } }),
      ),
    ).toBe(StringInput);
    expect(
      registry.getReturnWidgetForPort(
        ret({ kind: PortKind.String, widget: { __typename: "ChoiceReturnWidget" } }),
      ),
    ).toBe(StringReturn);
  });

  it("falls back to the port kind without a widget", () => {
    expect(registry.getInputWidgetForPort(arg({ kind: PortKind.String }))).toBe(StringInput);
  });

  it("returns the unknown widget when neither typename nor kind is registered", () => {
    expect(
      registry.getInputWidgetForPort(
        arg({ kind: PortKind.Interface, widget: { __typename: "CustomAssignWidget" } }),
      ),
    ).toBe(Unknown);
    expect(registry.getReturnWidgetForPort(ret({ kind: PortKind.Dict }))).toBe(UnknownReturn);
  });

  it("skips the kind fallback when asked", () => {
    expect(
      registry.getInputWidgetForPort(
        arg({ kind: PortKind.String, widget: { __typename: "StringAssignWidget" } }),
        false,
      ),
    ).toBe(Unknown);
  });
});

describe("the picker of structure ports", () => {
  const Search = () => null;
  const Custom = () => null;
  const StructureFallback = () => null;
  const Picker = () => null;

  const withPicker = new WidgetRegistry(Unknown, UnknownReturn, UnknownEffect);
  withPicker.registerInputWidgetFallback(PortKind.Structure, StructureFallback);
  withPicker.registerInputWidget("SearchAssignWidget", Search);
  withPicker.registerInputWidget("CustomAssignWidget", Custom);
  withPicker.setStructurePicker({
    widget: Picker,
    canPick: (identifier) => identifier === "@mikro/arraydataset",
  });

  const lens = (widget?: Record<string, unknown>) =>
    arg({ kind: PortKind.Structure, identifier: "@mikro/arraylens", widget });

  it("draws a structure port's search, with or without dependencies", () => {
    const plain = { __typename: "SearchAssignWidget", dependencies: [], filters: null };
    expect(withPicker.getInputWidgetForPort(lens(plain))).toBe(Picker);
    const dependent = { __typename: "SearchAssignWidget", dependencies: ["path"], filters: null };
    expect(withPicker.getInputWidgetForPort(lens(dependent))).toBe(Picker);
  });

  it("leaves a search with filter ports to the search widget, which draws them", () => {
    const filtered = { __typename: "SearchAssignWidget", dependencies: [], filters: [{ key: "stage" }] };
    expect(withPicker.getInputWidgetForPort(lens(filtered))).toBe(Search);
  });

  it("leaves a catalog widget the author declared to its own renderer", () => {
    expect(withPicker.getInputWidgetForPort(lens({ __typename: "CustomAssignWidget" }))).toBe(Custom);
  });

  it("fills a port with no widget only when its structure can be picked without a query", () => {
    const dataset = arg({ kind: PortKind.Structure, identifier: "@mikro/arraydataset" });
    expect(withPicker.getInputWidgetForPort(dataset)).toBe(Picker);
    expect(withPicker.getInputWidgetForPort(lens())).toBe(StructureFallback);
  });

  it("never takes a port that is not a structure", () => {
    const text = arg({ kind: PortKind.String, widget: { __typename: "SearchAssignWidget" } });
    expect(withPicker.getInputWidgetForPort(text)).toBe(Search);
  });

  it("can be asked what the port would get without it, which is what the picker falls back to", () => {
    const plain = { __typename: "SearchAssignWidget", dependencies: [], filters: null };
    expect(withPicker.getInputWidgetForPort(lens(plain), true, false)).toBe(Search);
    const dataset = arg({ kind: PortKind.Structure, identifier: "@mikro/arraydataset" });
    expect(withPicker.getInputWidgetForPort(dataset, true, false)).toBe(StructureFallback);
  });

  it("asks on every lookup, so a module installed later is found", () => {
    const late = new WidgetRegistry(Unknown, UnknownReturn, UnknownEffect);
    late.registerInputWidgetFallback(PortKind.Structure, StructureFallback);
    const pickable = new Set<string>();
    late.setStructurePicker({ widget: Picker, canPick: (identifier) => pickable.has(identifier) });
    expect(late.getInputWidgetForPort(lens())).toBe(StructureFallback);
    pickable.add("@mikro/arraylens");
    expect(late.getInputWidgetForPort(lens())).toBe(Picker);
  });
});

import { describe, expect, it, vi } from "vitest";

// Only the PortKind enum is needed; the generated module drags in the Apollo
// client and `window`.
vi.mock("../api/graphql", () => ({
  PortKind: { String: "STRING", Interface: "INTERFACE", Dict: "DICT" },
}));

import { PortKind } from "../api/graphql";
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

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { SerializedDockview } from "dockview";

import { type DashboardWidgetRegistration, useDashboardRegistry } from "./store";

const widget = (key: string): DashboardWidgetRegistration => ({
  key,
  label: key,
  module: "test",
  component: () => null,
  defaultSize: "1x1",
});

// A minimal stand-in for a serialized layout (shape is opaque to the store).
const layout = (id: string) => ({ id } as unknown as SerializedDockview);

beforeEach(() => {
  localStorage.clear();
  useDashboardRegistry.setState({
    widgets: {},
    scopeKey: null,
    serializedLayout: null,
    knownWidgetKeys: null,
    editing: false,
  });
});

describe("register / unregister", () => {
  it("adds and removes widgets by key", () => {
    useDashboardRegistry.getState().register(widget("a"));
    useDashboardRegistry.getState().register(widget("b"));
    expect(Object.keys(useDashboardRegistry.getState().widgets)).toEqual(["a", "b"]);

    useDashboardRegistry.getState().unregister("a");
    expect(Object.keys(useDashboardRegistry.getState().widgets)).toEqual(["b"]);
  });
});

describe("setScope", () => {
  it("loads a previously persisted layout and known keys for the scope", () => {
    localStorage.setItem("home-dashboard-layout-scope1", JSON.stringify(layout("L1")));
    localStorage.setItem("home-dashboard-known-keys-scope1", JSON.stringify(["a", "b"]));

    useDashboardRegistry.getState().setScope("scope1");
    const s = useDashboardRegistry.getState();
    expect(s.scopeKey).toBe("scope1");
    expect(s.serializedLayout).toEqual(layout("L1"));
    expect(s.knownWidgetKeys).toEqual(["a", "b"]);
  });

  it("yields null layout for an unknown scope", () => {
    useDashboardRegistry.getState().setScope("fresh");
    expect(useDashboardRegistry.getState().serializedLayout).toBeNull();
    expect(useDashboardRegistry.getState().knownWidgetKeys).toBeNull();
  });

  it("survives corrupt JSON in storage by returning null", () => {
    localStorage.setItem("home-dashboard-layout-bad", "{not json");
    useDashboardRegistry.getState().setScope("bad");
    expect(useDashboardRegistry.getState().serializedLayout).toBeNull();
  });
});

describe("saveLayout / loadLayout", () => {
  it("persists the layout plus the current widget keys under the scope", () => {
    useDashboardRegistry.getState().register(widget("a"));
    useDashboardRegistry.getState().setScope("s");
    useDashboardRegistry.getState().saveLayout(layout("saved"));

    expect(useDashboardRegistry.getState().serializedLayout).toEqual(layout("saved"));
    expect(useDashboardRegistry.getState().knownWidgetKeys).toEqual(["a"]);
    expect(localStorage.getItem("home-dashboard-layout-s")).toBe(JSON.stringify(layout("saved")));
    expect(localStorage.getItem("home-dashboard-known-keys-s")).toBe(JSON.stringify(["a"]));
  });

  it("loadLayout reads back the persisted layout for the active scope", () => {
    useDashboardRegistry.getState().setScope("s");
    useDashboardRegistry.getState().saveLayout(layout("saved"));
    expect(useDashboardRegistry.getState().loadLayout()).toEqual(layout("saved"));
  });

  it("loadLayout returns null with no active scope", () => {
    expect(useDashboardRegistry.getState().loadLayout()).toBeNull();
  });
});

describe("clearLayout", () => {
  it("removes persisted entries and clears state", () => {
    useDashboardRegistry.getState().setScope("s");
    useDashboardRegistry.getState().saveLayout(layout("saved"));
    useDashboardRegistry.getState().clearLayout();

    expect(useDashboardRegistry.getState().serializedLayout).toBeNull();
    expect(useDashboardRegistry.getState().knownWidgetKeys).toBeNull();
    expect(localStorage.getItem("home-dashboard-layout-s")).toBeNull();
    expect(localStorage.getItem("home-dashboard-known-keys-s")).toBeNull();
  });
});

describe("setEditing", () => {
  it("toggles edit mode", () => {
    useDashboardRegistry.getState().setEditing(true);
    expect(useDashboardRegistry.getState().editing).toBe(true);
  });
});

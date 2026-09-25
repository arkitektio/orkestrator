import {describe, expect, it} from "vitest";

import {
  applyRuntimeValueAtPath,
  composeRuntimeDataModel,
  createBlokRuntimeStore,
} from "./context";

describe("applyRuntimeValueAtPath", () => {
  it("replaces the whole model for an empty path", () => {
    expect(applyRuntimeValueAtPath({a: 1}, "", "next")).toBe("next");
  });

  it("writes a nested object property without mutating the source", () => {
    const source = {user: {name: "Ada", age: 36}};
    const next = applyRuntimeValueAtPath(source, "user/name", "Grace");

    expect(next).toEqual({user: {name: "Grace", age: 36}});
    expect(source.user.name).toBe("Ada");
    expect(next).not.toBe(source);
  });

  it("writes through an array index and keeps the array an array", () => {
    const source = {rows: [{name: "a"}, {name: "b"}]};
    const next = applyRuntimeValueAtPath(source, "rows/1/name", "z") as typeof source;

    expect(Array.isArray(next.rows)).toBe(true);
    expect(next.rows[1].name).toBe("z");
    expect(next.rows[0]).toBe(source.rows[0]);
    expect(source.rows[1].name).toBe("b");
  });

  it("creates missing containers, choosing an array for a numeric segment", () => {
    expect(applyRuntimeValueAtPath(undefined, "rows/0/name", "x")).toEqual({
      rows: [{name: "x"}],
    });
  });

  it("replaces a primitive standing where a container is needed", () => {
    expect(applyRuntimeValueAtPath("scalar", "a/b", 1)).toEqual({a: {b: 1}});
  });
});

describe("composeRuntimeDataModel", () => {
  it("returns the initial model untouched when there are no overrides", () => {
    const initial = {a: 1};
    expect(composeRuntimeDataModel(initial, {})).toBe(initial);
  });

  it("layers every runtime value over the initial model", () => {
    const composed = composeRuntimeDataModel(
      {user: {name: "Ada"}, count: 1},
      {"user/name": "Grace", count: 7},
    );

    expect(composed).toEqual({user: {name: "Grace"}, count: 7});
  });
});

describe("createBlokRuntimeStore", () => {
  it("recomposes the data model when a runtime value is set and cleared", () => {
    const store = createBlokRuntimeStore({initialDataModel: {user: {name: "Ada"}}});

    store.getState().setRuntimeValue("user/name", "Grace");
    expect(store.getState().dataModel).toEqual({user: {name: "Grace"}});

    store.getState().clearRuntimeValue("user/name");
    expect(store.getState().dataModel).toEqual({user: {name: "Ada"}});
  });

  it("keeps runtime overrides when the initial model is replaced", () => {
    const store = createBlokRuntimeStore({initialDataModel: {a: 1, b: 1}});

    store.getState().setRuntimeValue("b", 99);
    store.getState().setInitialDataModel({a: 2, b: 2});

    expect(store.getState().dataModel).toEqual({a: 2, b: 99});
  });

  it("does not produce a new state object for an unchanged write", () => {
    const store = createBlokRuntimeStore({initialDataModel: {a: 1}});

    store.getState().setRuntimeValue("a", 5);
    const afterFirstWrite = store.getState().dataModel;

    store.getState().setRuntimeValue("a", 5);
    expect(store.getState().dataModel).toBe(afterFirstWrite);
  });

  it("resets runtime values back to the initial model", () => {
    const initial = {a: 1};
    const store = createBlokRuntimeStore({initialDataModel: initial});

    store.getState().setRuntimeValue("a", 2);
    store.getState().resetRuntimeValues();

    expect(store.getState().runtimePathValues).toEqual({});
    expect(store.getState().dataModel).toBe(initial);
  });

  it("drops a mapping once its last interface is cleared", () => {
    const store = createBlokRuntimeStore();

    store.getState().setAgentMappingStateUpdate("dep", "agent-1", "State", {x: 1}, 3);
    store.getState().setAgentMappingStateUpdate("dep", "agent-1", "Other", {y: 2}, 4);

    store.getState().clearAgentMappingStateUpdate("dep", "State");
    expect(Object.keys(store.getState().agentMappingStateUpdates.dep.interfaces)).toEqual([
      "Other",
    ]);

    store.getState().clearAgentMappingStateUpdate("dep", "Other");
    expect(store.getState().agentMappingStateUpdates).toEqual({});
  });

  it("reports a missing catalog instead of throwing when nothing is wired up", () => {
    const result = createBlokRuntimeStore().getState().invokeFunction("nope", {});
    expect(result.ok).toBe(false);
  });
});

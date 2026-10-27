import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyedStore } from "../cache/keyedStore";
import {
  componentStateStore,
  fitsLocal,
  keptComponentId,
  keptLocalsId,
  openBlokPersistence,
  type BlokLocal,
  type KeptComponentState,
  type KeptLocals,
} from "./persist";
import { createBlokRuntimeStore } from "./runtime";

// No IndexedDB in node: the keyed store keeps what it saves in memory, as a window does.
const freshStore = () =>
  createKeyedStore<KeptLocals>({
    db: `test-${Math.random()}`,
    store: "locals",
    version: 1,
    isValue: (value): value is KeptLocals => typeof value === "object" && value !== null,
    label: "test local",
  });

const freshComponentStore = () =>
  createKeyedStore<KeptComponentState>({
    db: `test-components-${Math.random()}`,
    store: "components",
    version: 1,
    isValue: (value): value is KeptComponentState => typeof value === "object" && value !== null && "state" in value,
    label: "test component",
  });

const SCOPE = { hub: "h1", user: "u1", materializedBlok: "7" };
/** The blok's locals: ports plus persist (`Local(default, persist=True)`). */
const LOCALS: BlokLocal[] = [
  { key: "iterations", kind: "INT", default: 15, persist: true },
  { key: "pose", kind: "LIST", default: [1, 0, 0, 0], persist: true },
  { key: "label", kind: "STRING", default: "x" },
];
const DEFAULTS = { iterations: 15, pose: [1, 0, 0, 0], label: "x" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const open = (store: ReturnType<typeof freshStore>, locals = LOCALS) =>
  openBlokPersistence({ scope: SCOPE, locals, store, componentStore: freshComponentStore(), delay: 100 });

/** A runtime as a materialized blok seeds it: the locals at their defaults, the kept values over them. */
const runtimeFor = (initial: KeptLocals, keys: ReadonlySet<string>) =>
  createBlokRuntimeStore({ initialDataModel: DEFAULTS, keptValues: initial, keptRoots: keys });

describe("kept blok locals: Local(persist=True)", () => {
  it("keeps only the locals declared with persist", async () => {
    const persistence = await open(freshStore());
    expect([...persistence.keys].sort()).toEqual(["iterations", "pose"]);
  });

  it("seeds what was kept before the first render, and nothing for a first opening", async () => {
    const store = freshStore();
    const first = await open(store);
    expect(first.initial).toEqual({});

    await store.save(keptLocalsId(SCOPE), "locals", { iterations: 30 });
    const again = await open(store);
    expect(again.initial).toEqual({ iterations: 30 });
    const runtime = runtimeFor(again.initial, again.keys);
    expect((runtime.getState().dataModel as Record<string, unknown>).iterations).toBe(30);
  });

  it("writes a change of a kept local once, after the last change settles", async () => {
    const store = freshStore();
    const save = vi.spyOn(store, "save");
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    const detach = persistence.attach(runtime);

    runtime.getState().setRuntimeValue("pose", [2, 0, 0, 0]);
    runtime.getState().setRuntimeValue("pose.0", 3);
    runtime.getState().setRuntimeValue("label", "not kept");
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ pose: [3, 0, 0, 0] });
    detach();
  });

  it("writes what is pending when the blok closes, and nothing back at the default", async () => {
    const store = freshStore();
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    const detach = persistence.attach(runtime);
    runtime.getState().setRuntimeValue("iterations", 4);
    detach();
    await vi.runAllTimersAsync();
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ iterations: 4 });
  });

  it("keeps the kept locals across a reset of the runtime values", async () => {
    const persistence = await open(freshStore());
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    runtime.getState().setRuntimeValue("pose", [5, 0, 0, 0]);
    runtime.getState().setRuntimeValue("label", "edited");
    runtime.getState().resetRuntimeValues();
    const model = runtime.getState().dataModel as Record<string, unknown>;
    expect(model.pose).toEqual([5, 0, 0, 0]);
    expect(model.label).toBe("x");
  });

  it("forgets every kept local and shows the defaults again", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { pose: [0, 1, 0, 0], iterations: 3 });
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    persistence.attach(runtime);
    await persistence.resetLocals();
    expect((runtime.getState().dataModel as Record<string, unknown>).pose).toEqual(DEFAULTS.pose);
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toBeNull();
  });

  it("drops what no longer persists or no longer fits its port", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { pose: { x: 1 }, iterations: 2.5, label: "kept?", gone: true });
    expect((await open(store)).initial).toEqual({});
    await store.save(keptLocalsId(SCOPE), "locals", { iterations: 2 });
    expect((await open(store)).initial).toEqual({ iterations: 2 });
  });

  it("keeps nothing for another user or hub", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { iterations: 2 });
    const other = await openBlokPersistence({ scope: { ...SCOPE, user: "u2" }, locals: LOCALS, store, componentStore: freshComponentStore() });
    expect(other.initial).toEqual({});
  });

  it("checks a kept value against the local's port", () => {
    expect(fitsLocal(3, { key: "n", kind: "INT" })).toBe(true);
    expect(fitsLocal(3.5, { key: "n", kind: "INT" })).toBe(false);
    expect(fitsLocal(3.5, { key: "n", kind: "FLOAT" })).toBe(true);
    expect(fitsLocal(true, { key: "n", kind: "FLOAT" })).toBe(false);
    expect(fitsLocal("a", { key: "s", kind: "STRING" })).toBe(true);
    expect(fitsLocal({ object: "4", __identifier: "@mikro/image" }, { key: "img", kind: "STRUCTURE", identifier: "@mikro/image" })).toBe(true);
    expect(fitsLocal([1], { key: "l", kind: "LIST" })).toBe(true);
    expect(fitsLocal("x", { key: "l", kind: "LIST" })).toBe(false);
    expect(fitsLocal("fast", { key: "m", kind: "ENUM", choices: [{ value: "fast" }] })).toBe(true);
    expect(fitsLocal("slow", { key: "m", kind: "ENUM", choices: [{ value: "fast" }] })).toBe(false);
    expect(fitsLocal(null, { key: "n", kind: "INT" })).toBe(true);
  });
});

describe("kept component state: persist by stable id", () => {
  it("keeps a component's state per (hub, user, materialized blok, component id)", async () => {
    const store = freshComponentStore();
    const components = componentStateStore(SCOPE, store, 50);
    components.save("main", { camera: [1, 2, 3] });
    expect(await components.load("main")).toBeNull();
    await vi.advanceTimersByTimeAsync(50);
    expect(await components.load("main")).toEqual({ camera: [1, 2, 3] });
    expect(await store.load(keptComponentId(SCOPE, "main"), "component")).toEqual({ state: { camera: [1, 2, 3] } });

    const otherBlok = componentStateStore({ ...SCOPE, materializedBlok: "8" }, store, 50);
    expect(await otherBlok.load("main")).toBeNull();
    const otherUser = componentStateStore({ ...SCOPE, user: "u2" }, store, 50);
    expect(await otherUser.load("main")).toBeNull();
    expect(await components.load("arm-pose")).toBeNull();
  });

  it("forgets what a component kept", async () => {
    const components = componentStateStore(SCOPE, freshComponentStore(), 10);
    components.save("arm-pose", [[1, 0, 0, 0]]);
    await vi.advanceTimersByTimeAsync(10);
    await components.forget("arm-pose");
    expect(await components.load("arm-pose")).toBeNull();
  });
});

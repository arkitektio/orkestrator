import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyedStore } from "../cache/keyedStore";
import { PERSIST_RESET_ALL_FUNCTION, PERSIST_RESET_FUNCTION } from "./functions/persist";
import { keptLocalsId, openBlokPersistence, persistingInvokeFunction, type KeptLocals } from "./persist";
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

const SCOPE = { hub: "h1", user: "u1", materializedBlok: "7" };
const DEMO = { pose: [1, 0, 0, 0], zoom: 1, label: "x" };
const POSE = [{ key: "pose" }, { key: "zoom" }];

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const open = (store: ReturnType<typeof freshStore>, declared = POSE, defaults: Record<string, unknown> = DEMO) =>
  openBlokPersistence({ scope: SCOPE, declared, defaults, store, delay: 100 });

/** A runtime as a materialized blok seeds it: the demo state, the kept values over it. */
const runtimeFor = (initial: KeptLocals, keys: ReadonlySet<string>) =>
  createBlokRuntimeStore({ initialDataModel: DEMO, keptValues: initial, keptRoots: keys });

describe("kept blok locals", () => {
  it("seeds what was kept before the first render, and nothing for a first opening", async () => {
    const store = freshStore();
    const first = await open(store);
    expect(first.initial).toEqual({});

    await store.save(keptLocalsId(SCOPE), "locals", { pose: [0, 1, 0, 0] });
    const again = await open(store);
    expect(again.initial).toEqual({ pose: [0, 1, 0, 0] });
    const runtime = runtimeFor(again.initial, again.keys);
    expect((runtime.getState().dataModel as Record<string, unknown>).pose).toEqual([0, 1, 0, 0]);
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

  it("writes what is pending when the blok closes", async () => {
    const store = freshStore();
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    const detach = persistence.attach(runtime);
    runtime.getState().setRuntimeValue("zoom", 4);
    detach();
    await vi.runAllTimersAsync();
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ zoom: 4 });
  });

  it("keeps the kept locals across a reset of the runtime values", async () => {
    const store = freshStore();
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    runtime.getState().setRuntimeValue("pose", [5, 0, 0, 0]);
    runtime.getState().setRuntimeValue("label", "edited");
    runtime.getState().resetRuntimeValues();
    const model = runtime.getState().dataModel as Record<string, unknown>;
    expect(model.pose).toEqual([5, 0, 0, 0]);
    expect(model.label).toBe("x");
  });

  it("forgets one local or all of them, and shows the defaults again", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { pose: [0, 1, 0, 0], zoom: 3 });
    const persistence = await open(store);
    const runtime = runtimeFor(persistence.initial, persistence.keys);
    persistence.attach(runtime);
    const invoke = persistingInvokeFunction(() => ({ ok: true, value: "inner" }), persistence);

    expect(invoke(PERSIST_RESET_FUNCTION, { key: "pose" })).toEqual({ ok: true, value: undefined });
    await vi.runAllTimersAsync();
    expect((runtime.getState().dataModel as Record<string, unknown>).pose).toEqual(DEMO.pose);
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ zoom: 3 });

    expect(invoke(PERSIST_RESET_FUNCTION, { key: "label" }).ok).toBe(false);
    expect(invoke(PERSIST_RESET_FUNCTION, { key: "pose" }, { requirePure: true }).ok).toBe(false);
    expect(invoke("str.upper", { value: "a" })).toEqual({ ok: true, value: "inner" });

    invoke(PERSIST_RESET_ALL_FUNCTION, {});
    await vi.runAllTimersAsync();
    expect((runtime.getState().dataModel as Record<string, unknown>).zoom).toBe(1);
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toBeNull();
  });

  it("drops what is no longer declared or no longer of its default's shape", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { pose: { x: 1 }, zoom: 2, gone: true });
    const persistence = await open(store);
    expect(persistence.initial).toEqual({ zoom: 2 });
    expect(await store.load(keptLocalsId(SCOPE), "locals")).toEqual({ zoom: 2 });
  });

  it("keeps nothing for another user or hub", async () => {
    const store = freshStore();
    await store.save(keptLocalsId(SCOPE), "locals", { zoom: 2 });
    const other = await openBlokPersistence({ scope: { ...SCOPE, user: "u2" }, declared: POSE, defaults: DEMO, store });
    expect(other.initial).toEqual({});
  });
});

import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { bindAll, bindField, bindFields } from "./bindStore";

type State = { z: number; t: number; dims: Record<string, number>; moving: boolean };
const make = () =>
  createStore<State>(() => ({ z: 0, t: 0, dims: { t: 0, c: 0 }, moving: false }));

describe("bindField", () => {
  it("applies once at bind time, with no previous", () => {
    const store = make();
    const seen: [number, number | undefined][] = [];
    bindField(store, (s) => s.z, (v, p) => seen.push([v, p]));
    expect(seen).toEqual([[0, undefined]]);
  });

  it("re-applies only when the selected scalar changes", () => {
    const store = make();
    const seen: number[] = [];
    bindField(store, (s) => s.z, (v) => seen.push(v));
    store.setState({ t: 5 }); // unrelated
    store.setState({ z: 0 }); // same value
    store.setState({ z: 1 });
    expect(seen).toEqual([0, 1]);
  });

  it("does NOT re-apply for a sibling dim — the tracks bug", () => {
    const store = make();
    const seen: number[] = [];
    // The correct form: latch the ONE dim this layer carries.
    bindField(store, (s) => s.dims.t, (v) => seen.push(v));
    store.setState({ dims: { t: 0, c: 9 } }); // fresh object, c moved, t did not
    expect(seen).toEqual([0]);
    store.setState({ dims: { t: 1, c: 9 } });
    expect(seen).toEqual([0, 1]);
  });

  it("gives an edge-triggered caller a no-op on bind", () => {
    const store = make();
    const settles: number[] = [];
    bindField(store, (s) => s.moving, (moving, previous) => {
      if (previous && !moving) settles.push(1);
    });
    expect(settles).toEqual([]); // bind must not count as a settle
    store.setState({ moving: true });
    store.setState({ moving: false });
    expect(settles).toEqual([1]);
  });

  it("stops on unsubscribe", () => {
    const store = make();
    const seen: number[] = [];
    const off = bindField(store, (s) => s.z, (v) => seen.push(v));
    off();
    store.setState({ z: 7 });
    expect(seen).toEqual([0]);
  });
});

describe("bindFields", () => {
  it("re-applies when any watched scalar changes, once per write", () => {
    const store = make();
    let applies = 0;
    bindFields(store, [(s) => s.dims.t, (s) => s.dims.c], () => { applies += 1; });
    expect(applies).toBe(1);
    store.setState({ z: 3 }); // unwatched
    expect(applies).toBe(1);
    store.setState({ dims: { t: 1, c: 0 } });
    expect(applies).toBe(2);
    store.setState({ dims: { t: 1, c: 4 } });
    expect(applies).toBe(3);
    store.setState({ dims: { t: 1, c: 4 } }); // same values, new object
    expect(applies).toBe(3);
  });
});

describe("bindAll", () => {
  it("applies now and on every write", () => {
    const store = make();
    let applies = 0;
    bindAll(store, () => { applies += 1; });
    expect(applies).toBe(1);
    store.setState({ z: 1 });
    store.setState({ t: 1 });
    expect(applies).toBe(3);
  });
});

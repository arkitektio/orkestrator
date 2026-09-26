// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** A renderer whose compiles resolve only when the test says so. */
const pending: (() => void)[] = [];
const gl = {
  compileAsync: vi.fn(
    () =>
      new Promise<void>((resolve) => {
        pending.push(resolve);
      }),
  ),
};
const three = {
  gl,
  camera: new THREE.PerspectiveCamera(),
  scene: new THREE.Scene(),
  invalidate: vi.fn(),
};
vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: typeof three) => unknown) => select(three),
}));

const { usePrecompiledBundle } = await import("./usePrecompiledBundle");

type Bundle = { material: THREE.Material; name: string };
const makeBundle = (name: string): Bundle => ({ material: new THREE.MeshBasicMaterial(), name });

const flushMicrotasks = () => act(async () => {});
const compileAll = async () => {
  await act(async () => {
    for (const resolve of pending.splice(0)) resolve();
  });
};

describe("usePrecompiledBundle", () => {
  beforeEach(() => {
    pending.length = 0;
    gl.compileAsync.mockClear();
  });

  it("shows a bundle only once it is compiled", async () => {
    const dispose = vi.fn();
    const a = makeBundle("a");
    const { result } = renderHook(() => usePrecompiledBundle(a, dispose, "pool-1"));
    expect(result.current).toBeNull();
    expect(gl.compileAsync).toHaveBeenCalledTimes(1);
    await compileAll();
    expect(result.current).toBe(a);
    expect(dispose).not.toHaveBeenCalled();
  });

  it("keeps the previous bundle up while its successor compiles, then disposes it", async () => {
    const dispose = vi.fn();
    const a = makeBundle("a");
    const b = makeBundle("b");
    const { result, rerender } = renderHook(
      ({ bundle }) => usePrecompiledBundle(bundle, dispose, "pool-1"),
      { initialProps: { bundle: a } },
    );
    await compileAll();
    rerender({ bundle: b });
    await flushMicrotasks();
    expect(result.current).toBe(a);
    expect(dispose).not.toHaveBeenCalled();
    await compileAll();
    await flushMicrotasks();
    expect(result.current).toBe(b);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(a);
  });

  it("never draws a predecessor across a pool structure change", async () => {
    const a = makeBundle("a");
    const b = makeBundle("b");
    const { result, rerender } = renderHook(
      ({ bundle, key }) => usePrecompiledBundle(bundle, vi.fn(), key),
      { initialProps: { bundle: a, key: "pool-1" } },
    );
    await compileAll();
    rerender({ bundle: b, key: "pool-2" });
    expect(result.current).toBeNull();
    await compileAll();
    expect(result.current).toBe(b);
  });

  it("disposes a bundle superseded before it was ever shown, exactly once", async () => {
    const dispose = vi.fn();
    const a = makeBundle("a");
    const b = makeBundle("b");
    const c = makeBundle("c");
    const { rerender, unmount } = renderHook(
      ({ bundle }) => usePrecompiledBundle(bundle, dispose, "pool-1"),
      { initialProps: { bundle: a } },
    );
    rerender({ bundle: b });
    rerender({ bundle: c });
    await flushMicrotasks();
    expect(dispose.mock.calls.map(([x]) => (x as Bundle).name)).toEqual(["a", "b"]);
    await compileAll();
    unmount();
    await flushMicrotasks();
    expect(dispose.mock.calls.map(([x]) => (x as Bundle).name)).toEqual(["a", "b", "c"]);
  });

  it("survives StrictMode's double effect invocation without disposing a live bundle", async () => {
    const dispose = vi.fn();
    const a = makeBundle("a");
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => usePrecompiledBundle(a, dispose, "pool-1"), { wrapper });
    await compileAll();
    await flushMicrotasks();
    expect(result.current).toBe(a);
    expect(dispose).not.toHaveBeenCalled();
  });
});

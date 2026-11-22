// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { preloadable, preloadAll } from "./preloadable";

const Hello = ({ name }: { name: string }) => <p>hello {name}</p>;

describe("preloadable", () => {
  it("renders at once, with no fallback, once preloaded", async () => {
    const load = vi.fn(async () => ({ default: Hello }));
    const Preloaded = preloadable(load);
    await preloadAll();

    render(
      <Suspense fallback={<p>loading</p>}>
        <Preloaded name="ada" />
      </Suspense>,
    );
    // Synchronous: the first commit already shows the component.
    expect(screen.getByText("hello ada")).toBeTruthy();
    expect(screen.queryByText("loading")).toBeNull();
    expect(load).toHaveBeenCalledOnce();
  });

  it("falls back to React.lazy when it was not preloaded", async () => {
    const Lazy = preloadable(async () => ({ default: Hello }));
    render(
      <Suspense fallback={<p>loading</p>}>
        <Lazy name="grace" />
      </Suspense>,
    );
    expect(screen.getByText("loading")).toBeTruthy();
    expect(await screen.findByText("hello grace")).toBeTruthy();
  });

  it("loads once however many ask, and retries a failed load", async () => {
    const load = vi
      .fn<() => Promise<{ default: typeof Hello }>>()
      .mockRejectedValueOnce(new Error("disk said no"))
      .mockResolvedValue({ default: Hello });
    const Flaky = preloadable(load);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await act(() => preloadAll()); // the failure is reported, never thrown
    expect(warn).toHaveBeenCalled();
    await expect(Promise.all([Flaky.preload(), Flaky.preload()])).resolves.toEqual([Hello, Hello]);
    expect(load).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePickerResolution } from "./pickerResolution";

/**
 * The cancellation protocol, which is the whole reason this is shared: a build
 * that loses the race must never reach the GPU, and whatever it allocated must
 * reach `dispose` instead. Four layers spelled this out by hand; only one of
 * them had a test.
 */
const Harness = ({ k, opts }: { k: string | null; opts: never }) => {
  usePickerResolution(k, opts);
  return null;
};

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("usePickerResolution", () => {
  it("applies a build that is still wanted", async () => {
    const apply = vi.fn();
    const opts = { build: async () => "built", apply, reset: vi.fn() } as never;
    render(<Harness k="a" opts={opts} />);
    await waitFor(() => expect(apply).toHaveBeenCalledWith("built"));
  });

  it("resets, and never builds, when the key is null", () => {
    const build = vi.fn();
    const reset = vi.fn();
    render(<Harness k={null} opts={{ build, apply: vi.fn(), reset } as never} />);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(build).not.toHaveBeenCalled();
  });

  it("DISPOSES a superseded build instead of applying it", async () => {
    const first = deferred<string>();
    const apply = vi.fn();
    const dispose = vi.fn();
    const build = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue("second");

    const { rerender } = render(
      <Harness k="a" opts={{ build, apply, reset: vi.fn(), dispose } as never} />,
    );
    // A newer key arrives while the first build is still in flight.
    rerender(<Harness k="b" opts={{ build, apply, reset: vi.fn(), dispose } as never} />);
    first.resolve("first");

    await waitFor(() => expect(apply).toHaveBeenCalledWith("second"));
    expect(apply).not.toHaveBeenCalledWith("first");
    expect(dispose).toHaveBeenCalledWith("first");
  });

  it("does not re-run for an unchanged key", async () => {
    const build = vi.fn().mockResolvedValue("x");
    const opts = { build, apply: vi.fn(), reset: vi.fn() } as never;
    const { rerender } = render(<Harness k="same" opts={opts} />);
    await waitFor(() => expect(build).toHaveBeenCalledTimes(1));
    rerender(<Harness k="same" opts={opts} />);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("tells the build it is no longer wanted", async () => {
    const seen: boolean[] = [];
    const gate = deferred<string>();
    const build = vi
      .fn()
      .mockImplementationOnce(async (ctx: { stillWanted: () => boolean }) => {
        const v = await gate.promise;
        seen.push(ctx.stillWanted());
        return v;
      })
      .mockResolvedValue("second");
    const opts = { build, apply: vi.fn(), reset: vi.fn() } as never;
    const { rerender } = render(<Harness k="a" opts={opts} />);
    rerender(<Harness k="b" opts={opts} />);
    gate.resolve("first");
    await waitFor(() => expect(seen).toEqual([false]));
  });

  it("resets when the build throws, rather than leaving a stale colouring", async () => {
    const reset = vi.fn();
    const onError = vi.fn();
    const opts = {
      build: async () => {
        throw new Error("nope");
      },
      apply: vi.fn(),
      reset,
      onError,
    } as never;
    render(<Harness k="a" opts={opts} />);
    await waitFor(() => expect(reset).toHaveBeenCalled());
    expect(onError).toHaveBeenCalled();
  });

  it("swallows a throw from a build that was already superseded", async () => {
    const first = deferred<string>();
    const reset = vi.fn();
    const build = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue("second");
    const opts = { build, apply: vi.fn(), reset } as never;
    const { rerender } = render(<Harness k="a" opts={opts} />);
    rerender(<Harness k="b" opts={opts} />);
    first.reject(new Error("stale failure"));
    await waitFor(() => expect(build).toHaveBeenCalledTimes(2));
    // The stale rejection must not switch the live colouring off.
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("resetOnError", () => {
  it("keeps the last result when the caller opts out", async () => {
    const reset = vi.fn();
    const onError = vi.fn();
    const opts = {
      build: async () => {
        throw new Error("transient");
      },
      apply: vi.fn(),
      reset,
      onError,
      resetOnError: false,
    } as never;
    render(<Harness k="a" opts={opts} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(reset).not.toHaveBeenCalled();
  });
});

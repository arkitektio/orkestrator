import { describe, expect, it, vi } from "vitest";
import { createModelBlokBatcher } from "./modelBloks";

describe("createModelBlokBatcher", () => {
  it("answers every model asked for in one moment with one request", async () => {
    const load = vi.fn(async (refs: string[]) =>
      [
        { name: "turret", forModel: "sha256:a" },
        { name: "lamp", forModel: "sha256:a" },
        { name: "base", forModel: "sha256:b" },
      ].filter((blok) => refs.includes(blok.forModel)),
    );
    const ask = createModelBlokBatcher(load);

    const [a, b, none] = await Promise.all([ask("sha256:a"), ask("sha256:b"), ask("sha256:c")]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(["sha256:a", "sha256:b", "sha256:c"]);
    expect(a.map((blok) => blok.name)).toEqual(["turret", "lamp"]);
    expect(b.map((blok) => blok.name)).toEqual(["base"]);
    expect(none).toEqual([]);
  });

  it("asks again for what is asked later, and fails every waiter of a failed batch", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([]);
    const ask = createModelBlokBatcher<{ forModel?: string | null }>(load);

    await expect(ask("sha256:a")).rejects.toThrow("down");
    await expect(ask("sha256:a")).resolves.toEqual([]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

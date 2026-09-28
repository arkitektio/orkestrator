import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alias, Instance } from "../fakts/faktsSchema";
import { checkAliasHealth, resolveWorkingAlias } from "./resolve";

const alias = (id: string, host: string): Alias => ({ id, host, ssl: true, challenge: "ht", port: null, path: null });

const instance = (...aliases: Alias[]): Instance => ({ identifier: "3", service: "live.arkitekt.mikro", aliases });

/** Each host answers with a status, or throws (unreachable). */
const serve = (answers: Record<string, number | "unreachable">) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const host = new URL(String(input)).host;
    const answer = answers[host];
    if (answer === undefined || answer === "unreachable") throw new TypeError("Failed to fetch");
    return new Response(null, { status: answer });
  });

afterEach(() => vi.restoreAllMocks());

describe("checkAliasHealth", () => {
  it("is true for an OK answer and false for a bad status", async () => {
    serve({ "a.example": 200, "b.example": 502 });
    const controller = new AbortController();
    expect(await checkAliasHealth(alias("1", "a.example"), 1000, controller)).toBe(true);
    expect(await checkAliasHealth(alias("2", "b.example"), 1000, controller)).toBe(false);
  });

  it("treats an unreachable alias as a no, not an error", async () => {
    serve({});
    expect(await checkAliasHealth(alias("1", "gone.example"), 1000, new AbortController())).toBe(false);
  });

  it("still throws when the caller cancels", async () => {
    serve({});
    const controller = new AbortController();
    controller.abort();
    await expect(checkAliasHealth(alias("1", "gone.example"), 1000, controller)).rejects.toThrow();
  });
});

describe("resolveWorkingAlias", () => {
  it("falls through an unreachable alias to one that answers", async () => {
    serve({ "mesh.example": "unreachable", "public.example": 200 });
    const resolved = await resolveWorkingAlias({
      instance: instance(alias("1", "mesh.example"), alias("2", "public.example")),
      controller: new AbortController(),
    });
    expect(resolved.id).toBe("2");
  });

  it("names the service when no alias answers", async () => {
    serve({ "a.example": 500 });
    await expect(
      resolveWorkingAlias({ instance: instance(alias("1", "a.example")), controller: new AbortController() }),
    ).rejects.toThrow("No working alias found for service: live.arkitekt.mikro");
  });
});

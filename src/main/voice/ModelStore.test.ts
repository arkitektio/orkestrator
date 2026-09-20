import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelStore } from "./ModelStore";

/** A fetch that serves in-memory bodies and honours Range. */
const fakeFetch = (files: Record<string, string>, options: { ranges?: boolean; fail?: string[] } = {}) => {
  const calls: { url: string; range?: string }[] = [];
  const impl = vi.fn(async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, range: headers.Range });
    if (options.fail?.includes(url)) return new Response(null, { status: 500 });
    const body = files[url];
    if (body === undefined) return new Response(null, { status: 404 });
    const range = headers.Range && options.ranges !== false ? /bytes=(\d+)-/.exec(headers.Range) : null;
    const from = range ? Number(range[1]) : 0;
    const slice = body.slice(from);
    return new Response(slice, {
      status: range ? 206 : 200,
      headers: { "content-length": String(Buffer.byteLength(slice)) },
    });
  });
  return { impl: impl as unknown as typeof fetch, calls };
};

describe("ModelStore", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "voice-models-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const plan = {
    id: "m",
    files: [
      { name: "a.onnx", url: "https://h/a.onnx" },
      { name: "tokens.txt", url: "https://h/tokens.txt" },
    ],
  };

  it("downloads every file, writes the manifest and reports progress", async () => {
    const { impl } = fakeFetch({ "https://h/a.onnx": "A".repeat(2000), "https://h/tokens.txt": "tok" });
    const store = new ModelStore(root, impl);
    const progress: number[] = [];

    expect(await store.isComplete(plan)).toBe(false);
    const dir = await store.ensure(plan, { onProgress: (p) => progress.push(p.fileIndex) });

    expect(dir).toBe(join(root, "m"));
    expect(await readFile(join(dir, "tokens.txt"), "utf8")).toBe("tok");
    expect((await stat(join(dir, "a.onnx"))).size).toBe(2000);
    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.files).toEqual({ "a.onnx": 2000, "tokens.txt": 3 });
    expect(await store.isComplete(plan)).toBe(true);
    expect(progress).toContain(0);
    expect(progress).toContain(1);
    expect((await store.list(["m", "other"]))).toEqual([
      { id: "m", downloaded: true, bytes: expect.any(Number) },
      { id: "other", downloaded: false, bytes: 0 },
    ]);
  });

  it("is a no-op once complete and does not fetch again", async () => {
    const { impl, calls } = fakeFetch({ "https://h/a.onnx": "A", "https://h/tokens.txt": "t" });
    const store = new ModelStore(root, impl);
    await store.ensure(plan);
    const before = calls.length;
    await store.ensure(plan);
    expect(calls.length).toBe(before);
  });

  it("resumes a partial file with a Range request and appends", async () => {
    const { impl, calls } = fakeFetch({ "https://h/a.onnx": "0123456789", "https://h/tokens.txt": "t" });
    const store = new ModelStore(root, impl);
    const dir = store.dir("m");
    await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
    await writeFile(join(dir, "a.onnx.part"), "0123");

    await store.ensure(plan);
    expect(calls.find((call) => call.url.endsWith("a.onnx"))?.range).toBe("bytes=4-");
    expect(await readFile(join(dir, "a.onnx"), "utf8")).toBe("0123456789");
  });

  it("starts over when the server ignores the range", async () => {
    const { impl } = fakeFetch({ "https://h/a.onnx": "0123456789", "https://h/tokens.txt": "t" }, { ranges: false });
    const store = new ModelStore(root, impl);
    const dir = store.dir("m");
    await (await import("node:fs/promises")).mkdir(dir, { recursive: true });
    await writeFile(join(dir, "a.onnx.part"), "junk");

    await store.ensure(plan);
    expect(await readFile(join(dir, "a.onnx"), "utf8")).toBe("0123456789");
  });

  it("skips files that already landed and fails loudly on a bad status", async () => {
    const { impl, calls } = fakeFetch({ "https://h/a.onnx": "A" }, { fail: ["https://h/tokens.txt"] });
    const store = new ModelStore(root, impl);
    await expect(store.ensure(plan)).rejects.toThrow(/500/);
    expect(await store.isComplete(plan)).toBe(false);

    // The good file stays; a retry only asks for the missing one.
    const retry = fakeFetch({ "https://h/tokens.txt": "t" });
    const again = new ModelStore(root, retry.impl);
    await again.ensure(plan);
    expect(retry.calls.map((call) => call.url)).toEqual(["https://h/tokens.txt"]);
    expect(calls.length).toBe(2);
  });

  it("aborts on the signal and removes on request", async () => {
    const { impl } = fakeFetch({ "https://h/a.onnx": "A".repeat(100), "https://h/tokens.txt": "t" });
    const store = new ModelStore(root, impl);
    const controller = new AbortController();
    controller.abort();
    await expect(store.ensure(plan, { signal: controller.signal })).rejects.toThrow();

    await store.ensure(plan);
    await store.remove("m");
    expect(await store.manifest("m")).toBeUndefined();
    expect((await store.list(["m"]))[0].bytes).toBe(0);
  });
});

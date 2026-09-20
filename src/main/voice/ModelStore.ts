import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { DownloadPlan } from "./catalog";
import type { VoiceModelProgress, VoiceModelState } from "./protocol";

/**
 * Speech models on disk: `<rootDir>/<modelId>/<file>`, one directory per
 * catalog entry, with a `manifest.json` written only once every file has
 * landed. That manifest is the single definition of "downloaded"; a directory
 * without one is a download in progress or one that was interrupted.
 *
 * Downloads are per file and resumable: a file streams into `<name>.part`
 * with a `Range` header picking up wherever a previous attempt stopped, and is
 * renamed into place only when the stream ends — the same `.part` → rename the
 * big-file download service uses, for the same reason (a crash mid-write must
 * not leave a truncated file that looks complete).
 *
 * No Electron imports: the root directory and `fetch` are injected, so this
 * runs unchanged under vitest against a temp dir and a fake fetch.
 */

const MANIFEST = "manifest.json";
const PROGRESS_INTERVAL_MS = 250;

export type Manifest = {
  id: string;
  files: Record<string, number>;
  completedAt: string;
};

export type EnsureOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: VoiceModelProgress) => void;
};

export class ModelStore {
  private readonly active = new Map<string, AbortController>();

  constructor(
    private readonly rootDir: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  dir(id: string): string {
    return join(this.rootDir, id);
  }

  async manifest(id: string): Promise<Manifest | undefined> {
    try {
      const raw = await readFile(join(this.dir(id), MANIFEST), "utf8");
      const parsed = JSON.parse(raw) as Manifest;
      return parsed && typeof parsed === "object" && parsed.id === id ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  async isComplete(plan: DownloadPlan): Promise<boolean> {
    const manifest = await this.manifest(plan.id);
    if (!manifest) return false;
    for (const file of plan.files) {
      if (!(file.name in manifest.files)) return false;
      try {
        const info = await stat(join(this.dir(plan.id), file.name));
        if (info.size !== manifest.files[file.name]) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  /** Every id with a directory, complete or not, and its size on disk. */
  async list(ids: readonly string[]): Promise<VoiceModelState[]> {
    const states: VoiceModelState[] = [];
    for (const id of ids) {
      const dir = this.dir(id);
      let bytes = 0;
      try {
        for (const name of await readdir(dir)) {
          bytes += (await stat(join(dir, name))).size;
        }
      } catch {
        // No directory yet.
      }
      states.push({ id, downloaded: (await this.manifest(id)) !== undefined, bytes });
    }
    return states;
  }

  /**
   * Make every file of `plan` present and return its directory. Already
   * complete → returns at once. A second `ensure` for an id that is downloading
   * aborts the first; the caller decides whether that is a retry or a change.
   */
  async ensure(plan: DownloadPlan, options: EnsureOptions = {}): Promise<string> {
    const dir = this.dir(plan.id);
    if (await this.isComplete(plan)) return dir;

    this.cancel(plan.id);
    const controller = new AbortController();
    this.active.set(plan.id, controller);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();

    try {
      await mkdir(dir, { recursive: true });
      const sizes: Record<string, number> = {};
      for (let index = 0; index < plan.files.length; index++) {
        controller.signal.throwIfAborted();
        const file = plan.files[index];
        sizes[file.name] = await this.fetchFile(dir, file, {
          signal: controller.signal,
          report: (loaded, total) =>
            options.onProgress?.({
              modelId: plan.id,
              file: file.name,
              fileIndex: index,
              fileCount: plan.files.length,
              loaded,
              total,
            }),
        });
      }
      const manifest: Manifest = { id: plan.id, files: sizes, completedAt: new Date().toISOString() };
      await writeFile(join(dir, MANIFEST), JSON.stringify(manifest, null, 2));
      return dir;
    } finally {
      options.signal?.removeEventListener("abort", onAbort);
      if (this.active.get(plan.id) === controller) this.active.delete(plan.id);
    }
  }

  cancel(id: string): void {
    this.active.get(id)?.abort();
    this.active.delete(id);
  }

  async remove(id: string): Promise<void> {
    this.cancel(id);
    await rm(this.dir(id), { recursive: true, force: true });
  }

  private async fetchFile(
    dir: string,
    file: { name: string; url: string },
    { signal, report }: { signal: AbortSignal; report: (loaded: number, total: number) => void },
  ): Promise<number> {
    const finalPath = join(dir, file.name);
    const partPath = `${finalPath}.part`;

    // A finished file from an earlier, interrupted run (the manifest is only
    // written at the very end, so its siblings may still be missing).
    try {
      const done = await stat(finalPath);
      report(done.size, done.size);
      return done.size;
    } catch {
      // Not there yet.
    }

    let offset = 0;
    try {
      offset = (await stat(partPath)).size;
    } catch {
      offset = 0;
    }

    const headers: Record<string, string> = {};
    if (offset > 0) headers.Range = `bytes=${offset}-`;

    const response = await this.fetchImpl(file.url, { headers, signal, redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}) for ${file.url}`);
    }
    if (!response.body) {
      throw new Error(`Empty response for ${file.url}`);
    }

    // 206 continues the partial file; anything else (server ignored the range)
    // starts over.
    const resumed = response.status === 206 && offset > 0;
    if (!resumed) offset = 0;
    const length = Number(response.headers.get("content-length") ?? 0);
    const total = length > 0 ? offset + length : 0;

    let loaded = offset;
    let lastReport = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        loaded += chunk.length;
        const now = Date.now();
        if (now - lastReport >= PROGRESS_INTERVAL_MS) {
          lastReport = now;
          report(loaded, total);
        }
        callback(null, chunk);
      },
    });

    const body = Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream);
    await pipeline(body, counter, createWriteStream(partPath, { flags: resumed ? "a" : "w" }), { signal });

    await rename(partPath, finalPath);
    report(loaded, loaded);
    return loaded;
  }
}

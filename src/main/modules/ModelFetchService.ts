import {app, ipcMain} from 'electron';
import {createHash, randomUUID} from 'crypto';
import {lookup} from 'dns/promises';
import fs from 'fs/promises';
import path from 'path';
import {AppModule} from './AppModule';
import {checkSource, SourceRefused} from './modelSource';

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 120_000;

export type FetchedModel =
  | {ok: true; path: string; ref: string; size: number; bytes: Uint8Array}
  | {ok: false; code: string; message: string};

/**
 * Fetches a model from the URL a blok names, for an admin who asked to add it.
 *
 * Runs in main so that the source host needs no CORS headers. The file is
 * hashed while it downloads and kept in a temporary file the datalayer upload
 * reads from; nothing is uploaded here.
 */
export class ModelFetchService implements AppModule {
  private readonly directory = path.join(app.getPath('temp'), 'orkestrator-models');

  constructor() {
    ipcMain.handle('model:fetch', (_event, args: {url: string; maxSize: number; allowPrivate?: boolean}) =>
      this.fetch(args).catch(
        (error: Error): FetchedModel => ({
          ok: false,
          code: error instanceof SourceRefused ? error.code : 'fetch_failed',
          message: error.message,
        }),
      ),
    );
    ipcMain.handle('model:discard', (_event, args: {path: string}) => this.discard(args.path));
  }

  setup() {
    // Required for implementing AppModule
  }

  private async resolved(url: URL): Promise<string[]> {
    try {
      return (await lookup(url.hostname.replace(/^\[|\]$/g, ''), {all: true})).map(entry => entry.address);
    } catch {
      return [];
    }
  }

  private async fetch(args: {url: string; maxSize: number; allowPrivate?: boolean}): Promise<FetchedModel> {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
    try {
      let location = args.url;
      let response: Response | undefined;
      // Redirects are followed by hand: every hop is held to the same rules as the first.
      for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const parsed = checkSource(location, [], true);
        const url = checkSource(location, await this.resolved(parsed), args.allowPrivate ?? false);
        response = await fetch(url, {redirect: 'manual', credentials: 'omit', signal: abort.signal});
        const next = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
        if (!next) break;
        location = new URL(next, url).href;
        response = undefined;
      }
      if (!response) return {ok: false, code: 'fetch_failed', message: 'The source redirects too many times.'};
      if (!response.ok || !response.body) {
        return {ok: false, code: 'fetch_failed', message: `The source answered ${response.status}.`};
      }
      const declared = Number(response.headers.get('content-length'));
      if (declared > args.maxSize) {
        return {ok: false, code: 'too_large', message: `The model is ${declared} bytes, over the limit of ${args.maxSize}.`};
      }

      const hash = createHash('sha256');
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body.getReader();
      for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > args.maxSize) {
          await reader.cancel();
          return {ok: false, code: 'too_large', message: `The model is over the limit of ${args.maxSize} bytes.`};
        }
        hash.update(value);
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      await fs.mkdir(this.directory, {recursive: true});
      const file = path.join(this.directory, `${randomUUID()}.glb`);
      await fs.writeFile(file, bytes);
      return {ok: true, path: file, ref: `sha256:${hash.digest('hex')}`, size, bytes};
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Remove a file this service wrote; any other path is left alone. */
  private async discard(file: string): Promise<void> {
    if (path.dirname(path.resolve(file)) !== this.directory) return;
    await fs.rm(file, {force: true});
  }
}

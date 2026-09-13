import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, shell, IpcMainEvent } from "electron";
import { resolve, join } from "path";
import icon from "../../resources/icon.png?asset";
import { machineId } from "node-machine-id";

// Import custom modules
import { AgentGateway } from "./gateway";
import { registerIssueIpc } from "./issue-reporter";
import { IpcTransport } from "./modules/IpcTransport";
import { WindowManager } from "./modules/WindowManager";
import { AppUpdater } from "./modules/AppUpdater";
import { DownloadManager } from "./modules/DownloadManager";
import { AppManager } from "./modules/AppManager";
import { UploadService } from "./modules/UploadService";
import { BigFileUploadService } from "./modules/BigFileUploadService";
import { BigFileDownloadService } from "./modules/BigFileDownloadService";
import { session, protocol } from "electron";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { normalize, sep } from "node:path";
import { Readable } from "node:stream";
import { ShellService } from "./modules/ShellService";
import { APP_ORIGIN, APP_SCHEME } from "./scheme";

// Minimal extension -> MIME map for the app:// static file handler. Kept inline
// to avoid adding a dependency. text/javascript for .js/.mjs is mandatory (ES
// module scripts are rejected otherwise) and application/wasm is required for
// WebAssembly.instantiateStreaming (zarr codecs, duckdb-wasm).
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".data": "application/octet-stream",
  ".txt": "text/plain",
};

function mimeForPath(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

// Vite emits content-hashed filenames under /assets/ (and some plugins emit
// `name.<hash>.ext` / `name-<hash>.ext` elsewhere); those bytes never change
// for a given URL, so the session cache may keep them forever. index.html is
// the one entry point whose content changes between app versions under the
// same URL, so it must always be revalidated.
const HASHED_ASSET_RE = /[.-][a-f0-9]{8,}\./;

function cacheControlFor(pathname: string): string {
  if (pathname === "/index.html") return "no-cache";
  if (pathname.startsWith("/assets/") || HASHED_ASSET_RE.test(pathname)) {
    return "public, max-age=31536000, immutable";
  }
  return "no-cache";
}

// Origin of the Vite dev server that serves the renderer document in
// development (see WindowManager.createMainWindow), or null when packaged.
function rendererDevOrigin(): string | null {
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (!is.dev || !devUrl) return null;
  try {
    return new URL(devUrl).origin;
  } catch {
    return null;
  }
}

// The machine id is read via a child process (ioreg / wmic / dbus); resolve it
// once and hand every `get-node-id` request the same promise instead of
// blocking the main thread with `machineIdSync` per call.
let nodeIdPromise: Promise<string> | null = null;
function getNodeId(): Promise<string> {
  if (!nodeIdPromise) {
    nodeIdPromise = machineId(true).catch((error) => {
      // Do not memoize a failure — let the next call retry.
      nodeIdPromise = null;
      throw error;
    });
  }
  return nodeIdPromise;
}

// Register the custom `app://` scheme (see ./scheme) as standard + secure. This
// MUST run before the app 'ready' event, hence at module top-level.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.commandLine.appendSwitch("ignore-certificate-errors", "true");
// The scene renderer requires WebGPU and no longer has a WebGL2 fallback — a
// machine without it gets an explicit "cannot be rendered" message from the
// scene rather than a degraded picture. This Chromium enables WebGPU by default
// on every platform we ship (Metal / D3D / Vulkan), so no switches are needed
// here; if that regresses, this is where the flags would go.

// Core Services
const appManager = new AppManager();
const transport = new IpcTransport();
const windowManager = new WindowManager(transport);
const appUpdater = new AppUpdater(transport, windowManager);
const downloadManager = new DownloadManager(transport);
const uploadService = new UploadService(transport);
const bigFileUploadService = new BigFileUploadService(transport);
const bigFileDownloadService = new BigFileDownloadService(transport);
const shellService = new ShellService(transport);

appManager.register(windowManager);
appManager.register(appUpdater);
appManager.register(downloadManager);
appManager.register(uploadService);
appManager.register(bigFileUploadService);
appManager.register(bigFileDownloadService);
appManager.register(shellService);

let electronAgent: AgentGateway | null = null;

// Handle default protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("orkestrator", process.execPath, [
      resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("orkestrator");
}

function maybeInstallReactDevTools() {
  if (!is.dev || process.env.ENABLE_ELECTRON_REACT_DEVTOOLS !== "1") {
    return;
  }

  import("electron-devtools-installer")
    .then((installer) => {
      const install = installer.default?.installExtension || installer.installExtension || installer.default;
      return install(installer.REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: { allowFileAccess: true },
      });
    })
    .then((name) => console.log(`Added Extension: ${name}`))
    .catch((err) => console.log("Failed to install React DevTools", err));
}

// NOTE: Apollo Client DevTools (the browser extension) cannot render its panel
// in Electron — the inspector crashes initializing the renderer for the
// extension's `devtools_page` (`renderer_init: object null is not iterable`),
// an Electron bug that also affects other devtools-panel extensions (Angular,
// Audion). The client is instead exposed via `window.__APOLLO_CLIENT__` in dev
// (see `devtools.enabled` in graphQlServiceBuidler.tsx) for console inspection.

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Let the AppManager handle the core initialization
  appManager.setup();

  app.whenReady().then(() => {
    registerIssueIpc();
    // COOP/COEP injection for the renderer document + its same-origin assets.
    //
    // Only the app's OWN origin(s) go through this listener. COOP/COEP are
    // document-level policies — a zarr chunk GET from S3 gains nothing from
    // them — yet an unfiltered `onHeadersReceived` makes EVERY response in the
    // session (every chunk fetch from every codec worker) take a main-process
    // IPC round trip before the bytes are released. The URL filter confines
    // that cost to the handful of document/asset requests.
    //
    // In development the document is served by Vite at ELECTRON_RENDERER_URL,
    // not by the app:// handler, so the dev origin MUST be in the filter or
    // the dev build silently loses crossOriginIsolated (and SharedArrayBuffer).
    const devOrigin = rendererDevOrigin();
    const coopCoepFilter: Electron.WebRequestFilter = {
      urls: [`${APP_ORIGIN}/*`, ...(devOrigin ? [`${devOrigin}/*`] : [])],
    };
    const injectCoopCoep = (
      details: Electron.OnHeadersReceivedListenerDetails,
      callback: (response: Electron.HeadersReceivedResponse) => void,
    ) => {
      // Strip any pre-existing COOP/COEP before re-adding: the app:// protocol
      // handler already sets them (lowercased by Headers), so a plain spread
      // would emit the header twice ("require-corp, require-corp"). COOP/COEP
      // are structured single-item headers — a duplicated value is INVALID and
      // Chromium then ignores the header entirely, silently breaking
      // crossOriginIsolated (and thus SharedArrayBuffer) in the packaged app.
      const responseHeaders = Object.fromEntries(
        Object.entries(details.responseHeaders ?? {}).filter(
          ([key]) => !["cross-origin-embedder-policy", "cross-origin-opener-policy"].includes(key.toLowerCase())
        )
      )
      callback({
        responseHeaders: {
          ...responseHeaders,
          'Cross-Origin-Embedder-Policy': ['require-corp'],
          'Cross-Origin-Opener-Policy': ['same-origin']
        }
      })
    };
    try {
      session.defaultSession.webRequest.onHeadersReceived(coopCoepFilter, injectCoopCoep);
    } catch (error) {
      // An unparseable URL pattern throws synchronously. Losing cross-origin
      // isolation is far worse than paying the per-response tax, so fall back
      // to the unfiltered listener rather than crash at startup.
      console.warn("COOP/COEP header filter rejected; using unfiltered listener", error);
      session.defaultSession.webRequest.onHeadersReceived(injectCoopCoep);
    }

    // Serve the packaged renderer from the custom `app://` scheme (registered
    // as standard + secure above) instead of file://. Returning the COOP/COEP
    // trio on this real, secure origin is what makes the document
    // cross-origin isolated, so SharedArrayBuffer is available for the
    // worker-accelerated zarr chunk decoding pipeline. The renderer uses
    // HashRouter, so the only document ever requested is index.html; every
    // other request is a static asset relative to it.
    const rendererRoot = normalize(join(__dirname, "../renderer"))
    protocol.handle(APP_SCHEME, async (request) => {
      const url = new URL(request.url)
      let pathname = decodeURIComponent(url.pathname)
      if (pathname === "/" || pathname === "") pathname = "/index.html"

      // Confine every read to the renderer root (path-traversal guard).
      const filePath = normalize(join(rendererRoot, pathname))
      if (filePath !== rendererRoot && !filePath.startsWith(rendererRoot + sep)) {
        return new Response("Forbidden", { status: 403 })
      }

      // Existence is checked up front: once the Response has been handed to
      // Chromium a stream error can no longer become a 404.
      let fileStat: Awaited<ReturnType<typeof stat>>
      try {
        fileStat = await stat(filePath)
      } catch {
        return new Response("Not Found", { status: 404 })
      }
      if (!fileStat.isFile()) {
        return new Response("Not Found", { status: 404 })
      }

      const headers = new Headers({
        "Content-Type": mimeForPath(filePath),
        "Content-Length": String(fileStat.size),
        "Cache-Control": cacheControlFor(pathname),
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Resource-Policy": "same-origin",
      })
      // Stream the file instead of buffering it whole: the multi-MB wasm and
      // JS bundles start flowing to the renderer immediately and never sit
      // twice in main-process memory.
      const body = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream
      return new Response(body, { status: 200, headers })
    })

    windowManager.createMainWindow(icon);

    // Warm the memoized machine id so the first `get-node-id` is a cache hit.
    void getNodeId().catch(() => {});

    if (!electronAgent) {
      // NOTE: AgentGateway assumes ipcMain is available, we could refactor it too,
      // but for now we leave it as is or pass standard ipcMain (which it imports directly).
      const { ipcMain } = require('electron');
      electronAgent = new AgentGateway(ipcMain);
    }

    // Handle deep link on Windows/Linux when app starts
    if (process.platform !== 'darwin') {
      const url = process.argv.find(arg => arg.startsWith('orkestrator://'));
      if (url) {
        windowManager.handleOrkestratorUrl(url);
      }
    }

    

  });
}

// App event lifecycle overrides
// app.on("window-all-closed", ...) is handled by the AppManager.

app.on("certificate-error", (event, _, __, ___, ____, callback) => {
  event.preventDefault();
  // Check if we this is a certificate error we want to ignore (you can add more logic here if needed)
  // By default we should only ignore errors for the configure fakt domains, but for now we ignore all to avoid issues with self-signed certs in development and testing
  callback(true);
});

app.whenReady().then(() => {
  maybeInstallReactDevTools();
  electronApp.setAppUserModelId("com.electron");

  import("electron").then(({ session }) => {
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'clipboard-read' || permission === 'clipboard-sanitized-write') {
        return true;
      }
      return true;
    });
  });

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Remaining general IPC handlers
  transport.onChannel("ping", () => {
    console.log("ping received");
  });

  transport.handleChannel("open-webbrowser", async (_, url: string) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error("Failed to open URL in web browser:", error);
    }
  });

  transport.onChannel("fakts-start", (_: IpcMainEvent, msg) => {
    shell.openExternal(msg);
  });

  transport.onChannel("ondragstart", async (event, structure) => {
    // Async write: a sync write here stalls the main process (and thus every
    // IPC in flight) at the exact moment the user starts dragging.
    const structurePath = join(__dirname, "structure.md");
    try {
      await writeFile(structurePath, structure);
    } catch (error) {
      console.error("Failed to write drag payload:", error);
      return;
    }
    if (event.sender.isDestroyed()) return;
    event.sender.startDrag({
      file: structurePath,
      icon: icon as unknown as string | Electron.NativeImage,
    });
  });

  transport.handleChannel("get-node-id", () => getNodeId());
});

if (process.platform == "darwin") {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    windowManager.handleOrkestratorUrl(url);
  });
}


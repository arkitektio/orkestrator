import { contextBridge, ipcRenderer, webUtils } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { Assign } from "../main/message";
import type { ChromeTheme, ChromeThemeSource, WindowChromeState } from "../main/modules/WindowManager";
import {
  DOCTOR_MESH_CHANNEL,
  DOCTOR_NETWORK_CHANNEL,
  DOCTOR_REMEDY_CHANNEL,
} from "../main/doctor/protocol";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeNetworkRequest,
  RemedyId,
  RemedyResult,
} from "../main/doctor/protocol";
import type {
  VoiceCatalogEntry,
  VoiceEvent,
  VoiceModelState,
  VoicePortsPayload,
  VoiceStartConfig,
  VoiceStatusPayload,
} from "../main/voice/protocol";
import {
  MESH_CLAIM_CHANNEL,
  MESH_EVENT_CHANNEL,
  MESH_PING_CHANNEL,
  MESH_STATUS_CHANNEL,
  type MeshClaimRequest,
  type MeshEvent,
  type MeshPingRequest,
  type MeshPingResult,
  type MeshStatusPayload,
} from "../main/mesh/protocol";

// Subscribe `cb` to an ipcRenderer channel and return the disposer. Every
// event listener exposed to the renderer must be removable, otherwise each
// React remount stacks another listener on the shared ipcRenderer.
const subscribe = <T,>(channel: string, cb: (payload: T) => void): (() => void) => {
  const listener = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

// Custom APIs for renderer
const api = {
  getFilePath: (file: File) => {
    return webUtils.getPathForFile(file);
  },
  startFakts: async (url: string) => {
    return ipcRenderer.send("fakts-start", url);
  },
  inspectElectronAgent: () =>
    ipcRenderer.invoke("agent:inspect-electron-agent"),

  downloadFromUrl: (url: string) =>
    ipcRenderer.invoke("download-from-url", { url }),
  startDrag: (structure) => {
    ipcRenderer.send("ondragstart", structure);
  },
  openSecondWindow: (path: string) => {
    ipcRenderer.send("open-second-window", path);
  },
  getNodeId: () => ipcRenderer.invoke("get-node-id"),
  /**
   * The renderer draws the title bar, so it needs the frame's controls and its
   * state. `onStateChanged` returns a disposer for the reason `subscribe`
   * documents: without it every React remount stacks another listener on the
   * shared ipcRenderer.
   */
  windowControls: {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:maximize-toggle"),
    close: () => ipcRenderer.send("window:close"),
    getState: () => ipcRenderer.invoke("window:get-state"),
    onStateChanged: (cb: (state: WindowChromeState) => void) =>
      subscribe<WindowChromeState>("window:state-changed", cb),
    /**
     * The frame has parts the renderer cannot paint — the background Chromium
     * shows during a resize, the Windows overlay glyphs — so it is told the
     * resolved theme and colours them itself.
     */
    setTheme: (theme: ChromeTheme, source?: ChromeThemeSource) =>
      ipcRenderer.send("window:set-theme", theme, source),
    /**
     * The translucent sidebar is the OS blurring the desktop behind the
     * window, which only main can switch on (`vibrancy` / `backgroundMaterial`).
     * Global: one preference, every window follows it.
     */
    setRailGlass: (enabled: boolean) => ipcRenderer.send("window:set-rail-glass", enabled),
  },
  /**
   * Deep links land here: main asks the renderer to open a path as a tab
   * rather than spawning a window. Returns a disposer, like every listener.
   */
  tabs: {
    onOpen: (cb: (payload: { path: string }) => void) =>
      subscribe<{ path: string }>("tabs:open", cb),
  },
  reloadWindow: () => ipcRenderer.invoke("reload-window"),
  forceReloadWindow: () => ipcRenderer.invoke("force-reload-window"),
  openDevTools: () => ipcRenderer.invoke("open-devtools"),
  setZoomLevel: (zoomLevel: number) => ipcRenderer.invoke("set-zoom-level", zoomLevel),
  getZoomLevel: () => ipcRenderer.invoke("get-zoom-level"),
  openWebbrowser: (url: string) => ipcRenderer.invoke("open-webbrowser", url),
  reportIssue: (opts: {
    title?: string;
    extra?: string;
    includeScreenshot?: boolean;
    labels?: string[];
    template?: string;
  }) => ipcRenderer.invoke("arkitekt.reportIssue", opts),
  openFilePicker: () => ipcRenderer.invoke("dialog:openFile"),
  uploadBigFile: (opts: { uploadId: string; path: string; grant: any; endpointUrl: string }) => ipcRenderer.invoke("upload:bigFile", opts),
  cancelBigFile: (opts: { uploadId: string; }) => ipcRenderer.invoke("upload:cancel", opts),
  downloadBigFile: (opts: { downloadId: string; grant: any; endpointUrl: string; fileName: string; savePath?: string; }) => ipcRenderer.invoke("download:bigFile", opts),
  cancelBigFileDownload: (opts: { downloadId: string; }) => ipcRenderer.invoke("download:cancel", opts),
  showItemInFolder: (path: string) => ipcRenderer.invoke("shell:showItemInFolder", { path }),
  openPath: (path: string) => ipcRenderer.invoke("shell:openPath", { path }),
  onDownloadProgress: (downloadId: string, cb: (data: any) => void) => {
    const channel = `download-progress-${downloadId}`;
    const listener = (_e: any, data: any) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onDownloadError: (downloadId: string, cb: (data: any) => void) => {
    const channel = `download-error-${downloadId}`;
    const listener = (_e: any, data: any) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onUploadProgress: (uploadId: string, cb: (data: any) => void) => {
    const channel = `upload-progress-${uploadId}`;
    const listener = (_e: any, data: any) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onUploadError: (uploadId: string, cb: (data: any) => void) => {
    const channel = `upload-error-${uploadId}`;
    const listener = (_e: any, data: any) => cb(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  /**
   * Voice input. The engine lives in the main process (a utilityProcess with
   * the speech model); the renderer starts and stops it, asks for a session's
   * MessagePorts, and hears every state change through `onEvent`. The ports
   * themselves arrive through `window.postMessage` (see the bottom of this
   * file), not through this bridge.
   */
  voice: {
    start: (config: VoiceStartConfig): Promise<VoiceStatusPayload> =>
      ipcRenderer.invoke("voice:start", config),
    stop: (): Promise<VoiceStatusPayload> => ipcRenderer.invoke("voice:stop"),
    status: (): Promise<VoiceStatusPayload> => ipcRenderer.invoke("voice:status"),
    catalog: (): Promise<VoiceCatalogEntry[]> => ipcRenderer.invoke("voice:catalog"),
    requestPorts: (): Promise<VoicePortsPayload> => ipcRenderer.invoke("voice:request-ports"),
    onEvent: (cb: (event: VoiceEvent) => void) => subscribe<VoiceEvent>("voice:event", cb),
    models: {
      list: (): Promise<VoiceModelState[]> => ipcRenderer.invoke("voice:models:list"),
      ensure: (args: { modelId: string; modelHost?: string }): Promise<VoiceModelState[]> =>
        ipcRenderer.invoke("voice:models:ensure", args),
      remove: (args: { modelId: string }): Promise<VoiceModelState[]> =>
        ipcRenderer.invoke("voice:models:remove", args),
      cancel: (args: { modelId: string }): Promise<void> =>
        ipcRenderer.invoke("voice:models:cancel", args),
    },
  },
  /**
   * Connection diagnostics. The renderer cannot tell a DNS failure from a
   * refused connection from a rejected certificate — `fetch` reports all three
   * as "Failed to fetch" — so the probing happens in main and the renderer
   * only interprets the results. `runRemedy` takes an id from a closed
   * allowlist, never a command.
   */
  doctor: {
    probeNetwork: (request: ProbeNetworkRequest): Promise<NetworkProbeResult[]> =>
      ipcRenderer.invoke(DOCTOR_NETWORK_CHANNEL, request),
    probeMesh: (): Promise<MeshProbeResult> => ipcRenderer.invoke(DOCTOR_MESH_CHANNEL),
    runRemedy: (id: RemedyId): Promise<RemedyResult> =>
      ipcRenderer.invoke(DOCTOR_REMEDY_CHANNEL, { id }),
  },
  /**
   * Organisation meshes: the built-in userspace Tailscale node per mesh. A
   * mesh belongs to a profile and lives in the profile book; the window only
   * claims its active profile's mesh, which main validates. The sidecar
   * binary and its arguments are fixed in main.
   */
  mesh: {
    status: (): Promise<MeshStatusPayload> => ipcRenderer.invoke(MESH_STATUS_CHANNEL),
    claim: (request: MeshClaimRequest): Promise<MeshStatusPayload> => ipcRenderer.invoke(MESH_CLAIM_CHANNEL, request),
    ping: (request: MeshPingRequest): Promise<MeshPingResult[]> => ipcRenderer.invoke(MESH_PING_CHANNEL, request),
    onEvent: (cb: (event: MeshEvent) => void) => subscribe<MeshEvent>(MESH_EVENT_CHANNEL, cb),
  },
  initAgent: (context: any) => ipcRenderer.invoke("agent:init", context),
  executeElectron: (task: Assign) => ipcRenderer.invoke("agent:execute", task),
  onAgentYield: (cb: (data: any) => void) => {
    const listener = (_e: unknown, data: any) => cb(data);
    ipcRenderer.on("agent:yield", listener);
    return () => ipcRenderer.removeListener("agent:yield", listener);
  },
  onAgentDone: (cb: (data: any) => void) => {
    const listener = (_e: unknown, data: any) => cb(data);
    ipcRenderer.on("agent:done", listener);
    return () => ipcRenderer.removeListener("agent:done", listener);
  },
  onAgentError: (cb: (data: any) => void) => {
    const listener = (_e: unknown, data: any) => cb(data);
    ipcRenderer.on("agent:error", listener);
    return () => ipcRenderer.removeListener("agent:error", listener);
  },
  onAgentLog: (cb: (data: any) => void) => {
    const listener = (_e: unknown, data: any) => cb(data);
    ipcRenderer.on("agent:log", listener);
    return () => ipcRenderer.removeListener("agent:log", listener);
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("electronAPI", api);
    contextBridge.exposeInMainWorld("updates", {
      checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
      getChannel: () => ipcRenderer.invoke("get-update-channel"),
      setChannel: (channel: "latest" | "next") => ipcRenderer.invoke("set-update-channel", channel),
      onStatus: (cb: (status: string) => void) => subscribe<string>("updater:status", cb),
      onAvailable: (cb: (info: unknown) => void) => subscribe<unknown>("updater:available", cb),
      onNone: (cb: () => void) => subscribe<unknown>("updater:none", () => cb()),
      onProgress: (cb: (progress: unknown) => void) => subscribe<unknown>("updater:progress", cb),
      onDownloaded: (cb: (info: unknown) => void) => subscribe<unknown>("updater:downloaded", cb),
      onError: (cb: (error: unknown) => void) => subscribe<unknown>("updater:error", cb),
      quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI;
  // @ts-expect-error (define in dts)
  window.api = api;
  // @ts-expect-error (define in dts)
  window.electronAPI = api;
}

// A voice session's MessagePorts cannot cross the contextBridge, but
// `window.postMessage` can carry them into the main world — Electron's
// documented pattern for context-isolated pages. The page matches on
// `data.type` and takes `event.ports`.
ipcRenderer.on("voice:ports", (event, payload: VoicePortsPayload) => {
  window.postMessage({ type: "voice:ports", ...payload }, "*", event.ports);
});

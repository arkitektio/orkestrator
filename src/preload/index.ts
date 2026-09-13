import { contextBridge, ipcRenderer, webUtils } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { Assign } from "../main/message";

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
      onError: (cb: (error: unknown) => void) => subscribe<unknown>("updater:error", cb),
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

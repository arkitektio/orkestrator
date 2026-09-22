import { Assign } from "@/app/agent/message";
import { AppContext, AvailableService } from "@/lib/arkitekt/provider";
import { ImplementationInput } from "@/rekuest/api/graphql";
import { ElectronAPI } from "@electron-toolkit/preload";
import type { ChromeTheme, ChromeThemeSource, WindowChromeState } from "../main/modules/WindowManager";
import type {
  VoiceCatalogEntry,
  VoiceEvent,
  VoiceModelState,
  VoicePortsPayload,
  VoiceStartConfig,
  VoiceStatusPayload,
} from "../main/voice/protocol";
import type {
  MeshProbeResult,
  NetworkProbeResult,
  ProbeNetworkRequest,
  RemedyId,
  RemedyResult,
} from "../main/doctor/protocol";
import type {
  MeshClaimRequest,
  MeshEvent,
  MeshPingRequest,
  MeshPingResult,
  MeshStatusPayload,
} from "../main/mesh/protocol";

/**
 * Organisation meshes (the built-in userspace Tailscale node per mesh).
 * Everything here is an id or a configuration main validates; see
 * `src/main/mesh/protocol.ts`.
 */
export type MeshApi = {
  status: () => Promise<MeshStatusPayload>;
  /**
   * Which mesh this window's active profile needs (`null`: none, or switched
   * off). `authKey` is a one-shot credential from a grant; it is never stored.
   */
  claim: (request: MeshClaimRequest) => Promise<MeshStatusPayload>;
  /** Disco-ping a peer (one of the addresses the status lists); every attempt, last marked final. */
  ping: (request: MeshPingRequest) => Promise<MeshPingResult[]>;
  onEvent: (cb: (event: MeshEvent) => void) => () => void;
};

/**
 * Connection diagnostics. Probing happens in main because the renderer's
 * `fetch` collapses DNS, refusal, TLS and timeout into one opaque error.
 * `runRemedy` only accepts an id from the protocol's closed allowlist.
 */
export type DoctorApi = {
  probeNetwork: (request: ProbeNetworkRequest) => Promise<NetworkProbeResult[]>;
  probeMesh: () => Promise<MeshProbeResult>;
  runRemedy: (id: RemedyId) => Promise<RemedyResult>;
};

export type VoiceApi = {
  start: (config: VoiceStartConfig) => Promise<VoiceStatusPayload>;
  stop: () => Promise<VoiceStatusPayload>;
  status: () => Promise<VoiceStatusPayload>;
  catalog: () => Promise<VoiceCatalogEntry[]>;
  /** Resolves once the ports have been posted to the page (`voice:ports` message). */
  requestPorts: () => Promise<VoicePortsPayload>;
  onEvent: (cb: (event: VoiceEvent) => void) => () => void;
  models: {
    list: () => Promise<VoiceModelState[]>;
    ensure: (args: { modelId: string; modelHost?: string }) => Promise<VoiceModelState[]>;
    remove: (args: { modelId: string }) => Promise<VoiceModelState[]>;
    cancel: (args: { modelId: string }) => Promise<void>;
  };
};

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      getFilePath: (file: File) => string;
      assignElectronAgentFunction: (name: string, implementation: ImplementationInput) => Promise<void>;
      inspectElectronAgent: () => Promise<ImplementationInput[]>;
      startFakts: (url: string) => Promise<void>;
      authenticate: (url: string) => Promise<string>;
      openJitsiWindow: () => Promise<void>;
      openSecondWindow: (path: string) => void;
      downloadFromUrl: (url: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      reloadWindow: () => Promise<{ success: boolean; error?: string }>;
      forceReloadWindow: () => Promise<{ success: boolean; error?: string }>;
      openDevTools: () => Promise<{ success: boolean; error?: string }>;
      setZoomLevel: (zoomLevel: number) => Promise<{ success: boolean; error?: string }>;
      getZoomLevel: () => Promise<{ success: boolean; zoomLevel?: number; error?: string }>;
      openWebbrowser: (url: string) => Promise<void>;
      initAgent: (context: { token: string, url: string, agentUrl: string, services: AvailableService[] }) => Promise<void>;
      reportIssue: (opts: {
        title?: string;
        extra?: string;
        includeScreenshot?: boolean;
        labels?: string[];
        template?: string;
      }) => Promise<void>;
      getNodeId: () => Promise<string>;
      windowControls: {
        minimize: () => void;
        toggleMaximize: () => void;
        close: () => void;
        getState: () => Promise<WindowChromeState>;
        onStateChanged: (cb: (state: WindowChromeState) => void) => () => void;
        setTheme: (theme: ChromeTheme, source?: ChromeThemeSource) => void;
        setRailGlass: (enabled: boolean) => void;
      };
      tabs: {
        onOpen: (cb: (payload: { path: string }) => void) => () => void;
      };
      openFilePicker: () => Promise<string | undefined>;
      uploadBigFile: (opts: { uploadId: string; path: string; grant: any; endpointUrl: string }) => Promise<string>;
      cancelBigFile: (opts: { uploadId: string }) => Promise<void>;
      downloadBigFile: (opts: { downloadId: string; grant: any; endpointUrl: string; fileName: string; savePath?: string }) => Promise<string>;
      cancelBigFileDownload: (opts: { downloadId: string }) => Promise<void>;
      showItemInFolder: (path: string) => Promise<void>;
      openPath: (path: string) => Promise<string>;
      onDownloadProgress: (downloadId: string, cb: (data: any) => void) => () => void;
      onDownloadError: (downloadId: string, cb: (data: any) => void) => () => void;
      onUploadProgress: (uploadId: string, cb: (data: any) => void) => () => void;
      onUploadError: (uploadId: string, cb: (data: any) => void) => () => void;
      voice: VoiceApi;
      doctor: DoctorApi;
      mesh: MeshApi;
      executeElectron: (task: Assign) => Promise<void>;
      onAgentYield: (cb: (data: any) => void) => () => void;
      onAgentDone: (cb: (data: any) => void) => () => void;
      onAgentError: (cb: (data: any) => void) => () => void;
      onAgentLog: (cb: (data: any) => void) => () => void;
    };
    updates: {
      checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string }>;
      getChannel: () => Promise<{ channel: "latest" | "next"; version: string }>;
      setChannel: (channel: "latest" | "next") => Promise<{ success: boolean; result?: any; error?: string }>;
      /** Each subscription returns its disposer — call it on unmount. */
      onStatus: (callback: (status: string) => void) => () => void;
      onAvailable: (callback: (info: any) => void) => () => void;
      onNone: (callback: () => void) => () => void;
      onProgress: (callback: (progress: any) => void) => () => void;
      onDownloaded: (callback: (info: any) => void) => () => void;
      onError: (callback: (error: any) => void) => () => void;
      /** Restart into the downloaded update. */
      quitAndInstall: () => Promise<{ success: boolean }>;
    };
  }
}

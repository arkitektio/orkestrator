import { Assign } from "@/app/agent/message";
import { AppContext, AvailableService } from "@/lib/arkitekt/provider";
import { ImplementationInput } from "@/rekuest/api/graphql";
import { ElectronAPI } from "@electron-toolkit/preload";
import type { ChromeTheme, ChromeThemeSource, WindowChromeState } from "../main/modules/WindowManager";
import type { DialogRequest as ForwardedDialog } from "../main/modules/QuickPaletteWindow";
import type {
  BluetoothAvailability,
  BluetoothCharacteristicRef,
  BluetoothConnectResult,
  BluetoothDisconnected,
  BluetoothNotification,
  BluetoothScanEvent,
  BluetoothScanRequest,
  BluetoothWriteRequest,
} from "../main/bluetooth/protocol";
import type { EduroamInstitution, WifiProfile, WifiProfileList } from "../main/wifi/protocol";
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
  VpnInterface,
} from "../main/doctor/protocol";
import type {
  MeshClaimRequest,
  MeshEvent,
  MeshFirewallState,
  MeshLockInitRequest,
  MeshLockInitResult,
  MeshLockSignRequest,
  MeshLockSignResult,
  MeshPingRequest,
  MeshPingResult,
  MeshStatusPayload,
} from "../main/mesh/protocol";

/**
 * Organisation meshes (the built-in userspace Tailscale node per mesh).
 * Everything here is an id or a configuration main validates; see
 * `src/main/mesh/protocol.ts`.
 */
export type BluetoothApi = {
  /** Whether this computer can do BLE at all (addon, adapter, powered on). */
  availability: () => Promise<BluetoothAvailability>;
  /** Starts (or restarts) a scan; the devices arrive through `onDevices`. */
  startScan: (request: BluetoothScanRequest) => Promise<void>;
  stopScan: () => Promise<void>;
  onDevices: (cb: (event: BluetoothScanEvent) => void) => () => void;
  /** Connects to a device the scan saw and discovers its services. */
  connect: (deviceId: string) => Promise<BluetoothConnectResult>;
  disconnect: (deviceId: string) => Promise<void>;
  read: (ref: BluetoothCharacteristicRef) => Promise<Uint8Array>;
  write: (request: BluetoothWriteRequest) => Promise<void>;
  startNotifications: (ref: BluetoothCharacteristicRef) => Promise<void>;
  stopNotifications: (ref: BluetoothCharacteristicRef) => Promise<void>;
  onNotification: (cb: (event: BluetoothNotification) => void) => () => void;
  onDisconnected: (cb: (event: BluetoothDisconnected) => void) => () => void;
};

export type WifiApi = {
  list: () => Promise<WifiProfileList>;
  /** Adds or replaces (by id) a profile; answers with the new list. */
  save: (profile: WifiProfile) => Promise<WifiProfileList>;
  remove: (id: string) => Promise<WifiProfileList>;
  /** Institutions in the eduroam directory whose name matches (at least 2 characters). */
  searchEduroam: (query: string) => Promise<EduroamInstitution[]>;
  /** The eap-config XML of a profile the directory lists. */
  eduroamEapConfig: (eapconfigEndpoint: string) => Promise<string>;
};

export type MeshApi = {
  status: () => Promise<MeshStatusPayload>;
  /**
   * Which mesh this window's active profile needs (`null`: none, or switched
   * off). `authKey` is a one-shot credential from a grant; it is never stored.
   */
  claim: (request: MeshClaimRequest) => Promise<MeshStatusPayload>;
  /** Disco-ping a peer (one of the addresses the status lists); every attempt, last marked final. */
  ping: (request: MeshPingRequest) => Promise<MeshPingResult[]>;
  /** Tailnet Lock: approve one of the mesh's waiting machines (this computer must be a signer). */
  lockSign: (request: MeshLockSignRequest) => Promise<MeshLockSignResult>;
  /** Tailnet Lock: make this computer the mesh's key authority; the answer carries the disablement secret. */
  lockInit: (request: MeshLockInitRequest) => Promise<MeshLockInitResult>;
  /** Restart the mesh client and reconnect every claimed mesh ("check again"). */
  restart: () => Promise<MeshStatusPayload>;
  /** Windows' inbound firewall rules for the mesh sidecar (`none`: Windows has not asked yet). */
  firewall: () => Promise<MeshFirewallState>;
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
  /** Tunnel interfaces (VPN, WireGuard, system Tailscale) that are up. */
  probeInterfaces: () => Promise<VpnInterface[]>;
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
        hardware?: string[];
      }) => Promise<void>;
      getNodeId: () => Promise<string>;
      trust: {
        setFaktsHosts: (trust: import("../main/trust/hosts").TrustPayload) => Promise<void>;
        allowDiscoveryHosts: (trust: import("../main/trust/hosts").TrustPayload) => Promise<void>;
      };
      factoryReset: () => Promise<void>;
      windowControls: {
        minimize: () => void;
        toggleMaximize: () => void;
        close: () => void;
        popupAppMenu: (x: number, y: number) => void;
        pointerInApp: () => Promise<boolean>;
        getState: () => Promise<WindowChromeState>;
        onStateChanged: (cb: (state: WindowChromeState) => void) => () => void;
        setTheme: (theme: ChromeTheme, source?: ChromeThemeSource) => void;
        setRailGlass: (enabled: boolean) => void;
        setWindowButtonsVisible: (visible: boolean) => void;
      };
      tabs: {
        onOpen: (cb: (payload: { path: string }) => void) => () => void;
      };
      dialogs: {
        onOpen: (cb: (request: ForwardedDialog) => void) => () => void;
        takePending: () => Promise<ForwardedDialog | null>;
      };
      palette: {
        setGlobalShortcut: (
          accelerator: string | null,
        ) => Promise<{ status: "ok" | "off" | "taken" | "invalid"; accelerator: string | null }>;
        onQuickShown: (cb: () => void) => () => void;
        hideQuick: () => void;
        keepQuickOpen: (keep: boolean) => void;
        resizeQuick: (size: { height: number; expanded?: boolean }) => void;
        openInMain: (path: string) => void;
        openDialogInMain: (request: ForwardedDialog) => void;
      };
      openFilePicker: () => Promise<string | undefined>;
      uploadBigFile: (opts: { uploadId: string; path: string; grant: any; endpointUrl: string }) => Promise<string>;
      fetchAsset: (opts: { url: string; maxSize: number; allowPrivate?: boolean }) => Promise<
        | { ok: true; path: string; ref: string; size: number; bytes: Uint8Array }
        | { ok: false; code: string; message: string }
      >;
      discardAsset: (opts: { path: string }) => Promise<void>;
      cancelBigFile: (opts: { uploadId: string }) => Promise<void>;
      downloadBigFile: (opts: { downloadId: string; grant: any; endpointUrl: string; fileName: string; savePath?: string }) => Promise<string>;
      cancelBigFileDownload: (opts: { downloadId: string }) => Promise<void>;
      showItemInFolder: (path: string) => Promise<void>;
      openPath: (path: string) => Promise<string>;
      hardware: {
        probe: () => Promise<{
          probedAt: string;
          totalRamMB: number;
          gpus: {
            vendor: string;
            model: string;
            vramMB: number | null;
            vramDynamic: boolean;
            driverVersion?: string | null;
          }[];
          cpu?: { brand: string; cores: number; physicalCores: number; speedGHz: number | null } | null;
          os?: { platform: string; distro: string; release: string; kernel: string; arch: string } | null;
          displays?: { width: number; height: number; refreshRate: number | null; main: boolean }[];
        }>;
      };
      gpuChecks: {
        get: () => Promise<import("../main/modules/GpuChecks").GpuChecksState>;
        set: (checks: import("../main/modules/GpuChecks").GpuChecks) => Promise<import("../main/modules/GpuChecks").GpuChecksState>;
        /** Restarts the app; a no-op under `pnpm dev`. */
        relaunch: () => Promise<void>;
      };
      onDownloadProgress: (downloadId: string, cb: (data: any) => void) => () => void;
      onDownloadError: (downloadId: string, cb: (data: any) => void) => () => void;
      onUploadProgress: (uploadId: string, cb: (data: any) => void) => () => void;
      onUploadError: (uploadId: string, cb: (data: any) => void) => () => void;
      voice: VoiceApi;
      doctor: DoctorApi;
      mesh: MeshApi;
      bluetooth: BluetoothApi;
      wifi: WifiApi;
      executeElectron: (task: Assign) => Promise<void>;
      onAgentYield: (cb: (data: any) => void) => () => void;
      onAgentDone: (cb: (data: any) => void) => () => void;
      onAgentError: (cb: (data: any) => void) => () => void;
      onAgentLog: (cb: (data: any) => void) => () => void;
    };
    updates: {
      /** `code` is electron-updater's error code, e.g. `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND`. */
      checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string; code?: string }>;
      getChannel: () => Promise<{ channel: "latest" | "next"; version: string }>;
      setChannel: (channel: "latest" | "next") => Promise<{ success: boolean; result?: any; error?: string; code?: string }>;
      /** Each subscription returns its disposer — call it on unmount. */
      onStatus: (callback: (status: string) => void) => () => void;
      onAvailable: (callback: (info: any) => void) => () => void;
      onNone: (callback: () => void) => () => void;
      onProgress: (callback: (progress: any) => void) => () => void;
      onDownloaded: (callback: (info: any) => void) => () => void;
      /** `{ message, code? }` from current main builds; a string from older ones. */
      onError: (callback: (error: { message: string; code?: string } | string) => void) => () => void;
      /** Restart into the downloaded update. */
      quitAndInstall: () => Promise<{ success: boolean }>;
    };
  }
}

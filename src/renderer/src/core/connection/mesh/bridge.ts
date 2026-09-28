import type {
  MeshClaimRequest,
  MeshEvent,
  MeshLockInitRequest,
  MeshLockInitResult,
  MeshLockSignRequest,
  MeshLockSignResult,
  MeshPingRequest,
  MeshPingResult,
  MeshStatusPayload,
} from "../../../../../main/mesh/protocol";

/**
 * The renderer's view of the mesh sidecar. Mirrors `doctor/useConnectionDoctor.ts`:
 * the bridge is absent in a browser build, and every caller must cope.
 */
export type MeshBridge = {
  status: () => Promise<MeshStatusPayload>;
  claim: (request: MeshClaimRequest) => Promise<MeshStatusPayload>;
  ping: (request: MeshPingRequest) => Promise<MeshPingResult[]>;
  lockSign: (request: MeshLockSignRequest) => Promise<MeshLockSignResult>;
  lockInit: (request: MeshLockInitRequest) => Promise<MeshLockInitResult>;
  restart: () => Promise<MeshStatusPayload>;
  onEvent: (cb: (event: MeshEvent) => void) => () => void;
};

export const meshBridge = (): MeshBridge | undefined => {
  if (typeof window === "undefined") return undefined;
  const bridge = (window as unknown as { api?: { mesh?: MeshBridge } }).api?.mesh;
  return typeof bridge?.claim === "function" ? bridge : undefined;
};

export const meshAvailable = (): boolean => !!meshBridge();

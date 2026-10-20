import { useSyncExternalStore } from "react";
import { connectionProgress, type MeshProgress, type ServiceProgress, type SessionProgress } from "./store";

/** Each hook re-renders only when its own slice changes (slices are replaced, never mutated). */

const snapshot = connectionProgress.getSnapshot;

export const useServiceProgress = (key: string | undefined): ServiceProgress | undefined =>
  useSyncExternalStore(connectionProgress.subscribe, () => (key ? snapshot().services[key] : undefined));

export const useMeshProgress = (): MeshProgress | undefined =>
  useSyncExternalStore(connectionProgress.subscribe, () => snapshot().mesh);

export const useSessionProgress = (): SessionProgress | undefined =>
  useSyncExternalStore(connectionProgress.subscribe, () => snapshot().session);

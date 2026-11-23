import { useServiceInstance } from "@/core/connection/arkitekt/host";
import { useSyncExternalStore } from "react";
import type { RekuestService } from "../service";
import type { RekuestSession, SessionStatus, SessionSync } from "./client";

/** This window's caller session (under the rekuest guard, like `useRekuest`). */
export const useRekuestSession = (): RekuestSession =>
  useServiceInstance<RekuestService>("rekuest").session;

/** The session's status, as it changes (for what shows whether live updates are flowing). */
export const useRekuestSessionStatus = (session: RekuestSession): SessionStatus =>
  useSyncExternalStore(session.subscribeStatus, session.getStatus, session.getStatus);

/** Whether live updates flow, and since when they have not (`SessionSync`). */
export const useRekuestSessionSync = (session: RekuestSession): SessionSync =>
  useSyncExternalStore(session.subscribeStatus, session.getSync, session.getSync);

import { useServiceInstance } from "@/core/connection/arkitekt/host";
import { useSyncExternalStore } from "react";
import type { RekuestService } from "../service";
import type { RekuestSession, SessionStatus } from "./client";

/** This window's caller session (under the rekuest guard, like `useRekuest`). */
export const useRekuestSession = (): RekuestSession =>
  useServiceInstance<RekuestService>("rekuest").session;

/** The session's status, as it changes (for what shows whether live updates are flowing). */
export const useRekuestSessionStatus = (session: RekuestSession): SessionStatus =>
  useSyncExternalStore(session.subscribeStatus, session.getStatus, session.getStatus);

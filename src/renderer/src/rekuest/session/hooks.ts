import { useServiceInstance } from "@/core/connection/arkitekt/host";
import { useSyncExternalStore } from "react";
import type { RekuestService } from "../service";
import type { RekuestSession, SessionStatus } from "./client";

/** This window's caller session (under the rekuest guard, like `useRekuest`). */
export const useRekuestSession = (): RekuestSession =>
  useServiceInstance<RekuestService>("rekuest").session;

const noStatus = () => () => undefined;
const disabled = (): SessionStatus => "disabled";

export const useRekuestSessionStatus = (session: RekuestSession | null | undefined): SessionStatus =>
  useSyncExternalStore(
    session ? session.subscribeStatus : noStatus,
    session ? session.getStatus : disabled,
    session ? session.getStatus : disabled,
  );

/**
 * Where a feed comes from: the session while it is (or was, and is coming
 * back) open, the GraphQL subscriptions where there is none, and nothing yet
 * while the first connection decides. Never both: a feed switches only when
 * this changes, after tearing the other down.
 */
export type FeedSource = "session" | "graphql" | "pending";

export const sourceOf = (status: SessionStatus): FeedSource => {
  switch (status) {
    case "open":
    case "reconnecting":
      return "session";
    case "unsupported":
    case "fallback":
    case "disabled":
      return "graphql";
    default:
      return "pending";
  }
};

export const useFeedSource = (session: RekuestSession | null | undefined): FeedSource =>
  sourceOf(useRekuestSessionStatus(session));

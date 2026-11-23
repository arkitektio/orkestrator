import { useServiceInstance } from "@/core/connection/arkitekt/host";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { RekuestService } from "../service";
import type { RekuestSession, SessionStatus, TopicListener } from "./client";

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
    case "disabled":
      return "graphql";
    default:
      return "pending";
  }
};

export const useFeedSource = (session: RekuestSession | null | undefined): FeedSource =>
  sourceOf(useRekuestSessionStatus(session));

/**
 * Follow one rekuest feed: over the session (`topic`, its items and resyncs to
 * `listener`) while there is one, else through `fallback` (the GraphQL
 * subscription the feed always had; it returns its teardown). `topic` null:
 * nothing to follow. The listener and fallback are read through refs, so a
 * render does not resubscribe.
 */
export const useRekuestFeed = (
  topic: string | null,
  listener: TopicListener,
  fallback: () => (() => void) | void,
) => {
  const session = useRekuestSession();
  const source = useFeedSource(session);
  const listenerRef = useRef(listener);
  const fallbackRef = useRef(fallback);
  listenerRef.current = listener;
  fallbackRef.current = fallback;

  useEffect(() => {
    if (!topic) return undefined;
    if (source === "session") {
      return session.watch(topic, {
        onData: (item) => listenerRef.current.onData(item),
        onResync: (snapshot, reason) => listenerRef.current.onResync(snapshot, reason),
        onRefused: (error) => listenerRef.current.onRefused?.(error),
      });
    }
    if (source === "graphql") {
      return fallbackRef.current() ?? undefined;
    }
    return undefined;
  }, [session, source, topic]);
};

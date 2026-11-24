import { useEffect, useRef, useState } from "react";
import { ParticipantEvent, RpcError, type Participant, type Room, type Track } from "livekit-client";
import { useLivekit } from "@/core/connection/arkitekt/host";
import { serviceRoute } from "@/core/connection/mesh/route";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import {
  bitrateKbps,
  describePublisher,
  pictureHealth,
  readMediaStats,
  type MediaStats,
  type PingResult,
  type StatsSource,
} from "./mediaStats";

/** How often a stream's numbers are read while something shows them. */
const EVERY_MS = 2_000;

/** A track's WebRTC statistics, read every two seconds while mounted, with its bitrate. */
export const useMediaStats = (track: Track | undefined) => {
  const [state, setState] = useState<{ stats: MediaStats | null; kbps: number | null }>({ stats: null, kbps: null });
  const previous = useRef<MediaStats | null>(null);
  useEffect(() => {
    if (!track) return undefined;
    let alive = true;
    const read = async () => {
      const report = await track.getRTCStatsReport().catch(() => undefined);
      if (!alive || !report) return;
      const stats = readMediaStats(report as unknown as StatsSource);
      const kbps = bitrateKbps(previous.current, stats);
      previous.current = stats;
      setState({ stats, kbps });
    };
    void read();
    const timer = setInterval(() => void read(), EVERY_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      previous.current = null;
    };
  }, [track]);
  return state;
};

/**
 * The mesh tunnel to the media server, for a stream that goes through the media bridge: direct
 * to its machine, or routed via a region. Undefined when the server is not on a mesh.
 */
export const useMediaServerTunnel = () => {
  const { url } = useLivekit();
  const { payload } = useMeshes();
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  const route = serviceRoute(host, payload);
  if (route.kind !== "mesh") return undefined;
  const path = route.peer?.path;
  return {
    label: route.meshLabel,
    tunnel:
      path?.kind === "direct"
        ? ({ kind: "direct" } as const)
        : path?.kind === "relay"
          ? ({ kind: "routed", region: path.region } as const)
          : undefined,
  };
};

/** How a video element's picture looks, sampled small every few seconds while mounted. */
export const usePictureHealth = (container: React.RefObject<HTMLElement | null>, active: boolean) => {
  const [health, setHealth] = useState<ReturnType<typeof pictureHealth> | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 20;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const sample = () => {
      const video = container.current?.querySelector("video");
      if (!context || !video || video.readyState < 2 || !video.videoWidth) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setHealth(pictureHealth(context.getImageData(0, 0, canvas.width, canvas.height).data));
    };
    sample();
    const timer = setInterval(sample, 3_000);
    return () => clearInterval(timer);
  }, [container, active]);
  return health;
};

/** How the publisher reaches the media server: what it reports of itself, a ping timed from
 *  here, and the server's rating of its connection, kept current as any of them changes. */
export const usePublisherPath = (
  room: Room | undefined,
  participant: Participant | undefined,
  windowRttMs: number | null,
) => {
  const ping = usePing(room, participant?.identity);
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!participant) return undefined;
    const update = () => setVersion((version) => version + 1);
    participant.on(ParticipantEvent.AttributesChanged, update);
    participant.on(ParticipantEvent.ConnectionQualityChanged, update);
    return () => {
      participant.off(ParticipantEvent.AttributesChanged, update);
      participant.off(ParticipantEvent.ConnectionQualityChanged, update);
    };
  }, [participant]);
  if (!participant) return null;
  return describePublisher(participant.attributes, participant.connectionQuality, { result: ping, windowRttMs });
};

/** The RPC a publisher answers latency pings on (lovekit's Python client, `PING_METHOD`). */
export const PING_METHOD = "lovekit.ping";
const PING_EVERY_MS = 5_000;
/** LiveKit's RPC error for a method the other side does not answer. */
const UNSUPPORTED_METHOD = 1400;

/**
 * A latency ping to `identity` through the media server, every five seconds while mounted: the
 * full trip, this window → server → publisher and back. A publisher whose lovekit does not
 * answer is asked once, then left alone.
 */
export const usePing = (room: Room | undefined, identity: string | undefined): PingResult => {
  // Each result says whom it is for: a result for another publisher reads as "measuring".
  const [latest, setLatest] = useState<{ for: string; result: PingResult } | null>(null);
  useEffect(() => {
    if (!room || !identity) return undefined;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (result: PingResult) => {
      if (alive) setLatest({ for: identity, result });
    };
    const ping = async () => {
      const started = performance.now();
      try {
        await room.localParticipant.performRpc({
          destinationIdentity: identity,
          method: PING_METHOD,
          payload: String(Date.now()),
          responseTimeout: 8_000,
        });
        settle({ status: "ok", totalMs: performance.now() - started });
      } catch (error) {
        if (error instanceof RpcError && error.code === UNSUPPORTED_METHOD) {
          settle({ status: "unsupported" });
          return;
        }
        settle({ status: "failed", error: error instanceof Error ? error.message : String(error) });
      }
      if (alive) timer = setTimeout(() => void ping(), PING_EVERY_MS);
    };
    void ping();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [room, identity]);
  return latest && latest.for === identity ? latest.result : { status: "measuring" };
};

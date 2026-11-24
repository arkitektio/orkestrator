/**
 * What a live stream's WebRTC statistics say, in words: how its media travels (UDP or TCP,
 * straight to the media server or through the mesh's media bridge) and how well (frames, bits,
 * losses). Read from a track's own `getRTCStatsReport()`: the receiver's report carries the
 * selected candidate pair of its transport.
 *
 * Words (see the memory "LiveKit UDP + media bridge"): "direct" for a path straight to the
 * media server, "media bridge" for the mesh's TURN on 127.0.0.1, never a bare "relayed".
 */

/** One entry of an RTCStatsReport, as far as it is read here. */
type Stat = { id: string; type: string; [key: string]: unknown };

export type CandidateKind = "host" | "srflx" | "prflx" | "relay";

export type Candidate = {
  kind: CandidateKind | null;
  protocol: "udp" | "tcp" | null;
  address: string | null;
  port: number | null;
  /** For a relay candidate: the TURN server it came from (the media bridge: 127.0.0.1). */
  url: string | null;
};

export type MediaStats = {
  /** The pair WebRTC chose; null before it chose one. */
  local: Candidate | null;
  remote: Candidate | null;
  rttMs: number | null;
  video: {
    width: number | null;
    height: number | null;
    fps: number | null;
    framesDecoded: number | null;
    framesDropped: number | null;
    packetsLost: number | null;
    packetsReceived: number | null;
    bytesReceived: number | null;
    jitterMs: number | null;
  } | null;
  /** When the report was read (ms). */
  at: number;
};

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

const candidate = (stat: Stat | undefined): Candidate | null => {
  if (!stat) return null;
  const kind = str(stat.candidateType);
  const protocol = str(stat.protocol);
  return {
    kind: kind === "host" || kind === "srflx" || kind === "prflx" || kind === "relay" ? kind : null,
    protocol: protocol === "udp" || protocol === "tcp" ? protocol : null,
    address: str(stat.address) ?? str(stat.ip),
    port: num(stat.port),
    url: str(stat.url),
  };
};

/** A report as WebRTC hands it (an `RTCStatsReport`: map-like, but no `Map`), or a list. */
export type StatsSource = Iterable<Stat> | { values: () => Iterable<Stat> };

/** The statistics of one track's report. */
export const readMediaStats = (report: StatsSource, at = Date.now()): MediaStats => {
  // An RTCStatsReport iterates as [id, stat] pairs; its values() are the stats. A list's
  // values() are its items: one way for both.
  const stats = [...("values" in report && typeof report.values === "function" ? report.values() : (report as Iterable<Stat>))];
  const byId = new Map(stats.map((stat) => [stat.id, stat]));

  // The selected pair: by the transport's id, else the nominated, succeeded one.
  const transport = stats.find((stat) => stat.type === "transport");
  const pairId = transport ? str(transport.selectedCandidatePairId) : null;
  const pair =
    (pairId ? byId.get(pairId) : undefined) ??
    stats.find((stat) => stat.type === "candidate-pair" && stat.nominated === true && stat.state === "succeeded");

  const inbound = stats.find((stat) => stat.type === "inbound-rtp" && stat.kind === "video");
  const rtt = pair ? num(pair.currentRoundTripTime) : null;
  const jitter = inbound ? num(inbound.jitter) : null;

  return {
    local: candidate(pair ? byId.get(String(pair.localCandidateId)) : undefined),
    remote: candidate(pair ? byId.get(String(pair.remoteCandidateId)) : undefined),
    rttMs: rtt === null ? null : rtt * 1000,
    video: inbound
      ? {
          width: num(inbound.frameWidth),
          height: num(inbound.frameHeight),
          fps: num(inbound.framesPerSecond),
          framesDecoded: num(inbound.framesDecoded),
          framesDropped: num(inbound.framesDropped),
          packetsLost: num(inbound.packetsLost),
          packetsReceived: num(inbound.packetsReceived),
          bytesReceived: num(inbound.bytesReceived),
          jitterMs: jitter === null ? null : jitter * 1000,
        }
      : null,
    at,
  };
};

/** Kilobits per second between two readings of the same stream. */
export const bitrateKbps = (before: MediaStats | null, after: MediaStats): number | null => {
  const a = before?.video?.bytesReceived;
  const b = after.video?.bytesReceived;
  if (a == null || b == null || !before || after.at <= before.at || b < a) return null;
  return ((b - a) * 8) / (after.at - before.at);
};

export type PathTone = "good" | "warn" | "bad" | "muted";

/** Whether a local candidate is the mesh's media bridge (the TURN on 127.0.0.1). */
const isMediaBridge = (local: Candidate): boolean =>
  local.kind === "relay" && (!local.url || /\/\/?(127\.0\.0\.1|localhost)[:/?]|turn:(127\.0\.0\.1|localhost)/.test(local.url));

/**
 * How the media travels, in one line. `mesh` is the mesh tunnel to the media server, when the
 * media goes through the media bridge: direct, or routed via a region (TCP underneath).
 */
export const describeMediaPath = (
  stats: MediaStats | null,
  mesh?: { label: string; tunnel?: { kind: "direct" } | { kind: "routed"; region: string } },
): { line: string; tone: PathTone } => {
  const local = stats?.local;
  if (!local) return { line: "Choosing a path…", tone: "muted" };
  if (local.protocol === "tcp") {
    return { line: "TCP · the media server's fallback (live media should be UDP)", tone: "bad" };
  }
  if (local.kind === "relay") {
    if (!isMediaBridge(local)) return { line: "UDP · through a TURN server", tone: "warn" };
    const via = mesh ? `media bridge (${mesh.label} mesh)` : "media bridge";
    if (mesh?.tunnel?.kind === "routed") {
      return { line: `UDP · ${via}, routed via ${mesh.tunnel.region} (TCP underneath)`, tone: "warn" };
    }
    if (mesh?.tunnel?.kind === "direct") return { line: `UDP · ${via}, direct tunnel`, tone: "good" };
    return { line: `UDP · ${via}`, tone: "good" };
  }
  if (local.kind === "srflx" || local.kind === "prflx" || stats?.remote?.kind === "srflx") {
    return { line: "UDP · direct, through NAT", tone: "good" };
  }
  return { line: "UDP · direct, same network", tone: "good" };
};

/**
 * Whether the picture says anything: a frame of one value (all white, all black) is a camera
 * or a pipeline that sends nothing, not a dark or bright sample (those still vary). `rgba` is
 * a frame's RGBA bytes, at any size.
 */
export const pictureHealth = (rgba: ArrayLike<number>): { mean: number; std: number; flat: boolean; message: string | null } => {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return { mean: 0, std: 0, flat: false, message: null };
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < pixels; i++) {
    const v = (rgba[i * 4] + rgba[i * 4 + 1] + rgba[i * 4 + 2]) / 3;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / pixels;
  const std = Math.sqrt(Math.max(0, sumSq / pixels - mean * mean));
  const flat = std < 1;
  const shade = mean > 240 ? "white" : mean < 15 ? "black" : `one grey (${Math.round(mean)})`;
  return {
    mean,
    std,
    flat,
    message: flat
      ? `The picture is flat: every pixel is ${shade}. The camera or its stream sends no image, the connection is fine.`
      : null,
  };
};

/** A latency ping to the publisher (`lovekit.ping`): the full trip, through the server and back. */
export type PingResult =
  | { status: "measuring" }
  | { status: "ok"; totalMs: number }
  /** Its lovekit does not answer pings (older than the ping). */
  | { status: "unsupported" }
  | { status: "failed"; error: string };

/**
 * The publisher's own leg of a ping: the full trip (this window → server → publisher and back)
 * less this window's round trip to the server. An estimate: the ping also carries the server's
 * forwarding and the publisher's answer, so it reads a little high.
 */
export const publisherLegMs = (totalMs: number, windowRttMs: number | null): number =>
  Math.max(0, Math.round(totalMs - (windowRttMs ?? 0)));

/**
 * How the publisher (the agent) reaches the media server: what it reports of itself
 * (participant attributes, `lovekit.*`), a ping timed from here (`lovekit.ping`) and the server's
 * rating of its connection (LiveKit's connection quality). An agent on an older lovekit
 * answers neither: then the rating is all there is.
 */
export const describePublisher = (
  attributes: Readonly<Record<string, string>>,
  quality: string | undefined,
  ping?: { result: PingResult; windowRttMs: number | null },
): { line: string; tone: PathTone } => {
  const rating = quality && quality !== "unknown" ? `quality ${quality}` : null;
  const tone: PathTone =
    quality === "poor" || quality === "lost" ? "bad" : quality === "good" ? "warn" : quality === "excellent" ? "good" : "muted";
  const pinged =
    ping?.result.status === "ok" ? `≈${publisherLegMs(ping.result.totalMs, ping.windowRttMs)} ms by ping` : null;
  const transport = attributes["lovekit.transport"];
  if (!transport) {
    const parts = ["Agent → server", pinged, rating ?? (pinged ? null : "not reported")].filter(Boolean);
    if (!pinged) parts.push("(its lovekit reports no path)");
    return { line: parts.join(" · "), tone: pinged && tone === "muted" ? "good" : tone };
  }
  const candidate = attributes["lovekit.candidate"];
  const how =
    attributes["lovekit.bridge"] === "1"
      ? "media bridge"
      : candidate === "relay"
        ? "through a TURN server"
        : candidate === "srflx" || candidate === "prflx"
          ? "direct, through NAT"
          : "direct";
  const rtt = attributes["lovekit.rtt_ms"];
  const parts = ["Agent → server", `${transport.toUpperCase()} · ${how}`, rtt ? `${rtt} ms` : null, pinged, rating].filter(Boolean);
  return { line: parts.join(" · "), tone: transport === "tcp" ? "bad" : tone === "muted" ? "good" : tone };
};

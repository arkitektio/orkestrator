import { describe, expect, it } from "vitest";
import { bitrateKbps, describeMediaPath, describePublisher, pictureHealth, publisherLegMs, readMediaStats } from "./mediaStats";

const report = (local: Record<string, unknown>, remote: Record<string, unknown> = { candidateType: "host", protocol: "udp" }) => [
  { id: "T1", type: "transport", selectedCandidatePairId: "CP1" },
  { id: "CP1", type: "candidate-pair", localCandidateId: "L1", remoteCandidateId: "R1", currentRoundTripTime: 0.012 },
  { id: "L1", type: "local-candidate", ...local },
  { id: "R1", type: "remote-candidate", ...remote },
  {
    id: "IV",
    type: "inbound-rtp",
    kind: "video",
    frameWidth: 1024,
    frameHeight: 680,
    framesPerSecond: 15,
    framesDecoded: 300,
    framesDropped: 2,
    packetsLost: 1,
    packetsReceived: 900,
    bytesReceived: 1_000_000,
    jitter: 0.004,
  },
];

describe("media stats", () => {
  it("reads the selected pair and the video's numbers", () => {
    const stats = readMediaStats(report({ candidateType: "host", protocol: "udp", address: "172.21.0.1" }), 1000);
    expect(stats.local).toMatchObject({ kind: "host", protocol: "udp", address: "172.21.0.1" });
    expect(stats.rttMs).toBeCloseTo(12);
    expect(stats.video).toMatchObject({ width: 1024, height: 680, fps: 15, framesDropped: 2 });
  });

  it("reads a report as WebRTC hands it: map-like, iterating [id, stat] pairs", () => {
    const stats = report({ candidateType: "host", protocol: "udp" });
    const byId = new Map(stats.map((stat) => [stat.id, stat]));
    // Not a Map: what RTCRtpReceiver.getStats() resolves to.
    const rtcStatsReport = {
      values: () => byId.values(),
      [Symbol.iterator]: () => byId.entries(),
    };
    expect(readMediaStats(rtcStatsReport).local).toMatchObject({ kind: "host", protocol: "udp" });
    expect(readMediaStats(rtcStatsReport).video?.fps).toBe(15);
  });

  it("says a direct UDP path as direct", () => {
    expect(describeMediaPath(readMediaStats(report({ candidateType: "host", protocol: "udp" })))).toEqual({
      line: "UDP · direct, same network",
      tone: "good",
    });
    expect(describeMediaPath(readMediaStats(report({ candidateType: "srflx", protocol: "udp" }))).line).toBe(
      "UDP · direct, through NAT",
    );
  });

  it("names the media bridge, and the mesh tunnel under it", () => {
    const bridged = readMediaStats(report({ candidateType: "relay", protocol: "udp", url: "turn:127.0.0.1:41234?transport=udp" }));
    expect(describeMediaPath(bridged, { label: "Lab", tunnel: { kind: "direct" } })).toEqual({
      line: "UDP · media bridge (Lab mesh), direct tunnel",
      tone: "good",
    });
    expect(describeMediaPath(bridged, { label: "Lab", tunnel: { kind: "routed", region: "fra" } })).toEqual({
      line: "UDP · media bridge (Lab mesh), routed via fra (TCP underneath)",
      tone: "warn",
    });
  });

  it("calls TCP what it is: the fallback live media should not take", () => {
    expect(describeMediaPath(readMediaStats(report({ candidateType: "host", protocol: "tcp" }))).tone).toBe("bad");
  });

  it("works out the bitrate between two readings", () => {
    const a = readMediaStats(report({ candidateType: "host", protocol: "udp" }), 1000);
    const b = { ...a, at: 2000, video: { ...a.video!, bytesReceived: 1_125_000 } };
    expect(bitrateKbps(a, b)).toBe(1000);
  });

  it("finds a flat picture (the all-white camera) and lets a real one be", () => {
    const white = new Uint8ClampedArray(64 * 4).fill(254);
    expect(pictureHealth(white)).toMatchObject({ flat: true });
    expect(pictureHealth(white).message).toContain("white");
    const noisy = Uint8ClampedArray.from({ length: 64 * 4 }, (_, i) => (i * 37) % 256);
    expect(pictureHealth(noisy).flat).toBe(false);
  });
});

describe("the publisher's path", () => {
  it("shows what the agent reports of itself, with the server's rating", () => {
    expect(
      describePublisher(
        { "lovekit.transport": "udp", "lovekit.candidate": "relay", "lovekit.bridge": "1", "lovekit.rtt_ms": "37" },
        "excellent",
      ),
    ).toEqual({ line: "Agent → server · UDP · media bridge · 37 ms · quality excellent", tone: "good" });
  });

  it("adds the publisher's leg of a ping: the full trip less this window's own round trip", () => {
    expect(publisherLegMs(45, 3)).toBe(42);
    expect(publisherLegMs(2, 3)).toBe(0);
    expect(
      describePublisher({}, "excellent", { result: { status: "ok", totalMs: 41 }, windowRttMs: 2 }),
    ).toEqual({ line: "Agent → server · ≈39 ms by ping · quality excellent", tone: "good" });
  });

  it("falls back to the server's rating for an agent that reports nothing", () => {
    expect(describePublisher({}, "poor")).toEqual({
      line: "Agent → server · quality poor · (its lovekit reports no path)",
      tone: "bad",
    });
  });
});

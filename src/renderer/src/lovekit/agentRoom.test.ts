import { describe, expect, it } from "vitest";
import { RoomEvent, type Room } from "livekit-client";
import { watchData } from "./agentRoom";

/** A data track that hands out what is pushed to it, and says when its reader stopped. */
const fakeTrack = (name: string) => {
  let push: (payload: Uint8Array) => void = () => {};
  const track = {
    info: { name },
    stopped: false,
    subscribe: ({ signal }: { signal: AbortSignal }) =>
      new ReadableStream({
        start: (controller) => {
          push = (payload) => controller.enqueue({ payload });
          signal.addEventListener("abort", () => {
            track.stopped = true;
            controller.error(new Error("aborted"));
          });
        },
      }),
    push: (payload: Uint8Array) => push(payload),
  };
  return track;
};

/** A joined room: who publishes which data tracks, and who listens for more. */
const fakeRoom = (tracks: ReturnType<typeof fakeTrack>[]) => {
  const listeners = new Map<string, Set<(track: unknown) => void>>();
  const room = {
    remoteParticipants: new Map([["agent-1", { dataTracks: new Map(tracks.map((track) => [track.info.name, track])) }]]),
    on: (event: string, listener: (track: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    off: (event: string, listener: (track: unknown) => void) => listeners.get(event)?.delete(listener),
    publish: (track: unknown) => listeners.get(RoomEvent.DataTrackPublished)?.forEach((listener) => listener(track)),
    listening: () => listeners.get(RoomEvent.DataTrackPublished)?.size ?? 0,
  };
  return room;
};

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("watchData", () => {
  it("reads the track of its key, also one published again, and nothing after it stopped", async () => {
    const spectrum = fakeTrack("spectrum");
    const other = fakeTrack("temperature");
    const room = fakeRoom([spectrum, other]);
    const seen: number[] = [];
    const stop = watchData(room as unknown as Room, "spectrum", (payload) => seen.push(payload[0]));

    await settled();
    spectrum.push(Uint8Array.of(1));
    other.push(Uint8Array.of(99));
    await settled();
    expect(seen).toEqual([1]);

    // The agent restarts: its track is published again, under the same key.
    const again = fakeTrack("spectrum");
    room.publish(again);
    await settled();
    again.push(Uint8Array.of(2));
    await settled();
    expect(seen).toEqual([1, 2]);

    stop();
    await settled();
    expect(spectrum.stopped && again.stopped).toBe(true);
    expect(room.listening()).toBe(0);
  });
});

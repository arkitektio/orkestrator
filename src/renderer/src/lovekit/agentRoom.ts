import { useEffect } from "react";
import { Room, RoomEvent } from "livekit-client";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * The agent rooms this window watches: one LiveKit connection per agent,
 * however many of its streams are on screen.
 *
 * Every stream of an agent is a track of the agent's room, named by the
 * stream's key. A view asks for the room (`useAgentRoom`) and for the track
 * it shows (`useWatchedTrack`); the room is joined on the first ask and left
 * a little after the last one is gone, so moving between pages that show the
 * same agent keeps the connection. Only the tracks someone looks at are
 * subscribed. A dropped room is joined again, with a fresh token, while
 * anyone still watches.
 */

export type AgentRoomStatus = "connecting" | "connected" | "error";

type Entry = {
  refs: number;
  status: AgentRoomStatus;
  error: string | null;
  room: Room | null;
  /** How many views want each track, by track name (the stream's key). */
  wanted: Record<string, number>;
};

export type AgentRoomsState = { rooms: Record<string, Entry> };

/** Mints a watching token for an agent's room (`watchAgent`), and where LiveKit is. */
export type Connector = { token: (agentId: string) => Promise<string>; url: string };

/** How long an unwatched room stays joined, for a view that comes right back. */
const LINGER_MS = 5_000;
const MAX_BACKOFF_MS = 30_000;

export const agentRooms = createStore<AgentRoomsState>(() => ({ rooms: {} }));

const lingering = new Map<string, ReturnType<typeof setTimeout>>();

const update = (agentId: string, change: Partial<Entry>) =>
  agentRooms.setState((state) => {
    const entry = state.rooms[agentId];
    if (!entry) return state;
    return { rooms: { ...state.rooms, [agentId]: { ...entry, ...change } } };
  });

const entry = (agentId: string): Entry | undefined => agentRooms.getState().rooms[agentId];

/** Subscribe what is wanted, unsubscribe what is not. */
const settle = (agentId: string) => {
  const current = entry(agentId);
  const room = current?.room;
  if (!current || !room) return;
  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.trackPublications.values()) {
      const wanted = (current.wanted[publication.trackName] ?? 0) > 0;
      if (publication.isSubscribed !== wanted) publication.setSubscribed(wanted);
    }
  }
};

const join = async (agentId: string, connector: Connector, attempt = 0): Promise<void> => {
  if (!entry(agentId)) return;
  update(agentId, { status: "connecting", error: null });
  const room = new Room({ adaptiveStream: true });
  try {
    const token = await connector.token(agentId);
    await room.connect(connector.url, token, { autoSubscribe: false });
  } catch (error) {
    void room.disconnect();
    if (!entry(agentId)) return;
    update(agentId, { status: "error", error: error instanceof Error ? error.message : String(error) });
    const delay = Math.min(1_000 * 2 ** attempt, MAX_BACKOFF_MS);
    setTimeout(() => void join(agentId, connector, attempt + 1), delay);
    return;
  }
  if (!entry(agentId)) {
    // Nobody watches any more: it was released while connecting.
    void room.disconnect();
    return;
  }
  // A track the agent (re)publishes is subscribed when someone wants it.
  room.on(RoomEvent.TrackPublished, () => settle(agentId));
  room.on(RoomEvent.Disconnected, () => {
    if (entry(agentId)?.room !== room) return;
    update(agentId, { room: null });
    // Still watched: join again (a server restart, a dropped network).
    void join(agentId, connector);
  });
  update(agentId, { room, status: "connected", error: null });
  settle(agentId);
};

const acquire = (agentId: string, connector: Connector) => {
  const timer = lingering.get(agentId);
  if (timer) {
    clearTimeout(timer);
    lingering.delete(agentId);
  }
  const current = entry(agentId);
  if (current) {
    update(agentId, { refs: current.refs + 1 });
    return;
  }
  agentRooms.setState((state) => ({
    rooms: { ...state.rooms, [agentId]: { refs: 1, status: "connecting", error: null, room: null, wanted: {} } },
  }));
  void join(agentId, connector);
};

const release = (agentId: string) => {
  const current = entry(agentId);
  if (!current) return;
  if (current.refs > 1) {
    update(agentId, { refs: current.refs - 1 });
    return;
  }
  update(agentId, { refs: 0 });
  lingering.set(
    agentId,
    setTimeout(() => {
      lingering.delete(agentId);
      const last = entry(agentId);
      if (!last || last.refs > 0) return;
      agentRooms.setState((state) => {
        const { [agentId]: _gone, ...rest } = state.rooms;
        return { rooms: rest };
      });
      void last.room?.disconnect();
    }, LINGER_MS),
  );
};

const want = (agentId: string, track: string, delta: number) => {
  const current = entry(agentId);
  if (!current) return;
  const count = Math.max(0, (current.wanted[track] ?? 0) + delta);
  update(agentId, { wanted: { ...current.wanted, [track]: count } });
  settle(agentId);
};

/** The agent's room while this view is mounted: joined (or joining) for as long as anyone watches. */
export const useAgentRoom = (agentId: string | undefined, connector: Connector | undefined) => {
  useEffect(() => {
    if (!agentId || !connector) return;
    acquire(agentId, connector);
    return () => release(agentId);
    // The connector is the same LiveKit and the same mutation for every view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, connector?.url]);
  return useStore(agentRooms, (state) => (agentId ? state.rooms[agentId] : undefined));
};

/** Subscribe the track named `key` in the agent's room while this view shows it. */
export const useWatchedTrack = (agentId: string | undefined, key: string | undefined) => {
  useEffect(() => {
    if (!agentId || !key) return;
    want(agentId, key, 1);
    return () => want(agentId, key, -1);
  }, [agentId, key]);
};

import type { Room } from "livekit-client";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * The one call this window is in.
 *
 * The LiveKit connection lives in `CallConnection`, a lovekit `background`
 * builtin mounted for as long as lovekit is up, so a call survives
 * navigation: the call page and the rail island are two views of this store,
 * and `room` is the connected `Room` either can drive (mute, leave) through
 * LiveKit's `RoomContext`.
 */
export type ActiveCall = { id: string; title: string };

export type CallStatus = "idle" | "connecting" | "connected" | "error";

export type CallState = {
  call: ActiveCall | null;
  token: string | null;
  status: CallStatus;
  error: string | null;
  room: Room | null;
  /** When this window joined, for the island's clock. */
  joinedAt: number | null;
  /** Hand over a token: the connection mounts and connects. */
  start: (call: ActiveCall, token: string) => void;
  setRoom: (room: Room | null) => void;
  connected: () => void;
  fail: (message: string) => void;
  /** Hang up: disconnects and forgets the call. Safe to call twice. */
  leave: () => void;
};

const IDLE = { call: null, token: null, status: "idle" as const, error: null, room: null, joinedAt: null };

export const callStore = createStore<CallState>((set, get) => ({
  ...IDLE,
  start: (call, token) => {
    const previous = get().room;
    if (previous) void previous.disconnect();
    set({ call, token, status: "connecting", error: null, room: null, joinedAt: null });
  },
  setRoom: (room) => set({ room }),
  connected: () => set({ status: "connected", joinedAt: Date.now() }),
  fail: (message) => set({ status: "error", error: message }),
  leave: () => {
    const { room } = get();
    if (room) void room.disconnect();
    set(IDLE);
  },
}));

export const useCallState = <T>(selector: (state: CallState) => T): T => useStore(callStore, selector);

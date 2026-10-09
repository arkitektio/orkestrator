import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import type { ListCallFragment } from "@/lovekit/api/graphql";

/**
 * The calls someone in the organization started while this app was open and
 * that the user has neither joined nor put away: what the rail announces.
 *
 * Only what the `calls` subscription delivered lands here. A call already in
 * progress when the app opened is not news; it is under "Join calls" on the
 * home page. `CallAnnouncementsWatcher` feeds and prunes this store, the
 * island (`CallAnnouncementIsland`) draws it.
 */
export type CallAnnouncementState = {
  /** Newest first. */
  calls: ListCallFragment[];
  /** A call just started. Announced once: a second signal for it changes nothing. */
  announce: (call: ListCallFragment) => void;
  /** Joined or put away: it stops being announced on this device. */
  dismiss: (id: string) => void;
  /**
   * What the server says is still live among the calls that were `asked`
   * about: the ended ones go, the others take the fresh row (its participant
   * count). A call announced after the question was sent is left alone.
   */
  sync: (asked: readonly string[], live: readonly ListCallFragment[]) => void;
  clear: () => void;
};

export const callAnnouncementStore = createStore<CallAnnouncementState>((set) => ({
  calls: [],
  announce: (call) =>
    set((state) => (state.calls.some((known) => known.id === call.id) ? state : { calls: [call, ...state.calls] })),
  dismiss: (id) =>
    set((state) => (state.calls.some((call) => call.id === id) ? { calls: state.calls.filter((call) => call.id !== id) } : state)),
  sync: (asked, live) =>
    set((state) => {
      const fresh = new Map(live.map((call) => [call.id, call]));
      return {
        calls: state.calls.flatMap((call) => {
          if (!asked.includes(call.id)) return [call];
          const current = fresh.get(call.id);
          return current ? [current] : [];
        }),
      };
    }),
  clear: () => set((state) => (state.calls.length ? { calls: [] } : state)),
}));

export const useCallAnnouncements = <T>(selector: (state: CallAnnouncementState) => T): T =>
  useStore(callAnnouncementStore, selector);

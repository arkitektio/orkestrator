import * as React from "react";

/**
 * When the main thread is free: the next idle period, or after `timeout` ms
 * at the latest. Preview drawings start and serialize only then, so a list
 * of uncached bloks never competes with what the user is doing.
 */
export const whenIdle = (timeout = 2000): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 16);
  });

export type SlotQueue = {
  /** Asks for a slot; `onGrant` runs once one is free and the thread is idle. Returns the release (or the cancel). */
  acquire: (onGrant: () => void) => () => void;
};

type Entry = { state: "waiting" | "granting" | "held" | "done"; onGrant: () => void };

/** A first-in first-out queue of `concurrency` slots, each granted in an idle period. */
export const createSlotQueue = (concurrency = 1, idle: () => Promise<void> = whenIdle): SlotQueue => {
  let active = 0;
  const waiting: Entry[] = [];

  const free = () => {
    active -= 1;
    pump();
  };

  function pump() {
    while (active < concurrency && waiting.length > 0) {
      const entry = waiting.shift()!;
      entry.state = "granting";
      active += 1;
      void idle().then(() => {
        // Released while its idle period was pending: the slot goes to the next one.
        if (entry.state === "done") return free();
        entry.state = "held";
        entry.onGrant();
      });
    }
  }

  return {
    acquire: (onGrant) => {
      const entry: Entry = { state: "waiting", onGrant };
      waiting.push(entry);
      pump();
      return () => {
        const was = entry.state;
        entry.state = "done";
        if (was === "waiting") waiting.splice(waiting.indexOf(entry), 1);
        else if (was === "held") free();
      };
    },
  };
};

/** One preview is drawn at a time, in the whole window: at most one blok (and one WebGL context) offscreen. */
export const previewSlots = createSlotQueue(1);

/** Whether this component may draw now. Asks while `wanted`; gives the slot back when not, or on unmount. */
export const useSnapshotSlot = (wanted: boolean, queue: SlotQueue = previewSlots): boolean => {
  const [granted, setGranted] = React.useState(false);
  React.useEffect(() => {
    if (!wanted) return;
    const release = queue.acquire(() => setGranted(true));
    return () => {
      release();
      setGranted(false);
    };
  }, [queue, wanted]);
  return granted;
};

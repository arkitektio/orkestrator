import { createPressCounter } from "./navigationBindings";

/**
 * The scene's one account of the pointer: every press on the canvas is opened
 * here, and every press opened here ENDS here — exactly once, whatever
 * happened to its release.
 *
 * Why one: a press used to be tracked by whoever cared (the drawer's own
 * "a camera press is in flight" flag, the pin gate's `press`, a tool's
 * `dragging` state), and each waited for the release from a different source —
 * its own mesh's `onPointerUp`, R3F's synthesized `onClick`, the browser's
 * `click`. A release that did not reach the one handler waiting for it (let go
 * outside the canvas, over a panel, on a quad the pan had moved away, or never
 * at all: Alt-Tab, a cancelled pointer) left that flag raised, and the NEXT
 * click was read against it. That is the "click that did not register".
 *
 * So the split is:
 *  - **R3F object handlers say WHERE** (the ray, the hit) and nothing else;
 *  - **the ledger says WHEN** a press began, **WHOSE** it is (the camera's or
 *    the tool's), whether it was a **CLICK**, which press of a multi-click it
 *    was, and — the guarantee — **THAT IT ENDED**.
 *
 * Pure: the DOM comes in as plain events from `shell/pointer/PressLedgerDriver`,
 * so the lifecycle rules are testable without a canvas.
 *
 * ## Timing a reader can rely on
 *
 * The driver feeds this from the window's CAPTURE phase, so:
 *  - in a mesh's `onPointerDown` / `onPointerMove`, `current()` is that press;
 *  - in `onPointerUp` and `onClick`, `current()` is already null and `last()`
 *    is the press that just ended (`owner()` / `count()` answer for either);
 *  - `onEnd` listeners run AFTER the object handlers had their chance at the
 *    release (`settle`), so a tool commits in its `onPointerUp` as before and
 *    uses `onEnd` for whatever is still open once that chance has passed.
 *    A cancelled press has no release to wait for and ends at once.
 */

/** Further than this between press and release is a drag, not a click. */
export const CLICK_SLOP_PX = 4;

export type PressOwner = "camera" | "tool";

/** A pointer event, as much of it as the ledger reads. */
export type PressPoint = {
  pointerId: number;
  x: number;
  y: number;
};

export type PressDown = PressPoint & {
  button: number;
  /** `event.timeStamp`: the multi-click window is measured between presses. */
  at: number;
  shift: boolean;
};

export type Press = {
  /** Unique per ledger, increasing: tells one press from the next. */
  readonly seq: number;
  readonly pointerId: number;
  readonly button: number;
  /**
   * Who the press belongs to. Decided once, when it lands; a middle or right
   * press is always the camera's (`navigationBindings`, rules 3 and 4).
   */
  readonly owner: PressOwner;
  /** Which press of a multi-click: 2 on a double-click's second. Left only. */
  readonly count: number;
  readonly x: number;
  readonly y: number;
  readonly at: number;
  readonly shift: boolean;
  /** The pointer has been further than `CLICK_SLOP_PX` from where it landed. */
  travelled: boolean;
};

export type PressEndReason = "released" | "cancelled";

export type PressEnd = {
  press: Press;
  /**
   * `"cancelled"`: there was no release — the pointer was cancelled, the
   * window lost focus, or another press arrived while this one was still
   * open. Whatever the press had under way is to be dropped, not committed.
   */
  reason: PressEndReason;
  /** Released where it landed. THE click rule: nobody re-derives it. */
  click: boolean;
  /** Where it was let go (where it last was, for a cancelled press). */
  x: number;
  y: number;
};

export type PressLedger = {
  /**
   * A press landed on the canvas. Ends a press still open as cancelled.
   * `leftOwner` answers who a LEFT press belongs to, given which press of a
   * multi-click it is (`navigationBindings.leftPressOwner`, asked by the
   * driver, which is the one that can read the mode).
   */
  down(event: PressDown, leftOwner: (count: number) => PressOwner): Press;
  move(event: PressPoint): void;
  /**
   * The pointer was released. The press is over from here (`current()` is
   * null, `last()` answers) but its `onEnd` waits for `settle`.
   */
  up(event: PressPoint): PressEnd | null;
  /** Tell the listeners of a released press. Idempotent. */
  settle(): void;
  /** No release is coming: end the press now. */
  cancel(): void;
  /** The press in flight, or null. Never a latch. */
  current(): Press | null;
  /** The press that ended last. */
  last(): PressEnd | null;
  /** Whose the press in flight is — or, once released, the one that just ended. */
  owner(): PressOwner;
  /** Its place in a multi-click, same rule. */
  count(): number;
  onDown(listener: (press: Press) => void): () => void;
  onEnd(listener: (end: PressEnd) => void): () => void;
};

const exceedsSlop = (press: Press, x: number, y: number): boolean =>
  Math.hypot(x - press.x, y - press.y) > CLICK_SLOP_PX;

export const createPressLedger = (): PressLedger => {
  const downListeners = new Set<(press: Press) => void>();
  const endListeners = new Set<(end: PressEnd) => void>();
  const countPress = createPressCounter();

  let seq = 0;
  let open: Press | null = null;
  let lastXY = { x: 0, y: 0 };
  let ended: PressEnd | null = null;
  /** A released press whose listeners have not been told yet. */
  let unsettled: PressEnd | null = null;

  const notify = <T,>(listeners: Set<(value: T) => void>, value: T) => {
    // One listener throwing must not keep the others from hearing the end:
    // a tool that fails here would otherwise strand every other tool's press.
    for (const listener of [...listeners]) {
      try {
        listener(value);
      } catch (error) {
        console.error("[scene] press listener failed", error);
      }
    }
  };

  const close = (reason: PressEndReason, x: number, y: number): PressEnd | null => {
    const press = open;
    if (!press) return null;
    open = null;
    if (exceedsSlop(press, x, y)) press.travelled = true;
    ended = { press, reason, click: reason === "released" && !press.travelled, x, y };
    return ended;
  };

  const settle = () => {
    const end = unsettled;
    if (!end) return;
    unsettled = null;
    notify(endListeners, end);
  };

  const cancel = () => {
    settle();
    const end = close("cancelled", lastXY.x, lastXY.y);
    if (end) notify(endListeners, end);
  };

  return {
    down(event, leftOwner) {
      // A press still open means its release was never seen. It ends here at
      // the latest, so nothing is ever read against a press that is not there.
      cancel();
      const left = event.button === 0;
      const count = left ? countPress({ at: event.at, x: event.x, y: event.y }) : 1;
      const press: Press = {
        seq: ++seq,
        pointerId: event.pointerId,
        button: event.button,
        owner: left ? leftOwner(count) : "camera",
        count,
        x: event.x,
        y: event.y,
        at: event.at,
        shift: event.shift,
        travelled: false,
      };
      open = press;
      lastXY = { x: event.x, y: event.y };
      notify(downListeners, press);
      return press;
    },
    move(event) {
      if (!open || open.pointerId !== event.pointerId) return;
      lastXY = { x: event.x, y: event.y };
      if (!open.travelled && exceedsSlop(open, event.x, event.y)) open.travelled = true;
    },
    up(event) {
      // Another pointer's release is not this press's. (Not matched on the
      // button: with several held, the browser reports one release, for the
      // last of them to come up.)
      if (!open || open.pointerId !== event.pointerId) return null;
      settle();
      unsettled = close("released", event.x, event.y);
      return unsettled;
    },
    settle,
    cancel,
    current: () => open,
    last: () => ended,
    owner: () => open?.owner ?? ended?.press.owner ?? "tool",
    count: () => open?.count ?? ended?.press.count ?? 1,
    onDown(listener) {
      downListeners.add(listener);
      return () => {
        downListeners.delete(listener);
      };
    },
    onEnd(listener) {
      endListeners.add(listener);
      return () => {
        endListeners.delete(listener);
      };
    },
  };
};

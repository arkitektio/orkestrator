/**
 * How long zarr reading may be quiet before what it holds is given back: the
 * codec workers (each keeps a wasm heap sized for the largest chunk it ever
 * decoded, which never shrinks) and the module-level chunk / byte caches.
 *
 * These live for the whole window and are shared by every reader (scenes,
 * charts, elektro, probes), so "the last scene closed" is not the signal —
 * a minute with no read at all is. The next read pays a worker cold start
 * and a refetch, which is what a first read costs anyway.
 */
export const ZARR_IDLE_RELEASE_MS = 60_000;

/**
 * Calls `release` once `touch` has not been called for `idleMs`.
 *
 * One timer at most, armed by the first touch after a release and re-armed
 * for the remainder when it fires early, so a busy cache costs a `Date.now()`
 * per touch and an idle one costs nothing.
 */
export class IdleRelease {
  private lastTouch = 0;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly release: () => void,
    private readonly idleMs: number = ZARR_IDLE_RELEASE_MS,
  ) {}

  touch(): void {
    this.lastTouch = Date.now();
    if (this.timer === undefined) this.arm(this.idleMs);
  }

  cancel(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private arm(delay: number): void {
    this.timer = setTimeout(this.fire, delay);
    // Node (tests): an armed release must not keep the process alive.
    (this.timer as { unref?: () => void }).unref?.();
  }

  private readonly fire = (): void => {
    this.timer = undefined;
    const quiet = Date.now() - this.lastTouch;
    if (quiet < this.idleMs) {
      this.arm(this.idleMs - quiet);
      return;
    }
    this.release();
  };
}

/**
 * Calls `fn` at most once per `interval`, and never drops the last value.
 *
 * The first call goes through at once; calls that follow within the interval
 * are held, and only the latest of them is sent when the interval ends. A drag
 * that produces a value per pointer move therefore becomes a handful of calls,
 * the final one carrying where the drag stopped.
 */
export type Throttled<T> = {
  (value: T): void;
  /** Send a held value now. */
  flush: () => void;
  /** Drop a held value. */
  cancel: () => void;
};

export const throttle = <T,>(fn: (value: T) => void, interval: number): Throttled<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let held: {value: T} | undefined;

  const open = () => {
    timer = setTimeout(() => {
      timer = undefined;
      if (!held) return;
      const {value} = held;
      held = undefined;
      fn(value);
      open();
    }, interval);
  };

  const throttled = ((value: T) => {
    if (timer !== undefined) {
      held = {value};
      return;
    }
    fn(value);
    open();
  }) as Throttled<T>;

  throttled.flush = () => {
    if (!held) return;
    const {value} = held;
    held = undefined;
    fn(value);
  };
  throttled.cancel = () => {
    held = undefined;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return throttled;
};

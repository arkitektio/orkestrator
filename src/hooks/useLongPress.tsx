import { SyntheticEvent, useCallback, useRef, useState } from "react";

export type LongPressFunc = (event: SyntheticEvent) => void;
export type ClickFunc = (event: SyntheticEvent) => void;
export type LongPressOptions = {
  shouldPreventDefault: boolean;
  delay: number;
};

export type LongPressReturnProps = {
  onMouseDown: (event: SyntheticEvent) => void;
  onTouchStart: (event: SyntheticEvent) => void;
  onMouseUp: (event: SyntheticEvent) => void;
  onMouseLeave: (event: SyntheticEvent) => void;
  onTouchEnd: (event: SyntheticEvent) => void;
};

const useLongPress = (
  onLongPress: LongPressFunc,
  onClick: ClickFunc,
  { shouldPreventDefault = true, delay = 300 }: LongPressOptions
): LongPressReturnProps => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<any>();
  const target = useRef<any>();

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener("touchend", preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered && onClick(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener("touchend", preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e) => start(e),
    onTouchStart: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchEnd: (e) => clear(e),
  };
};

const isTouchEvent = (event: TouchEvent) => {
  return "touches" in event;
};

const preventDefault = (event: TouchEvent) => {
  if (!isTouchEvent(event)) return;

  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

export default useLongPress;

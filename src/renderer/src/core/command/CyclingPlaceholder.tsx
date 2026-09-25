import { cn } from "@/core/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export const PALETTE_PLACEHOLDERS = ["Search…", "Ask…", "Do…"] as const;

/** Whether this window currently has focus, kept live via focus/blur. */
const useWindowFocused = () => {
  const [focused, setFocused] = useState(() =>
    typeof document === "undefined" ? true : document.hasFocus(),
  );

  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return focused;
};

/**
 * A placeholder that slowly cross-fades through what the palette is for —
 * but only while the window is INACTIVE. While you are using the app it rests
 * on the first word; it returns there as soon as the window regains focus.
 *
 * A native `placeholder` can't animate, so this is an overlay: render it on top
 * of an EMPTY input (it ignores pointer events, so clicks reach the input).
 * With reduced motion it never cycles.
 */
export const CyclingPlaceholder = ({
  words = PALETTE_PLACEHOLDERS,
  interval = 3000,
  className,
}: {
  words?: readonly string[];
  interval?: number;
  className?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const focused = useWindowFocused();
  const [index, setIndex] = useState(0);
  const cycling = !focused && !reduceMotion && words.length > 1;

  useEffect(() => {
    if (!cycling) {
      setIndex(0);
      return;
    }
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % words.length),
      interval,
    );
    return () => window.clearInterval(timer);
  }, [cycling, words.length, interval]);

  return (
    <span
      aria-hidden
      className={cn("pointer-events-none relative block overflow-hidden", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index % words.length]}
          className="block truncate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {words[index % words.length]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default CyclingPlaceholder;

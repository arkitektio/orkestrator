import { cn } from "@/core/util/utils";
import { Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { finishVoiceSession, VOICE_BADGE_ATTRIBUTE } from "../session";
import { useVoiceState } from "../store";

/**
 * The one visible sign that dictation is on: a microphone with a ring that
 * follows the input level and pulses while the VAD hears speech. Click to
 * stop. Two placements — inside the palette's input row, and floating at the
 * corner of whichever field is being filled — share this.
 */
const MicBadge = ({ className }: { className?: string }) => {
  const { listening, finishing, speaking, level, trigger } = useVoiceState(
    useShallow((state) => ({
      listening: state.session?.listening ?? false,
      finishing: state.session?.finishing ?? false,
      speaking: state.session?.speaking ?? false,
      level: state.session?.level ?? 0,
      trigger: state.session?.trigger ?? "hold",
    })),
  );
  const title = finishing
    ? "Transcribing…"
    : !listening
      ? "Opening microphone…"
      : trigger === "hold"
        ? "Listening — release the key to transcribe"
        : "Listening — click, press the hotkey or pause to stop";
  // Speech peaks around 0.1–0.3 RMS; scale so ordinary talking fills the ring.
  const scale = 1 + Math.min(1, level * 4) * 0.6;

  return (
    <button
      type="button"
      {...{ [VOICE_BADGE_ATTRIBUTE]: "" }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => finishVoiceSession("badge")}
      title={title}
      aria-label="Stop dictation"
      className={cn(
        "relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary outline-none",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full bg-primary/15 transition-transform duration-75",
          speaking && "animate-pulse",
          finishing && "animate-spin border-t-2 border-primary/60 bg-transparent",
          !listening && !finishing && "opacity-40",
        )}
        style={{ transform: `scale(${scale})` }}
      />
      <Mic className="relative h-3.5 w-3.5" />
    </button>
  );
};

/** In the palette's input row; nothing unless the palette is being dictated into. */
export const VoicePaletteBadge = () => {
  const active = useVoiceState((state) => state.session?.mode === "palette");
  return active ? <MicBadge /> : null;
};

/** Floating at the top-right corner of the field being filled. */
export const VoiceFillBadge = () => {
  const target = useVoiceState((state) =>
    state.session?.mode === "fill" ? state.session.target : null,
  );
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let frame = 0;
    let last = "";
    const track = () => {
      const next = target.getBoundingClientRect();
      const key = `${next.top}:${next.right}:${next.width}:${next.height}`;
      if (key !== last) {
        last = key;
        setRect(next);
      }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (!target || !rect) return null;
  return createPortal(
    <div
      className="pointer-events-auto fixed z-[100]"
      style={{ top: rect.top + rect.height / 2 - 12, left: rect.right - 30 }}
    >
      <MicBadge className="rounded-full border border-border/60 bg-popover shadow-md" />
    </div>,
    document.body,
  );
};

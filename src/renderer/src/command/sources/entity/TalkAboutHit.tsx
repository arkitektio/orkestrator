import { useTalkAbout } from "@/providers/smart/extensions/alpaka/useTalkAbout";
import { cn } from "@/lib/utils";
import { MessageSquareMore } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * The "talk about this" chip on a search hit.
 *
 * Opens an Alpaka room about the found structure with whatever was typed as
 * the first message — so "what is hela s3 about" finds the dataset AND asks the
 * question. Its own component, so `EntityRow` can wrap it in `Guard.Alpaka`:
 * the room mutation only exists when that service is up.
 *
 * `requested` is a counter the row bumps on ⌥+Enter — the keyboard's way to
 * this chip, since the row itself is what has focus in the palette.
 */
export const TalkAboutHit = ({
  identifier,
  id,
  label,
  prompt,
  requested,
  onDone,
}: {
  identifier: string;
  id: string;
  label: string;
  prompt?: string;
  requested: number;
  onDone?: () => void;
}) => {
  const { openRoom, isOpening } = useTalkAbout({
    title: () => `Talk about ${label}`,
    onDone,
  });
  const talk = () => void openRoom([{ identifier, object: { id } }], prompt);

  // Fire once per bump, never on mount.
  const seen = useRef(requested);
  useEffect(() => {
    if (requested === seen.current) return;
    seen.current = requested;
    talk();
    // `talk` closes over the latest props; only the bump should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  return (
    <button
      type="button"
      aria-label={`Talk about ${label}`}
      title={prompt ? `Talk about ${label}: "${prompt}"` : `Talk about ${label} (⌥⏎)`}
      disabled={isOpening}
      // A click here must not also select the row (which navigates).
      onClick={(e) => {
        e.stopPropagation();
        talk();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "ml-auto flex h-6 shrink-0 items-center gap-1 rounded-md border border-border/60 px-1.5 text-[11px] text-muted-foreground transition-colors",
        "hover:border-primary/40 hover:bg-primary/10 hover:text-foreground disabled:opacity-50",
      )}
    >
      <MessageSquareMore className="h-3 w-3" />
      {isOpening ? "Opening…" : "Talk"}
    </button>
  );
};

export default TalkAboutHit;

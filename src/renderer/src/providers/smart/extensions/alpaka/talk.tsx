import { Columns2, ExternalLink, MessageSquareMore } from "lucide-react";

import { CommandActionRow } from "../CommandActionRow";
import type { PassDownProps } from "../types";
import { canTalkInNewWindow, useTalkAbout, type TalkTarget } from "./useTalkAbout";

const buildRoomTitle = (props: PassDownProps) => {
  if (props.objects.length === 1) {
    return `Talk about ${props.objects[0].identifier}`;
  }

  return `Talk about ${props.objects.length} structures`;
};

/**
 * How each target reads in the menu. The default row keeps the plain wording
 * it always had — the other two say where the room goes, because that is the
 * only thing that differs.
 */
const TARGETS: Record<TalkTarget, { title: string; where: string; icon: typeof MessageSquareMore }> =
  {
    here: {
      title: "Talk about structure",
      where: "",
      icon: MessageSquareMore,
    },
    side: {
      title: "Talk about structure to the side",
      where: " beside this page",
      icon: Columns2,
    },
    window: {
      title: "Talk about structure in a new window",
      where: " in a window of its own",
      icon: ExternalLink,
    },
  };

/** The targets on offer here — the popout only where a window can be opened. */
export const talkTargets = (): readonly TalkTarget[] =>
  canTalkInNewWindow() ? (["here", "side", "window"] as const) : (["here", "side"] as const);

export const TalkAboutButton = ({
  target = "here",
  ...props
}: PassDownProps & { target?: TalkTarget }) => {
  const { openRoom, isOpening, error } = useTalkAbout({
    title: () => buildRoomTitle(props),
    onDone: () => props.onDone?.({ kind: "local" }),
    onError: props.onError,
  });

  const { title, where, icon } = TARGETS[target];
  const label = props.filter ? `${title}: "${props.filter}"` : title;

  return (
    <CommandActionRow
      onSelect={() => {
        void openRoom(props.objects, props.filter, target);
      }}
      value={props.filter ? `${title}: ${props.filter}` : title}
      title={label}
      description={
        props.filter
          ? `Create a room${where}, attach the selected structures and prefill with "${props.filter}"`
          : props.objects.length === 1
            ? `Open an Alpaka room${where} about the selected structure`
            : `Open an Alpaka room${where} about ${props.objects.length} selected structures`
      }
      icon={icon}
      disabled={isOpening}
      trailing={
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isOpening ? <span>Opening…</span> : null}
          {error ? <span className="text-destructive">{error}</span> : null}
        </span>
      }
    />
  );
};

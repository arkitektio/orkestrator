import { MessageSquareMore } from "lucide-react";

import { CommandActionRow } from "../CommandActionRow";
import type { PassDownProps } from "../types";
import { useTalkAbout } from "./useTalkAbout";

const ACTION_TITLE = "Talk about structure";
const ACTION_DESCRIPTION = "Open an Alpaka room about the selected structure";

const buildRoomTitle = (props: PassDownProps) => {
  if (props.objects.length === 1) {
    return `Talk about ${props.objects[0].identifier}`;
  }

  return `Talk about ${props.objects.length} structures`;
};

export const TalkAboutButton = (props: PassDownProps) => {
  const { openRoom, isOpening, error } = useTalkAbout({
    title: () => buildRoomTitle(props),
    onDone: () => props.onDone?.({ kind: "local" }),
    onError: props.onError,
  });

  return (
    <CommandActionRow
      onSelect={() => {
        void openRoom(props.objects, props.filter);
      }}
      value={props.filter ? `Talk about structure: ${props.filter}` : ACTION_TITLE}
      title={props.filter ? `Talk about structure: "${props.filter}"` : ACTION_TITLE}
      description={
        props.filter
          ? `Create a room, attach the selected structures and prefill with "${props.filter}"`
          : props.objects.length === 1
            ? ACTION_DESCRIPTION
            : `Open an Alpaka room about ${props.objects.length} selected structures`
      }
      icon={MessageSquareMore}
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

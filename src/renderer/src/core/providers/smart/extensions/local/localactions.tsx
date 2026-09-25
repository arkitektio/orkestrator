import { usePerformAction } from "@/core/smart/localactions/useLocalAction";
import { Action, ActionState } from "@/core/lib/localactions/LocalActionProvider";
import { Sparkles } from "lucide-react";
import { CommandActionRow } from "../CommandActionRow";
import type { OnDone } from "../types";

/**
 * The local-action row, and `Actions`: the palette-style list for callers
 * that bring their own `ActionState`. The menu's section is a descriptor in
 * `./sections.tsx`.
 */

export const LocalActionCommand = (props: {
  action: Action;
  state: ActionState;
  onDone?: OnDone;
  /** Registry id, so a reopened palette re-attaches to a run already going. */
  actionId?: string;
}) => {
  const { assign, progress, confirmationDialog } = usePerformAction(props);
  const Icon = props.action.icon ?? Sparkles;

  return (
    <>
      <CommandActionRow
        onSelect={assign}
        title={props.action.title}
        description={props.action.description}
        icon={Icon}
        progress={progress}
      />
      {confirmationDialog}
    </>
  );
};

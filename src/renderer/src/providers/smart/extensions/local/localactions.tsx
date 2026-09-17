import { usePerformAction } from "@/app/hooks/useLocalAction";
import {
  useMatchingActionEntries,
  usePinnedActionIds,
} from "@/app/localactions";
import {
} from "@/components/ui/command";
import { Action, ActionState, orderActionEntries } from "@/lib/localactions/LocalActionProvider";
import { CommandGroup } from "cmdk";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { CommandActionRow } from "../CommandActionRow";
import type { OnDone, PassDownProps } from "../types";

export const LocalActionCommand = (props: {
  action: Action;
  state: ActionState;
  onDone?: OnDone;
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

export const Actions = (props: {
  state: ActionState;
  filter?: string;
  onDone?: OnDone;
}) => {
  const pinnedActionIds = usePinnedActionIds();
  const matchingActions = useMatchingActionEntries({
    state: props.state,
    search: props.filter,
  });

  const actions = useMemo(
    () => orderActionEntries(matchingActions, pinnedActionIds, props.filter),
    [matchingActions, pinnedActionIds, props.filter],
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <CommandGroup
      heading={
        <span className="font-light text-xs w-full items-center ml-2 w-full">
          Default
        </span>
      }
    >
      {actions.map(({ id, action }) => (
        <LocalActionCommand
          key={id}
          action={action}
          state={props.state}
          onDone={props.onDone}
        />
      ))}
    </CommandGroup>
  );
};

export const ApplicableLocalActions = (props: PassDownProps) => {
  return (
    <Actions
      state={{
        left: props.objects,
        right: props.partners,
        isCommand: false,
      }}
      filter={props.filter}
      onDone={props.onDone}
    />
  );
};

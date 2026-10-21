import { toWire } from "@/core/smart/structure";
import { useDialog } from "@/core/dialogs/registry";
import { buildAssignInput } from "@/rekuest/assign";
import { Badge } from "@/core/ui/badge";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import React from "react";
import { assignErrorMessage } from "../lib/assignError";
import { v4 as uuidv4 } from "uuid";
import { TaskEventFragment, ListShortcutFragment, PortKind } from "@/rekuest/api/graphql";
import { failureFallback } from "@/rekuest/lib/taskTracker";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { Zap } from "lucide-react";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { useResultSink } from "@/core/smart/extensions/results";
import {
  OpenResultButtons,
  runTracker,
  runsDirectly,
  useOpenResult,
  type OpenableReturn,
} from "./openResult";
import { bindShortcutKey } from "./shortcutKeybinds";
import { actionAvailability } from "./actions";
import { BlokLogo } from "@/rekuest/components/logo/BlokLogo";
import { materializeErrorMessage, resolveRun } from "./materialize";

/** The Shortcuts row; the section is a descriptor in `./sections.tsx`. */

const getErrorMessage = assignErrorMessage;

/**
 * A selection the shortcut's arguments cannot take. The menu only offers rows
 * whose arguments match, so this is a bug: the detail goes to the console, the
 * row says it could not run.
 */
const selectionMismatch = (detail: string, shortcut: { id: string }) => {
  console.error(`[rekuest] ${detail}`, shortcut.id);
  return new Error("This shortcut can't take the selected objects.");
};

const buildShortcutArgs = (
  shortcut: ListShortcutFragment,
  props: SmartContextProps,
): Record<string, unknown> => {
  const keys: Record<string, unknown> = {};

  if (props.objects.length === 1) {
    const key = shortcut.args?.at(0)?.key;
    if (!key) {
      throw selectionMismatch("No key found for self", shortcut);
    }
    keys[key] = toWire(props.objects[0]);
  }

  if (props.objects.length > 1) {
    if (shortcut.args.at(0)?.kind !== PortKind.List) {
      throw selectionMismatch("Should be a list but is not", shortcut);
    }
    const key = shortcut.args?.at(0)?.key;
    if (!key) {
      throw selectionMismatch("No key found for self", shortcut);
    }
    keys[key] = props.objects.map(toWire);
  }

  if (props.partners && props.partners.length === 1) {
    const key = shortcut.args?.at(1)?.key;
    if (!key) {
      throw selectionMismatch("No key found for partner", shortcut);
    }
    keys[key] = toWire(props.partners[0]);
  }

  if (props.partners && props.partners.length > 1) {
    if (shortcut.args.at(1)?.kind !== PortKind.List) {
      throw selectionMismatch("Should be a list but is not", shortcut);
    }
    const key = shortcut.args?.at(1)?.key;
    if (!key) {
      throw selectionMismatch("No key found for partner", shortcut);
    }
    keys[key] = props.partners.map(toWire);
  }

  return keys;
};

export const ShortcutButton = (
  props: SmartContextProps & { shortcut: ListShortcutFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  // Depend on the individual fields, not `props` (a fresh object every render),
  // so the callbacks below — and the window keydown effect that depends on
  // them — stay stable across renders.
  const { objects, partners, onDone, onError, materialize } = props;
  const [doing, setDoing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(0);

  const doStuff = React.useCallback(
    (event: TaskEventFragment) => {
      if (event.kind === "COMPLETED") {
        setDoing(false);
        setProgress(null);
        onDone?.({ event, kind: "shortcut" });
      }
      if (
        event.kind === "FAILED" ||
        event.kind === "CRITICAL" ||
        event.kind === "LOST"
      ) {
        const message = event.message || failureFallback(event.kind);
        setDoing(false);
        setProgress(null);
        setError(message);
        onError?.(message);
      }
      if (event.kind === "PROGRESS") {
        setProgress(event.progress || 0);
      }
    },
    [onDone, onError],
  );

  const thenOpen = useOpenResult();
  const sink = useResultSink();

  const conditionalAssign = React.useCallback(
    async (shortcut: ListShortcutFragment, open?: OpenableReturn) => {
      let run: SmartContextProps = { objects, partners };
      if (materialize) {
        // Running while the object it runs on is made.
        setDoing(true);
        try {
          run = await resolveRun({ objects, partners, materialize });
        } catch (error) {
          const message = materializeErrorMessage(error);
          setDoing(false);
          setError(message);
          onError?.(message);
          return;
        }
        setDoing(false);
      }
      let keys: Record<string, unknown>;
      try {
        keys = buildShortcutArgs(shortcut, run);
      } catch (error) {
        const message = getErrorMessage(error);
        setError(message);
        onError?.(message);
        return;
      }

      const unknownKeys = shortcut.args.filter((arg) => arg.key && !keys[arg.key]);
      if (unknownKeys.length >= 1) {
        openDialog("assign", {
          target: { action: shortcut.action.id },
          args: { ...keys, ...shortcut.savedArgs },
          hidden: { ...keys, ...shortcut.savedArgs },
          track: runTracker(sink, shortcut.returns, doStuff, { action: shortcut.action.id, on: keys }),
        });
        return;
      }

      const reference = uuidv4();
      // Also on the rail (`runTracker`): the popover holding this row closes on
      // select, so the task island is the only surface left for the run.
      const untrack = runTracker(
        sink,
        shortcut.returns,
        open ? thenOpen(open, doStuff) : doStuff,
        { action: shortcut.action.id, on: keys },
      )(reference);

      try {
        await assign(buildAssignInput({
          action: shortcut.action.id,
          args: {
            ...keys,
            ...shortcut.savedArgs,
          },
          reference,
        }));
        setDoing(true);
        setError(null);
      } catch (error) {
        untrack();
        const message = getErrorMessage(error);
        // Inline on the row, like a task that fails after it started.
        setError(message);
        onError?.(message);
      }
    },
    [assign, doStuff, thenOpen, sink, openDialog, objects, partners, materialize, onError],
  );

  React.useEffect(() => {
    if (!props.shortcut.bindNumber) {
      return undefined;
    }
    return bindShortcutKey(String(props.shortcut.bindNumber), () => {
      void conditionalAssign(props.shortcut);
    });
  }, [props.shortcut, conditionalAssign]);

  return (
    <CommandActionRow
      onSelect={() => conditionalAssign(props.shortcut)}
      value={props.shortcut.id}
      title={props.shortcut.name}
      description={props.shortcut.description || (props.shortcut.bindNumber ? `Shortcut ${props.shortcut.bindNumber}` : undefined)}
      icon={Zap}
      // The action it runs, by its logo when it has one.
      leading={props.shortcut.action.logo ? <BlokLogo blok={props.shortcut.action.logo} className="h-full w-full" /> : undefined}
      progress={progress}
      running={doing}
      failure={error ? { title: "Could not run", detail: error } : null}
      unavailable={actionAvailability(props.shortcut.action)}
      buttons={
        runsDirectly(props.shortcut.args, props) ? (
          <OpenResultButtons
            returns={props.shortcut.returns}
            onRun={(port) => conditionalAssign(props.shortcut, port)}
          />
        ) : null
      }
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {props.shortcut.allowQuick ? <LightningBoltIcon className="h-4 w-4 text-muted-foreground" /> : null}
          {props.shortcut.bindNumber ? (
            <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px]">
              {props.shortcut.bindNumber}
            </Badge>
          ) : null}
        </span>
      }
    />
  );
};

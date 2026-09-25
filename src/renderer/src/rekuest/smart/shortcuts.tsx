import { toWire } from "@/core/lib/structure";
import { useDialog } from "@/core/dialogs/registry";
import { buildAssignInput } from "@/rekuest/assign";
import { Badge } from "@/core/components/ui/badge";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import React from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { TaskEventFragment, ListShortcutFragment, PortKind } from "@/rekuest/api/graphql";
import { trackTask } from "@/rekuest/lib/taskTracker";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { Zap } from "lucide-react";
import { CommandActionRow } from "@/core/providers/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/providers/smart/extensions/types";
import { bindShortcutKey } from "./shortcutKeybinds";

/** The Shortcuts row; the section is a descriptor in `./sections.tsx`. */

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const buildShortcutArgs = (
  shortcut: ListShortcutFragment,
  props: SmartContextProps,
): Record<string, unknown> | null => {
  const keys: Record<string, unknown> = {};

  if (props.objects.length === 1) {
    const key = shortcut.args?.at(0)?.key;
    if (!key) {
      toast.error("No key found for self");
      return null;
    }
    keys[key] = toWire(props.objects[0]);
  }

  if (props.objects.length > 1) {
    if (shortcut.args.at(0)?.kind !== PortKind.List) {
      toast.error("Should be a list but is not");
      return null;
    }
    const key = shortcut.args?.at(0)?.key;
    if (!key) {
      toast.error("No key found for self");
      return null;
    }
    keys[key] = props.objects.map(toWire);
  }

  if (props.partners && props.partners.length === 1) {
    const key = shortcut.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
    }
    keys[key] = toWire(props.partners[0]);
  }

  if (props.partners && props.partners.length > 1) {
    if (shortcut.args.at(1)?.kind !== PortKind.List) {
      toast.error("Should be a list but is not");
      return null;
    }
    const key = shortcut.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
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
  const { objects, partners, onDone, onError } = props;
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
      if (event.kind === "FAILED" || event.kind === "CRITICAL") {
        const message = event.message || "Unknown error";
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

  const conditionalAssign = React.useCallback(
    async (shortcut: ListShortcutFragment) => {
      const keys = buildShortcutArgs(shortcut, { objects, partners });
      if (!keys) {
        return;
      }

      const unknownKeys = shortcut.args.filter((arg) => arg.key && !keys[arg.key]);
      if (unknownKeys.length >= 1) {
        openDialog("actionassign", {
          id: shortcut.action.id,
          args: { ...keys, ...shortcut.savedArgs },
          hidden: { ...keys, ...shortcut.savedArgs },
        });
        return;
      }

      const reference = uuidv4();
      // Also globally: the popover holding this row closes on select, so the
      // rail's task island is the only surface left for the running task.
      const untrack = trackTask(reference, doStuff, { notifyGlobally: true });

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
        toast.error(message);
        onError?.(message);
      }
    },
    [assign, doStuff, openDialog, objects, partners, onError],
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
      progress={progress}
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {props.shortcut.allowQuick ? <LightningBoltIcon className="h-4 w-4 text-muted-foreground" /> : null}
          {props.shortcut.bindNumber ? (
            <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px]">
              {props.shortcut.bindNumber}
            </Badge>
          ) : null}
          {doing ? <span className="text-xs text-muted-foreground">...</span> : null}
          {error ? <span className="text-xs text-red-800">{error}</span> : null}
        </span>
      }
    />
  );
};

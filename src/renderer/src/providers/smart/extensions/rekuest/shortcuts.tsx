import { useDialog } from "@/app/dialog";
import { buildAssignInput } from "@/rekuest/assign";
import { Badge } from "@/components/ui/badge";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import { CommandGroup } from "cmdk";
import React from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  TaskEventFragment,
  DemandKind,
  ListShortcutFragment,
  PortDemandInput,
  PortKind,
  useShortcutsQuery,
} from "@/rekuest/api/graphql";
import { trackTask } from "@/rekuest/lib/taskTracker";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { Zap } from "lucide-react";
import { CommandActionRow } from "../CommandActionRow";
import type { PassDownProps, SmartContextProps } from "../types";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const buildShortcutDemands = (props: PassDownProps): PortDemandInput[] => {
  const demands: PortDemandInput[] = [];

  if (props.objects.length > 0) {
    if (props.objects.length === 1) {
      demands.push({
        kind: DemandKind.Args,
        matches: [{ at: 0, kind: PortKind.Structure, identifier: props.objects[0].identifier }],
      });
    } else {
      demands.push({
        kind: DemandKind.Args,
        matches: [{
          at: 0,
          kind: PortKind.List,
          children: [{ at: 0, kind: PortKind.Structure, identifier: props.objects[0].identifier }],
        }],
      });
    }
  }

  if (props.partners && props.partners.length > 0) {
    if (props.partners.length === 1) {
      demands.push({
        kind: DemandKind.Args,
        matches: [{ at: 1, kind: PortKind.Structure, identifier: props.partners[0].identifier }],
      });
    } else {
      demands.push({
        kind: DemandKind.Args,
        matches: [{
          at: 1,
          kind: PortKind.List,
          children: [{ at: 0, kind: PortKind.Structure, identifier: props.partners[0].identifier }],
        }],
      });
    }
  }

  if (props.returns) {
    demands.push({
      kind: DemandKind.Returns,
      matches: props.returns.map((identifier, index) => ({
        at: index,
        kind: PortKind.Structure,
        identifier,
      })),
    });
  }

  return demands;
};

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
    keys[key] = props.objects[0].object;
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
    keys[key] = props.objects.map((obj) => ({
      __identifier: obj.identifier,
      object: obj.object,
    }));
  }

  if (props.partners && props.partners.length === 1) {
    const key = shortcut.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
    }
    keys[key] = {
      __identifier: props.partners[0].identifier,
      object: props.partners[0].object,
    };
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
    keys[key] = props.partners.map((obj) => ({
      __identifier: obj.identifier,
      object: obj.object,
    }));
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
      const untrack = trackTask(reference, doStuff);

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === props.shortcut.bindNumber?.toString()) {
        event.preventDefault();
        void conditionalAssign(props.shortcut);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
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

export const ApplicableShortcuts = (props: PassDownProps) => {
  const { data, error } = useShortcutsQuery({
    variables: {
      filters: {
        demands: buildShortcutDemands(props),
        search: props.filter && props.filter !== "" ? props.filter : undefined,
      },
    },
    fetchPolicy: "cache-and-network",
  });

  if (error) {
    return <span className="font-light text-xs w-full items-center ml-2 w-full">Error</span>;
  }

  if (!data || data.shortcuts.length === 0) {
    return null;
  }

  return (
    <CommandGroup
      heading={
        <span className="font-light text-xs w-full items-center ml-2 w-full inline-flex gap-2">
          <Zap className="h-3.5 w-3.5" />
          <span>Shortcuts</span>
        </span>
      }
    >
      {data.shortcuts.map((shortcut) => (
        <ShortcutButton shortcut={shortcut} {...props} key={shortcut.id} />
      ))}
    </CommandGroup>
  );
};

import { useDialog } from "@/app/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import {
  TaskEventFragment,
  DetailImplementationFragment,
  PortKind,
  PrimaryActionFragment,
  useImplementationsQuery,
} from "@/rekuest/api/graphql";
import { buildAssignInput } from "@/rekuest/assign";
import { trackTask } from "@/rekuest/lib/taskTracker";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { Boxes, PlayCircle } from "lucide-react";
import { CommandActionRow } from "@/providers/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/providers/smart/extensions/types";
import {
  ACTIVE_IMPLEMENTATION_ORDERING,
  SMART_IMPLEMENTATION_PAGE_SIZE,
} from "./queries";
import { useRunOnSubmenu } from "./runOnContext";

/**
 * The rows of the rekuest sections (Run, Implementations, Batch, and the
 * "Run on" picker). The sections themselves — queries, headings, status — are
 * descriptors in `./sections.tsx`; the demands they ask with live in
 * `../demands.ts`.
 */

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const formatAssignErrorToast = (message: string) => ({
  title: "Assignment failed",
  detail: message,
});

type AssignableAction = PrimaryActionFragment | DetailImplementationFragment["action"];

const buildActionArgs = (
  action: AssignableAction,
  props: SmartContextProps,
): Record<string, unknown> | null => {
  const keys: Record<string, unknown> = {};

  if (props.objects.length === 1) {
    const key = action.args?.at(0)?.key;
    if (!key) {
      toast.error("No key found for self");
      return null;
    }
    keys[key] = {
      __identifier: props.objects[0].identifier,
      object: props.objects[0].object.id,
    };
  }

  if (props.objects.length > 1) {
    if (action.args.at(0)?.kind !== PortKind.List) {
      toast.error("Should be a list but is not");
      return null;
    }
    const key = action.args?.at(0)?.key;
    if (!key) {
      toast.error("No key found for self");
      return null;
    }
    keys[key] = props.objects.map((item) => ({
      __identifier: item.identifier,
      object: item.object.id,
    }));
  }

  if (props.partners && props.partners.length === 1) {
    const key = action.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
    }
    keys[key] = {
      __identifier: props.partners[0].identifier,
      object: props.partners[0].object.id,
    };
  }

  if (props.partners && props.partners.length > 1) {
    if (action.args.at(1)?.kind !== PortKind.List) {
      toast.error("Should be a list but is not");
      return null;
    }
    const key = action.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
    }
    keys[key] = props.partners.map((item) => ({
      __identifier: item.identifier,
      object: item.object.id,
    }));
  }

  return keys;
};

const getImplementationDescription = (
  implementation: DetailImplementationFragment,
) => [implementation.agent.name, implementation.interface].filter(Boolean).join(" • ");

export const DirectImplementationAssignment = (
  props: SmartContextProps & { action: PrimaryActionFragment },
) => {
  const implementations = useImplementationsQuery({
    variables: {
      filters: {
        actionHash: props.action.hash,
      },
      ordering: ACTIVE_IMPLEMENTATION_ORDERING,
      pagination: { limit: SMART_IMPLEMENTATION_PAGE_SIZE },
    },
    fetchPolicy: "cache-and-network",
  });
  const { assign } = useAssign();
  const { openDialog } = useDialog();

  const onTemplateSelect = async (
    action: PrimaryActionFragment,
    implementation: DetailImplementationFragment,
  ) => {
    const keys = buildActionArgs(action, props);
    if (!keys) {
      return;
    }

    const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
    if (unknownKeys.length >= 1) {
      openDialog("implementationassign", {
        id: implementation.id,
        args: keys,
        hidden: keys,
      });
      return;
    }

    const reference = uuidv4();
    // `notifyGlobally`: the tracker below lives in the "Run on" picker, which
    // closes the instant the run starts. Without this the rail's task island
    // is suppressed too and the task runs with no indicator anywhere.
    const untrack = trackTask(
      reference,
      (event) => {
        props.onDone?.({ event, kind: "action" });
      },
      { notifyGlobally: true },
    );

    try {
      await assign(buildAssignInput({
        implementation: implementation.id,
        args: keys,
        reference,
      }));
    } catch (error) {
      untrack();
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <div className="flex flex-row text-xs">Run on</div>
      <div className="flex flex-col gap-2">
        {implementations.data?.implementations.map((implementation) => (
          <Button
            key={implementation.id}
            variant="outline"
            size="lg"
            className="flex flex-col gap-1"
            onClick={() => onTemplateSelect(props.action, implementation)}
          >
            <div className="text-md text-foreground">{implementation.agent.name}</div>
            <div className="text-xs text-muted-foreground">{implementation.interface}</div>
          </Button>
        ))}
        {implementations.data?.implementations.length === 0 ? (
          <div className="text-xs text-muted-foreground">No implementations</div>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="mt-2"
        onClick={() => {
          const firstObject = props.objects[0];
          if (!firstObject) {
            return;
          }
          openDialog("createshortcut", {
            id: props.action.id,
            args: {
              [props.action.args?.at(0)?.key || "object"]: {
                __identifier: firstObject.identifier,
                object: firstObject.object,
              },
            },
          });
        }}
      >
        Create Shortcut
      </Button>
    </>
  );
};

const useAssignActionProgress = (props: SmartContextProps) => {
  const [doing, setDoing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(0);
  const [errorFlashActive, setErrorFlashActive] = React.useState(false);
  const errorFlashTimeoutRef = React.useRef<number | null>(null);

  const triggerErrorFeedback = React.useCallback(
    (message: string) => {
      setDoing(false);
      setProgress(null);
      setError(message);
      setErrorFlashActive(true);
      props.onError?.(message);

      if (errorFlashTimeoutRef.current) {
        window.clearTimeout(errorFlashTimeoutRef.current);
      }

      errorFlashTimeoutRef.current = window.setTimeout(() => {
        setErrorFlashActive(false);
        errorFlashTimeoutRef.current = null;
      }, 700);
    },
    [props],
  );

  React.useEffect(() => {
    return () => {
      if (errorFlashTimeoutRef.current) {
        window.clearTimeout(errorFlashTimeoutRef.current);
      }
    };
  }, []);

  const onEvent = React.useCallback(
    (event: TaskEventFragment) => {
      if (event.kind === "COMPLETED") {
        setDoing(false);
        setProgress(null);
        setError(null);
        props.onDone?.({ event, kind: "action" });
      }
      if (event.kind === "FAILED" || event.kind === "CRITICAL") {
        const message = event.message || "Unknown error";
        triggerErrorFeedback(message);
      }
      if (event.kind === "PROGRESS") {
        setProgress(event.progress || 0);
      }
    },
    [props, triggerErrorFeedback],
  );

  return {
    doing,
    error,
    errorFlashActive,
    progress,
    setDoing,
    setError,
    onEvent,
    triggerErrorFeedback,
  };
};

export const ImplementationAssignButton = (
  props: SmartContextProps & { implementation: DetailImplementationFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const {
    doing,
    error,
    errorFlashActive,
    progress,
    setDoing,
    setError,
    onEvent,
    triggerErrorFeedback,
  } = useAssignActionProgress(props);

  const conditionalAssign = async (
    implementation: DetailImplementationFragment,
  ) => {
    const keys = buildActionArgs(implementation.action, props);
    if (!keys) {
      return;
    }

    const unknownKeys = implementation.action.args.filter(
      (arg) => arg.key && !keys[arg.key],
    );
    if (unknownKeys.length >= 1) {
      openDialog("implementationassign", {
        id: implementation.id,
        args: keys,
        hidden: keys,
      });
      return;
    }

    const reference = uuidv4();
    // Tracked locally for the row's own progress bar AND globally: the menu
    // this row sits in closes on select, so the rail island is the only place
    // the task can still be watched or cancelled.
    const untrack = trackTask(reference, onEvent, { notifyGlobally: true });

    try {
      await assign(buildAssignInput({
        implementation: implementation.id,
        args: keys,
        reference,
      }));

      setDoing(true);
      setError(null);
    } catch (error) {
      untrack();
      triggerErrorFeedback(getErrorMessage(error));
    }
  };

  const inlineErrorToast = error ? formatAssignErrorToast(error) : null;

  return (
    <CommandActionRow
      onSelect={() => conditionalAssign(props.implementation)}
      value={props.implementation.id}
      title={props.implementation.action.name}
      description={getImplementationDescription(props.implementation)}
      progress={progress}
      className={cn(
        doing && "animate-pulse",
        errorFlashActive &&
          "bg-red/20 data-selected:bg-red-500/20 text-destructive ring-1 ring-inset ring-destructive/35 transition-colors duration-150",
      )}
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {inlineErrorToast ? (
            <span className="max-w-48 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-right text-[10px] leading-tight text-destructive">
              <span className="block font-medium">{inlineErrorToast.title}</span>
              <span className="block truncate">{inlineErrorToast.detail}</span>
            </span>
          ) : null}
        </span>
      }
      icon={PlayCircle}
    />
  );
};

export const BatchImplementationAssignButton = (
  props: SmartContextProps & { implementation: DetailImplementationFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const {
    doing,
    error,
    errorFlashActive,
    progress,
    setDoing,
    setError,
    onEvent,
    triggerErrorFeedback,
  } = useAssignActionProgress(props);

  const conditionalAssign = async (
    implementation: DetailImplementationFragment,
  ) => {
    for (const object of props.objects) {
      const keys = buildActionArgs(implementation.action, {
        ...props,
        objects: [object],
      });

      if (!keys) {
        return;
      }

      const unknownKeys = implementation.action.args.filter(
        (arg) => arg.key && !keys[arg.key],
      );
      if (unknownKeys.length >= 1) {
        openDialog("implementationassign", {
          id: implementation.id,
          args: keys,
          hidden: keys,
        });
        return;
      }

      const reference = uuidv4();
      const untrack = trackTask(reference, onEvent, { notifyGlobally: true });

      try {
        await assign(buildAssignInput({
          implementation: implementation.id,
          args: keys,
          reference,
        }));
        setDoing(true);
        setError(null);
      } catch (error) {
        untrack();
        triggerErrorFeedback(getErrorMessage(error));
      }
    }
  };

  const inlineErrorToast = error ? formatAssignErrorToast(error) : null;

  return (
    <CommandActionRow
      onSelect={() => conditionalAssign(props.implementation)}
      value={props.implementation.id}
      title={props.implementation.action.name}
      description={getImplementationDescription(props.implementation)}
      progress={progress}
      className={cn(
        doing && "animate-pulse",
        errorFlashActive &&
          "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/35 transition-colors duration-150",
      )}
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {inlineErrorToast ? (
            <span className="max-w-48 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-right text-[10px] leading-tight text-destructive">
              <span className="block font-medium">{inlineErrorToast.title}</span>
              <span className="block truncate">{inlineErrorToast.detail}</span>
            </span>
          ) : null}
        </span>
      }
      icon={Boxes}
    />
  );
};

/** Right-click on a Run row opens the menu's shared "Run on" picker. */
const useRunOnRow = (action: PrimaryActionFragment) => {
  const submenu = useRunOnSubmenu();
  return React.useMemo(
    () =>
      submenu
        ? (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            submenu.openFor({ action }, event);
          }
        : undefined,
    [submenu, action],
  );
};

export const AssignButton = (
  props: SmartContextProps & { action: PrimaryActionFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const runOn = useRunOnRow(props.action);
  const {
    doing,
    error,
    errorFlashActive,
    progress,
    setDoing,
    setError,
    onEvent,
    triggerErrorFeedback,
  } =
    useAssignActionProgress(props);

  const conditionalAssign = async (action: PrimaryActionFragment) => {
    const keys = buildActionArgs(action, props);
    if (!keys) {
      return;
    }

    const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
    if (unknownKeys.length >= 1) {
      openDialog("actionassign", {
        id: action.id,
        args: keys,
        hidden: keys,
      });
      return;
    }

    const reference = uuidv4();
    const untrack = trackTask(reference, onEvent, { notifyGlobally: true });

    try {
      await assign(buildAssignInput({
        action: action.id,
        args: keys,
        reference,
      }));

      setDoing(true);
      setError(null);
    } catch (error) {
      untrack();
      const message = getErrorMessage(error);
      triggerErrorFeedback(message);
    }
  };

  const inlineErrorToast = error ? formatAssignErrorToast(error) : null;

  return (
    <CommandActionRow
      onSelect={() => conditionalAssign(props.action)}
      onContextMenu={runOn}
      value={props.action.id}
      title={props.action.name}
      description={props.action.description}
      progress={progress}
      className={cn(
        doing && "animate-pulse",
        errorFlashActive &&
          "bg-red/20 data-selected:bg-red-500/20 text-destructive ring-1 ring-inset ring-destructive/35 transition-colors duration-150",
      )}
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {inlineErrorToast ? (
            <span className="max-w-48 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-right text-[10px] leading-tight text-destructive">
              <span className="block font-medium">{inlineErrorToast.title}</span>
              <span className="block truncate">{inlineErrorToast.detail}</span>
            </span>
          ) : null}
        </span>
      }
      icon={PlayCircle}
    />
  );
};

export const BatchAssignButton = (
  props: SmartContextProps & { action: PrimaryActionFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const runOn = useRunOnRow(props.action);
  const {
    doing,
    error,
    errorFlashActive,
    progress,
    setDoing,
    setError,
    onEvent,
    triggerErrorFeedback,
  } =
    useAssignActionProgress(props);

  const conditionalAssign = async (action: PrimaryActionFragment) => {
    const key = action.args?.at(0)?.key;
    if (!key) {
      toast.error("No key found for self");
      return;
    }

    for (const object of props.objects) {
      const keys: Record<string, unknown> = { [key]: {__identifier: object.identifier, object: object.object.id } };

      if (props.partners && props.partners.length === 1) {
        const partnerKey = action.args?.at(1)?.key;
        if (!partnerKey) {
          toast.error("No key found for partner");
          return;
        }
        keys[partnerKey] = {
          __identifier: props.partners[0].identifier,
          object: props.partners[0].object.id,
        };
      }

      if (props.partners && props.partners.length > 1) {
        if (action.args.at(1)?.kind !== PortKind.List) {
          toast.error("Should be a list but is not");
          return;
        }
        const partnerKey = action.args?.at(1)?.key;
        if (!partnerKey) {
          toast.error("No key found for partner");
          return;
        }
        keys[partnerKey] = props.partners.map((partner) => ({
          __identifier: partner.identifier,
          object: partner.object.id,
        }));
      }

      const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
      if (unknownKeys.length >= 1) {
        openDialog("actionassign", {
          id: action.id,
          args: keys,
          hidden: keys,
        });
        return;
      }

      const reference = uuidv4();
      const untrack = trackTask(reference, onEvent, { notifyGlobally: true });

      try {
        await assign(buildAssignInput({
          action: action.id,
          args: keys,
          reference,
        }));
        setDoing(true);
        setError(null);
      } catch (error) {
        untrack();
        const message = getErrorMessage(error);
        triggerErrorFeedback(message);
      }
    }
  };

  const inlineErrorToast = error ? formatAssignErrorToast(error) : null;

  return (
    <CommandActionRow
      onSelect={() => conditionalAssign(props.action)}
      onContextMenu={runOn}
      value={props.action.id}
      title={props.action.name}
      description={props.action.description}
      progress={progress}
      className={cn(
        doing && "animate-pulse",
        errorFlashActive &&
          "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/35 transition-colors duration-150",
      )}
      trailing={
        <span className="ml-auto flex items-center gap-2">
          {inlineErrorToast ? (
            <span className="max-w-48 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-right text-[10px] leading-tight text-destructive">
              <span className="block font-medium">{inlineErrorToast.title}</span>
              <span className="block truncate">{inlineErrorToast.detail}</span>
            </span>
          ) : null}
        </span>
      }
      icon={Boxes}
    />
  );
};

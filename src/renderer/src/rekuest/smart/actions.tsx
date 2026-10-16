import { toWire } from "@/core/smart/structure";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { toast } from "@/core/notify";
import { assignErrorMessage, notifyAssignError } from "../lib/assignError";
import { v4 as uuidv4 } from "uuid";
import React from "react";
import {
  AgentKind,
  TaskEventFragment,
  DetailImplementationFragment,
  PortKind,
  PrimaryActionFragment,
  useImplementationsQuery,
} from "@/rekuest/api/graphql";
import { buildAssignInput } from "@/rekuest/assign";
import { failureFallback } from "@/rekuest/lib/taskTracker";
import { useAssign } from "@/rekuest/hooks/useAssign";
import { Boxes, PlayCircle } from "lucide-react";
import { CommandActionRow } from "@/core/smart/extensions/CommandActionRow";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import {
  ACTIVE_IMPLEMENTATION_ORDERING,
  SMART_IMPLEMENTATION_PAGE_SIZE,
} from "./queries";
import { useResultSink } from "@/core/smart/extensions/results";
import {
  OpenResultButtons,
  runTracker,
  runsDirectly,
  useOpenResult,
  type OpenableReturn,
} from "./openResult";
import { useRunOnSubmenu } from "./runOnContext";
import { BlokLogo } from "@/rekuest/components/logo/BlokLogo";
import { materializeErrorMessage, resolveRun } from "./materialize";

/**
 * The rows of the rekuest sections (Run, Batch, and the "Run on" picker). The sections themselves — queries, headings, status — are
 * descriptors in `./sections.tsx`; the demands they ask with live in
 * `../demands.ts`.
 */

const getErrorMessage = assignErrorMessage;

const formatAssignErrorToast = (message: string) => ({
  title: "Assignment failed",
  detail: message,
});

type AssignableAction = PrimaryActionFragment | DetailImplementationFragment["action"];

/**
 * Whether a row can run right now, as the server answers it — rows that cannot
 * are drawn receded and asked for last (`queries.ts`). Advisory only: choosing
 * one still assigns, and takt, which decides, says why it refused. The flag
 * may be seconds old (an agent connected while the menu was open), and a row
 * that blocked itself would then refuse something that runs.
 */
export const actionAvailability = (action: { assignable: boolean }) =>
  action.assignable ? null : { reason: "No agent for it is online" };

/** An implementation's agent can take work now: takt's rule (a webhook, or live). */
export const canTakeWork = (agent: Pick<DetailImplementationFragment["agent"], "kind" | "active">) =>
  agent.kind === AgentKind.Webhook || agent.active;

/**
 * A stateful action keeps its state on one agent: when more than one could take
 * it now, the user says which ("Run on") rather than takt picking one. With one,
 * takt can only pick that one, and the row just runs.
 */
export const needsAgentChoice = (
  action: Pick<PrimaryActionFragment, "stateful" | "liveImplementations">,
) => action.stateful && action.liveImplementations > 1;

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
    keys[key] = toWire(props.objects[0]);
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
    keys[key] = props.objects.map((item) => (toWire(item)));
  }

  if (props.partners && props.partners.length === 1) {
    const key = action.args?.at(1)?.key;
    if (!key) {
      toast.error("No key found for partner");
      return null;
    }
    keys[key] = toWire(props.partners[0]);
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
    keys[key] = props.partners.map((item) => (toWire(item)));
  }

  return keys;
};

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
  const sink = useResultSink();

  const onTemplateSelect = async (
    action: PrimaryActionFragment,
    implementation: DetailImplementationFragment,
  ) => {
    let run: SmartContextProps;
    try {
      run = await resolveRun(props);
    } catch (error) {
      // The picker closes as the run starts: there is no row left to mark.
      toast.error(materializeErrorMessage(error));
      return;
    }
    const keys = buildActionArgs(action, run);
    if (!keys) {
      return;
    }

    // The tracker lives in the "Run on" picker, which closes the instant the
    // run starts: on the rail too (`runTracker`), or it runs with no indicator.
    const track = runTracker(sink, action.returns, (event) => {
      props.onDone?.({ event, kind: "action" });
    });

    const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
    if (unknownKeys.length >= 1) {
      openDialog("assign", {
        target: { implementation: implementation.id },
        args: keys,
        hidden: keys,
        track,
      });
      return;
    }

    const reference = uuidv4();
    const untrack = track(reference);

    try {
      await assign(buildAssignInput({
        implementation: implementation.id,
        args: keys,
        reference,
      }));
    } catch (error) {
      untrack();
      // The picker closes as the run starts: there is no row left to mark.
      notifyAssignError(error, { id: `assign:${implementation.id}` });
    }
  };

  return (
    <>
      <div className="flex flex-row text-xs">Run on</div>
      <div className="flex flex-col gap-2">
        {implementations.data?.implementations.map((implementation) => {
          // Ordered live first (`active`, takt's rule); an agent that cannot take
          // work now is shown, not offered.
          const live = canTakeWork(implementation.agent);
          return (
            <Button
              key={implementation.id}
              variant="outline"
              size="lg"
              className="flex flex-col gap-1"
              disabled={!live}
              onClick={() => onTemplateSelect(props.action, implementation)}
            >
              <div className="flex items-center gap-2 text-md text-foreground">
                {implementation.agent.name}
                {live ? null : (
                  <span className="rounded border border-border/60 px-1 text-[10px] leading-4 text-muted-foreground">
                    offline
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{implementation.interface}</div>
            </Button>
          );
        })}
        {implementations.data?.implementations.length === 0 ? (
          <div className="text-xs text-muted-foreground">No implementations</div>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="mt-2"
        onClick={async () => {
          let run: SmartContextProps;
          try {
            run = await resolveRun(props);
          } catch (error) {
            toast.error(materializeErrorMessage(error));
            return;
          }
          const firstObject = run.objects[0];
          if (!firstObject) {
            return;
          }
          openDialog("createshortcut", {
            id: props.action.id,
            args: {
              [props.action.args?.at(0)?.key || "object"]: toWire(firstObject),
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
      if (
        event.kind === "FAILED" ||
        event.kind === "CRITICAL" ||
        event.kind === "LOST"
      ) {
        const message = event.message || failureFallback(event.kind);
        setDoing(false);
        setProgress(null);
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
  const submenu = useRunOnSubmenu();
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

  const thenOpen = useOpenResult();
  const sink = useResultSink();

  const conditionalAssign = async (action: PrimaryActionFragment, open?: OpenableReturn) => {
    let run: SmartContextProps = props;
    if (props.materialize) {
      // Running while the object it runs on is made.
      setDoing(true);
      try {
        run = await resolveRun(props);
      } catch (error) {
        triggerErrorFeedback(materializeErrorMessage(error));
        return;
      }
      setDoing(false);
    }
    const keys = buildActionArgs(action, run);
    if (!keys) {
      return;
    }

    const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
    if (unknownKeys.length >= 1) {
      openDialog("assign", {
        target: { action: action.id },
        args: keys,
        hidden: keys,
        track: runTracker(sink, action.returns, onEvent),
      });
      return;
    }

    const reference = uuidv4();
    const untrack = runTracker(sink, action.returns, open ? thenOpen(open, onEvent) : onEvent)(
      reference,
    );

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
  // Outside a menu with the picker (no `RunOnSubmenu`) the row runs as before.
  const choose = needsAgentChoice(props.action) ? submenu : null;

  return (
    <CommandActionRow
      onSelect={() =>
        choose ? choose.openFor({ action: props.action }) : conditionalAssign(props.action)
      }
      onContextMenu={runOn}
      value={props.action.id}
      title={props.action.name}
      description={props.action.description}
      progress={progress}
      running={doing}
      flash={errorFlashActive}
      failure={inlineErrorToast}
      unavailable={actionAvailability(props.action)}
      trailing={
        choose ? (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            Choose agent · {props.action.liveImplementations}
          </span>
        ) : undefined
      }
      buttons={
        // "Run, then open" would skip the choice.
        !choose && runsDirectly(props.action.args, props) ? (
          <OpenResultButtons
            returns={props.action.returns}
            onRun={(port) => conditionalAssign(props.action, port)}
          />
        ) : null
      }
      icon={PlayCircle}
      leading={props.action.logo ? <BlokLogo blok={props.action.logo} className="h-full w-full" /> : undefined}
    />
  );
};

export const BatchAssignButton = (
  props: SmartContextProps & { action: PrimaryActionFragment },
) => {
  const { assign } = useAssign();
  const { openDialog } = useDialog();
  const runOn = useRunOnRow(props.action);
  const sink = useResultSink();
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

    let run: SmartContextProps = props;
    if (props.materialize) {
      setDoing(true);
      try {
        run = await resolveRun(props);
      } catch (error) {
        triggerErrorFeedback(materializeErrorMessage(error));
        return;
      }
      setDoing(false);
    }

    for (const object of run.objects) {
      const keys: Record<string, unknown> = { [key]: toWire(object) };

      if (run.partners && run.partners.length === 1) {
        const partnerKey = action.args?.at(1)?.key;
        if (!partnerKey) {
          toast.error("No key found for partner");
          return;
        }
        keys[partnerKey] = toWire(run.partners[0]);
      }

      if (run.partners && run.partners.length > 1) {
        if (action.args.at(1)?.kind !== PortKind.List) {
          toast.error("Should be a list but is not");
          return;
        }
        const partnerKey = action.args?.at(1)?.key;
        if (!partnerKey) {
          toast.error("No key found for partner");
          return;
        }
        keys[partnerKey] = run.partners.map((partner) => (toWire(partner)));
      }

      const unknownKeys = action.args.filter((arg) => arg.key && !keys[arg.key]);
      if (unknownKeys.length >= 1) {
        openDialog("assign", {
          target: { action: action.id },
          args: keys,
          hidden: keys,
          track: runTracker(sink, action.returns, onEvent),
        });
        return;
      }

      const reference = uuidv4();
      const untrack = runTracker(sink, action.returns, onEvent)(reference);

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
      running={doing}
      flash={errorFlashActive}
      failure={inlineErrorToast}
      unavailable={actionAvailability(props.action)}
      icon={Boxes}
      leading={props.action.logo ? <BlokLogo blok={props.action.logo} className="h-full w-full" /> : undefined}
    />
  );
};

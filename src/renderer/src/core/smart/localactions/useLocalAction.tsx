import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { useTabActions } from "@/core/command/tabs/TabsProvider";
import { useConnection } from "@/core/lib/arkitekt/provider";
import { Action, ActionState } from "@/core/lib/localactions/LocalActionProvider";
import type { ServiceMap } from "@/core/lib/arkitekt/provider";
import type { OnDone } from "@/core/providers/smart/extensions/types";
import { useSelectionSelector } from "@/core/providers/selection/SelectionContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDialog } from "../../dialogs/registry";
import {
  cancelLocalActionRun,
  dismissLocalActionRun,
  finishLocalActionRun,
  selectRunForKey,
  setLocalActionRunProgress,
  startLocalActionRun,
  useLocalActionRuns,
} from "./localActionRuns";
import { getModifierState } from "../../util/modifierTracker";

type LocalActionConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export const usePerformAction = (props: {
  action: Action;
  state: ActionState;
  onDone?: OnDone;
  /**
   * The action's registry id. It is what a row coming back re-attaches to, so
   * pass it wherever it is known; the title is a workable fallback.
   */
  actionId?: string;
}) => {
  // The run lives in `localActionRuns`, not here: this hook unmounts with the
  // popover the moment an action is selected, and a run has to outlive that to
  // stay visible and cancellable. See that module's header.
  const key = props.actionId ?? props.action.title;
  const run = useLocalActionRuns((state) => selectRunForKey(state, key));
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: LocalActionConfirmOptions;
    resolver: ((confirmed: boolean) => void) | null;
  } | null>(null);
  const connection = useConnection();
  const dialog = useDialog();
  const navigate = useNavigate();
  const { open: openTab, openBeside: openTabBeside } = useTabActions();
  const setSelection = useSelectionSelector((state) => state.setSelection);
  const setBSelection = useSelectionSelector((state) => state.setBSelection);

  // The live run's id, for the unmount guard below. A ref, not state: it is
  // only ever read from a cleanup.
  const runIdRef = useRef<string | null>(null);

  const confirm = useCallback((options: LocalActionConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        open: true,
        options,
        resolver: resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((confirmed: boolean) => {
    setConfirmState((current) => {
      current?.resolver?.(confirmed);
      return current ? { ...current, open: false, resolver: null } : null;
    });
  }, []);

  // `confirm` is the one part of a run that CANNOT move into the store: it
  // renders an AlertDialog in this component's own tree. So when the surface
  // goes away with a question still open, the run fails closed — resolve
  // `false` and abort — rather than waiting on a dialog nobody can answer.
  // (Routing confirmation through the dialog registry in `app/dialog.tsx` is
  // the real fix.)
  useEffect(
    () => () => {
      setConfirmState((current) => {
        if (current?.resolver) {
          current.resolver(false);
          const id = runIdRef.current;
          if (id) cancelLocalActionRun(id);
        }
        return null;
      });
    },
    [],
  );

  const assign = async () => {
    // Clicking a running action stops it. Now correct across remounts: the
    // controller is in the store, so the second click aborts the first run
    // instead of starting a second one beside it.
    if (run) {
      cancelLocalActionRun(run.id);
      return;
    }

    const { id, controller } = startLocalActionRun({
      key,
      title: props.action.title,
      icon: props.action.icon,
    });
    runIdRef.current = id;

    try {
      const result = await props.action.execute({
        onProgress: (p) => {
          setLocalActionRunProgress(id, p);
        },
        abortSignal: controller.signal,
        services: (connection?.serviceMap || {}) as ServiceMap,
        dialog,
        navigate,
        tabs: { open: openTab, openBeside: openTabBeside },
        // Read from the shared window-level tracker instead of per-row listeners.
        modifiers: getModifierState(),
        confirm,
        location: window.location,
        state: props.state,
      });

      // An action may hand back the selection it leaves behind (a delete returns
      // an empty one, since the structures it acted on are gone).
      if (result) {
        setSelection(result.left);
        setBSelection(result.right ?? []);
      }

      runIdRef.current = null;
      finishLocalActionRun(id, { status: "completed" });
      if (props.onDone) {
        props.onDone({ kind: "local" });
      }
    } catch (e) {
      runIdRef.current = null;
      if (props.onDone) {
        props.onDone({ kind: "local" });
      }

      // A cancel is not a failure and leaves no row behind — the user just
      // took it away.
      if (e instanceof Error && e.name === "AbortError") {
        dismissLocalActionRun(id);
        return;
      }

      const message =
        e instanceof Error
          ? e.message
          : "An error occurred while performing the action";
      // Kept until dismissed in the island, since the surface that started it
      // has very likely closed by now.
      finishLocalActionRun(id, { status: "error", error: message });
      toast.error(message);
    }
  };

  return {
    progress: run?.progress,
    /** True while this action has a run in flight — survives a remount. */
    running: run !== undefined,
    assign,
    confirmationDialog: confirmState ? (
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            closeConfirm(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.options.title}</AlertDialogTitle>
            {confirmState.options.description ? (
              <AlertDialogDescription>
                {confirmState.options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {confirmState.options.cancelLabel ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmState.options.destructive ? "destructive" : "default"}
              onClick={() => closeConfirm(true)}
            >
              {confirmState.options.confirmLabel ?? "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null,
  };
};

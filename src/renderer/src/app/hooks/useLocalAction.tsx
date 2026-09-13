import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConnection } from "@/lib/arkitekt/provider";
import { Action, ActionState } from "@/lib/localactions/LocalActionProvider";
import type { ServiceMap } from "@/lib/arkitekt/provider";
import type { OnDone } from "@/providers/smart/extensions/types";
import { useSelectionSelector } from "@/providers/selection/SelectionContext";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDialog } from "../dialog";
import { getModifierState } from "./modifierTracker";

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
}) => {
  const [progress, setProgress] = useState<number | undefined>(0);
  const [controller, setController] = useState<AbortController | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    options: LocalActionConfirmOptions;
    resolver: ((confirmed: boolean) => void) | null;
  } | null>(null);
  const connection = useConnection();
  const dialog = useDialog();
  const navigate = useNavigate();
  const setSelection = useSelectionSelector((state) => state.setSelection);
  const setBSelection = useSelectionSelector((state) => state.setBSelection);

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

  const assign = async () => {
    if (controller) {
      controller.abort();
      return;
    }
    const newController = new AbortController();

    setController(newController);

    try {
      const result = await props.action.execute({
        onProgress: (p) => {
          setProgress(p);
        },
        abortSignal: newController.signal,
        services: (connection?.serviceMap || {}) as ServiceMap,
        dialog,
        navigate,
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

      setController(null);
      setProgress(undefined);
      if (props.onDone) {
        props.onDone({ kind: "local" });
      }
    } catch (e) {
      setProgress(undefined);
      setController(null);
      if (props.onDone) {
        props.onDone({ kind: "local" });
      }
      toast.error(
        e instanceof Error
          ? e.message
          : "An error occurred while performing the action",
      );
    }
  };

  return {
    progress,
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

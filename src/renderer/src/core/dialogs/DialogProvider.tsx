// typed-dialog-provider.tsx

import { usePageDialogHost } from "@/core/dialogs/PageDialogHost";
import { dialogPreferredSize } from "@/core/modules/host/dialogNeeds";
import { Dialog, DialogContent } from "@/core/ui/dialog";
import { Sheet, SheetContent } from "@/core/ui/sheet";
import { cn } from "@/core/util/utils";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Enhanced Dialog Provider with Sheet Support
 *
 * Usage Examples:
 *
 * 1. Basic Dialog:
 * const { openDialog } = useDialog();
 * openDialog("mydialog", { prop1: "value" });
 *
 * 2. Dialog with custom className:
 * openDialog("mydialog", { prop1: "value" }, {
 *   className: "max-w-4xl"
 * });
 *
 * 3. Basic Sheet (right side, default):
 * const { openSheet } = useDialog();
 * openSheet("mysheet", { prop1: "value" });
 *
 * 4. Sheet with custom width:
 * openSheet("mysheet", { prop1: "value" }, {
 *   className: "!w-[600px] !max-w-none"
 * });
 *
 * 5. Sheet from different side:
 * openSheet("mysheet", { prop1: "value" }, {
 *   side: "left",
 *   className: "!w-96"
 * });
 *
 * 6. Full-width bottom sheet:
 * openSheet("mysheet", { prop1: "value" }, {
 *   side: "bottom",
 *   className: "!h-[80vh]"
 * });
 */

// --- 1. Utility Types ---
type ExtractProps<T> =
  T extends React.ComponentType<infer P> ? Omit<P, "onClose"> : never;

/**
 * How much of the page a dialog takes. `small` is for confirmations and
 * one-field prompts only; a form is `medium`, a form with a side panel
 * `large`, a workspace `full`. Never wider than the page it covers.
 */
export type DialogSize = "small" | "medium" | "large" | "full";

export const DIALOG_SIZES: Record<DialogSize, string> = {
  small: "w-[min(96cqw,28rem)] max-w-[min(96cqw,28rem)]",
  medium: "w-[min(96cqw,44rem)] max-w-[min(96cqw,44rem)]",
  large: "w-[min(96cqw,64rem)] max-w-[min(96cqw,64rem)]",
  full: "w-[96cqw] max-w-[96cqw] min-h-[80cqh]",
};

// Dialog/Sheet state type
type ModalState = {
  id: string | null;
  props: Record<string, unknown>;
  type: "dialog" | "sheet";
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  size?: DialogSize;
  /**
   * The page host of whoever opened it (see `PageDialogHost`): a dialog opened
   * from a page covers that page, not the rail. Null means the whole window.
   */
  container?: HTMLElement | null;
};

/**
 * A dialog opened in one window to be shown in another: the quick bar hands
 * its actions' dialogs to the main window. Plain data only — no container,
 * and props must survive a structured clone.
 */
export type DialogRequest = {
  type: "dialog" | "sheet";
  id: string;
  props: Record<string, unknown>;
  options?: Pick<OpenOptions, "className" | "side" | "size">;
};

/**
 * The request to forward, or null when it cannot cross a window (a prop that
 * is a function or a DOM node): such a dialog opens where it was asked for.
 */
export const forwardableRequest = (
  type: DialogRequest["type"],
  id: string,
  props: unknown,
  options?: OpenOptions,
): DialogRequest | null => {
  const request: DialogRequest = {
    type,
    id,
    props: (props ?? {}) as Record<string, unknown>,
    options: { className: options?.className, side: options?.side, size: options?.size },
  };
  try {
    return structuredClone(request);
  } catch {
    return null;
  }
};

type OpenOptions = {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  size?: DialogSize;
  /** Override where it renders; defaults to the caller's page, if any. */
  container?: HTMLElement | null;
};

// --- 2. Factory Function ---

export function createDialogProvider<
  Components extends Record<string, React.ComponentType<any>>,
>(registry: Components) {
  type DialogId = keyof Components;
  type DialogPropsMap = {
    [K in keyof Components]: ExtractProps<Components[K]>;
  };

  const DialogContext = createContext<{
    openDialog: <K extends DialogId>(
      id: K,
      props: DialogPropsMap[K],
      options?: Omit<OpenOptions, "side">,
    ) => void;
    openSheet: <K extends DialogId>(
      id: K,
      props: DialogPropsMap[K],
      options?: OpenOptions,
    ) => void;
    closeDialog: () => void;
  }>({
    openDialog: () => { },
    openSheet: () => { },
    closeDialog: () => { },
  });

  /**
   * The provider sits above the page, so it cannot see which page a call came
   * from; the caller's hook can. Stamp the caller's page host onto every open
   * unless the caller chose a container itself.
   */
  const useDialog = () => {
    const ctx = useContext(DialogContext);
    const pageHost = usePageDialogHost();
    return useMemo(
      () => ({
        ...ctx,
        openDialog: ((id, props, options) =>
          ctx.openDialog(id, props, { container: pageHost, ...options })) as typeof ctx.openDialog,
        openSheet: ((id, props, options) =>
          ctx.openSheet(id, props, { container: pageHost, ...options })) as typeof ctx.openSheet,
      }),
      [ctx, pageHost],
    );
  };

  /**
   * `forward`: this window shows no dialogs of its own (the quick bar) — every
   * open goes there instead, unless it cannot cross windows. Without it, this
   * window receives dialogs forwarded to it (`window.api.dialogs`).
   */
  const DialogProvider = ({
    children,
    forward,
  }: {
    children: React.ReactNode;
    forward?: (request: DialogRequest) => void;
  }) => {
    const [modalState, setModalState] = useState<ModalState>({
      id: null,
      props: {},
      type: "dialog",
    });
    // Read at call time, so the open callbacks stay stable.
    const forwardRef = useRef(forward);
    forwardRef.current = forward;

    const tryForward = (type: DialogRequest["type"], id: string, props: unknown, options?: OpenOptions) => {
      if (!forwardRef.current) return false;
      const request = forwardableRequest(type, id, props, options);
      if (!request) return false;
      forwardRef.current(request);
      return true;
    };

    // The receiving side: pushed while up, or waiting in main from a boot.
    useEffect(() => {
      if (forward) return;
      const show = (request: DialogRequest) => {
        if (!(request.id in registry)) return;
        setModalState({
          id: request.id,
          props: request.props,
          type: request.type,
          className: request.options?.className,
          side: request.type === "sheet" ? request.options?.side || "right" : undefined,
          size: request.options?.size,
        });
      };
      const dispose = window.api?.dialogs?.onOpen?.(show);
      void window.api?.dialogs?.takePending?.().then((request) => request && show(request));
      return dispose;
    }, [forward]);

    const openDialog = useCallback(
      <K extends DialogId>(
        id: K,
        props: DialogPropsMap[K],
        options?: Omit<OpenOptions, "side">,
      ) => {
        if (tryForward("dialog", id as string, props, options)) return;
        setModalState({
          id: id as string,
          props,
          type: "dialog",
          className: options?.className,
          size: options?.size,
          container: options?.container,
        });
      },
      [],
    );

    const openSheet = useCallback(
      <K extends DialogId>(
        id: K,
        props: DialogPropsMap[K],
        options?: OpenOptions,
      ) => {
        if (tryForward("sheet", id as string, props, options)) return;
        setModalState({
          id: id as string,
          props,
          type: "sheet",
          className: options?.className,
          side: options?.side || "right",
          size: options?.size,
          container: options?.container,
        });
      },
      [],
    );

    const closeDialog = useCallback(() => {
      setModalState({ id: null, props: {}, type: "dialog" });
    }, []);

    const Component = modalState.id ? registry[modalState.id] : null;
    // The caller's size, else the one the dialog declared (`prefersSize`).
    const dialogSize =
      modalState.size ?? (modalState.className ? undefined : dialogPreferredSize(Component));

    // The three callbacks are stable, so the context value must be too:
    // otherwise every dialog open/close republishes and rerenders all
    // `useDialog()` consumers (mostly list cards).
    const contextValue = useMemo(
      () => ({ openDialog, openSheet, closeDialog }),
      [openDialog, openSheet, closeDialog],
    );

    return (
      <DialogContext.Provider value={contextValue}>
        <Dialog
          open={!!Component && modalState.type === "dialog"}
          onOpenChange={closeDialog}
          modal={true}
        >
          {Component && (
            <DialogContent container={modalState.container} className={cn(
              "text-foreground",
              // A tall dialog scrolls inside the page instead of leaving it.
              "w-[min(96cqw,1200px)] max-w-[min(96cqw,1200px)] max-h-[90cqh] overflow-y-auto",
              dialogSize && DIALOG_SIZES[dialogSize],
              !modalState.className && dialogSize === undefined && "min-w-[80cqw]",
              // Last: a caller's own width wins over the size.
              modalState.className,
            )}>
              {/* Guarded per dialog by the services it needs (MODULE_DIALOGS). */}
              <Component {...modalState.props} />
            </DialogContent>
          )}
        </Dialog>

        <Sheet
          open={!!Component && modalState.type === "sheet"}
          onOpenChange={closeDialog}
        >
          {Component && (
            <SheetContent
              container={modalState.container}
              side={modalState.side}
              className={cn(
                // Padded by default; a sheet that lays out its own edges
                // (its own SheetHeader) opens with `className: "p-0"`.
                "text-foreground p-6 overflow-y-auto",
                // Reset default width/height classes when custom dimensions are provided
                modalState.className &&
                (modalState.className.includes("w-") ||
                  modalState.className.includes("!w-") ||
                  modalState.className.includes("max-w-")) &&
                "!w-auto !max-w-none",
                modalState.className &&
                (modalState.className.includes("h-") ||
                  modalState.className.includes("!h-") ||
                  modalState.className.includes("max-h-")) &&
                "!h-auto !max-h-[90cqh]",
                modalState.className,
                modalState.size === "small" && "!max-w-sm w-[20cqw]",
                modalState.size === "medium" && "!max-w-md w-[30cqw]",
                modalState.size === "large" && "!max-w-lg w-[60cqw]",
              )}
            >
              {/* Guarded per dialog by the services it needs (MODULE_DIALOGS). */}
              <Component {...modalState.props} />
            </SheetContent>
          )}
        </Sheet>

        {children}
      </DialogContext.Provider>
    );
  };

  return {
    DialogProvider,
    useDialog,
    registry,
  };
}

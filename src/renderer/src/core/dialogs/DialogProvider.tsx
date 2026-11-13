// typed-dialog-provider.tsx

import { recordStep } from "@/core/diagnostics/recorder";
import { DialogErrorScope } from "@/core/dialogs/DialogError";
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
 *
 * 7. A dialog whose answer you wait for (the dialog takes `onResolve` and
 *    `onCancel`; closing it any other way counts as a cancel):
 * const id = await awaitDialog<"installrelease", string>("installrelease", { release });
 */

// --- 1. Utility Types ---
type ExtractProps<T> =
  T extends React.ComponentType<infer P> ? Omit<P, "onClose"> : never;

/**
 * How much of the page a dialog takes. `small` is for confirmations and
 * one-field prompts only; a form is `medium`, a form with a side panel
 * `large`, a workspace `full`. Never wider than the page it covers.
 *
 * `small` and `medium` fit their content between a floor and a cap: a short
 * form opens narrow, a long description wraps at the cap. `large` and `full`
 * are fixed, for what has no width of its own (a canvas, a flow, an editor,
 * a chat) and would collapse to the floor if it were fitted. A dialog opened
 * without a size fits like `medium`.
 */
export type DialogSize = "small" | "medium" | "large" | "full";

export const DIALOG_SIZES: Record<DialogSize, string> = {
  small: "w-fit min-w-[min(96cqw,20rem)] max-w-[min(96cqw,28rem)]",
  medium: "w-fit min-w-[min(96cqw,24rem)] max-w-[min(96cqw,44rem)]",
  large: "w-[min(96cqw,64rem)] max-w-[min(96cqw,64rem)]",
  full: "w-[96cqw] max-w-[96cqw] min-h-[80cqh]",
};

/** A sheet's width (left/right) by size; the same names as a dialog's. */
export const SHEET_SIZES: Record<DialogSize, string> = {
  small: "!w-[min(96cqw,24rem)] !max-w-none",
  medium: "!w-[min(96cqw,32rem)] !max-w-none",
  large: "!w-[min(96cqw,48rem)] !max-w-none",
  full: "!w-[90cqw] !max-w-none",
};

/**
 * A fitted dialog never gets narrower while it is open: a tab switch or a
 * list that empties would otherwise make it jump. Holds the widest width seen
 * as its `min-width` (never more than the page), and lets go on `key` change
 * (another dialog opened in the same frame).
 */
const useGrowOnlyWidth = (key: unknown, enabled: boolean) => {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!node || !enabled || typeof ResizeObserver === "undefined") return;
    let widest = 0;
    node.style.minWidth = "";
    const observer = new ResizeObserver(() => {
      // offsetWidth is the layout width: the open animation's scale is not in it.
      const width = node.offsetWidth;
      if (width <= widest) return;
      widest = width;
      node.style.minWidth = `min(${width}px, 96cqw)`;
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      node.style.minWidth = "";
    };
  }, [node, key, enabled]);
  return setNode;
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
  /** Called once when this dialog goes away without an answer (`awaitDialog`). */
  onDismiss?: () => void;
};

/** What `awaitDialog` rejects with when the dialog is closed without an answer. */
export class DialogDismissedError extends Error {
  constructor() {
    super("The dialog was closed without an answer");
    this.name = "DialogDismissedError";
  }
}

/** The props `awaitDialog` adds: the dialog calls one of them to answer. */
export type AwaitedDialogProps<T> = {
  onResolve?: (value: T) => void;
  onCancel?: () => void;
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
    /** Open a dialog and wait for its answer: `onResolve(value)` resolves, a close rejects. */
    awaitDialog: <T, K extends DialogId = DialogId>(
      id: K,
      props: Omit<DialogPropsMap[K], "onResolve" | "onCancel">,
      options?: Omit<OpenOptions, "side">,
    ) => Promise<T>;
  }>({
    openDialog: () => { },
    openSheet: () => { },
    closeDialog: () => { },
    awaitDialog: () => Promise.reject(new DialogDismissedError()),
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
        awaitDialog: ((id, props, options) =>
          ctx.awaitDialog(id, props, { container: pageHost, ...options })) as typeof ctx.awaitDialog,
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
    // The open dialog's `onDismiss`: told when anything replaces or closes it.
    const dismissRef = useRef<(() => void) | undefined>(undefined);

    const show = useCallback((next: ModalState) => {
      if (next.id) recordStep(next.type, next.id);
      const dismiss = dismissRef.current;
      dismissRef.current = next.onDismiss;
      setModalState(next);
      dismiss?.();
    }, []);

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
      const showForwarded = (request: DialogRequest) => {
        if (!(request.id in registry)) return;
        show({
          id: request.id,
          props: request.props,
          type: request.type,
          className: request.options?.className,
          side: request.type === "sheet" ? request.options?.side || "right" : undefined,
          size: request.options?.size,
        });
      };
      const dispose = window.api?.dialogs?.onOpen?.(showForwarded);
      void window.api?.dialogs?.takePending?.().then((request) => request && showForwarded(request));
      return dispose;
    }, [forward, show]);

    const openDialog = useCallback(
      <K extends DialogId>(
        id: K,
        props: DialogPropsMap[K],
        options?: Omit<OpenOptions, "side">,
      ) => {
        if (tryForward("dialog", id as string, props, options)) return;
        show({
          id: id as string,
          props,
          type: "dialog",
          className: options?.className,
          size: options?.size,
          container: options?.container,
        });
      },
      [show],
    );

    const openSheet = useCallback(
      <K extends DialogId>(
        id: K,
        props: DialogPropsMap[K],
        options?: OpenOptions,
      ) => {
        if (tryForward("sheet", id as string, props, options)) return;
        show({
          id: id as string,
          props,
          type: "sheet",
          className: options?.className,
          side: options?.side || "right",
          size: options?.size,
          container: options?.container,
        });
      },
      [show],
    );

    const closeDialog = useCallback(() => {
      show({ id: null, props: {}, type: "dialog" });
    }, [show]);

    // Never forwarded: its answer comes back through functions, which cannot
    // cross a window. It opens where it was asked for.
    const awaitDialog = useCallback(
      <T, K extends DialogId = DialogId>(
        id: K,
        props: Omit<DialogPropsMap[K], "onResolve" | "onCancel">,
        options?: Omit<OpenOptions, "side">,
      ) =>
        new Promise<T>((resolve, reject) => {
          let settled = false;
          const settle = (finish: () => void) => {
            if (settled) return;
            settled = true;
            finish();
          };
          const dismissed = () => settle(() => reject(new DialogDismissedError()));
          const answers: AwaitedDialogProps<T> = {
            onResolve: (value) => {
              settle(() => resolve(value));
              closeDialog();
            },
            onCancel: () => {
              dismissed();
              closeDialog();
            },
          };
          show({
            id: id as string,
            props: { ...(props as Record<string, unknown>), ...answers },
            type: "dialog",
            className: options?.className,
            size: options?.size,
            container: options?.container,
            onDismiss: dismissed,
          });
        }),
      [closeDialog, show],
    );

    const Component = modalState.id ? registry[modalState.id] : null;
    // The caller's size, else the one the dialog declared (`prefersSize`),
    // else fitted like `medium`. A caller's own className still wins over it.
    const dialogSize: DialogSize =
      modalState.size ?? dialogPreferredSize(Component) ?? "medium";
    const fitted = dialogSize === "small" || dialogSize === "medium";
    const growOnly = useGrowOnlyWidth(modalState, fitted && modalState.type === "dialog");

    // The three callbacks are stable, so the context value must be too:
    // otherwise every dialog open/close republishes and rerenders all
    // `useDialog()` consumers (mostly list cards).
    const contextValue = useMemo(
      () => ({ openDialog, openSheet, closeDialog, awaitDialog }),
      [openDialog, openSheet, closeDialog, awaitDialog],
    );

    return (
      <DialogContext.Provider value={contextValue}>
        <Dialog
          open={!!Component && modalState.type === "dialog"}
          onOpenChange={closeDialog}
          modal={true}
        >
          {Component && (
            <DialogContent ref={growOnly} container={modalState.container} className={cn(
              "text-foreground",
              DIALOG_SIZES[dialogSize],
              // Last: a caller's own width wins over the size.
              modalState.className,
            )}>
              {/* Guarded per dialog by the services it needs (MODULE_DIALOGS).
                  Its own failures show in it (`DialogErrorScope`). */}
              <DialogErrorScope key={modalState.id}>
                <Component {...modalState.props} />
              </DialogErrorScope>
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
                "text-foreground p-6 [--dialog-pad:--spacing(6)] gap-4 overflow-y-auto",
                modalState.size &&
                  (modalState.side === "top" || modalState.side === "bottom"
                    ? "max-h-[90cqh]"
                    : SHEET_SIZES[modalState.size]),
                // Last: a caller's own width wins over the size.
                modalState.className,
              )}
            >
              {/* Guarded per dialog by the services it needs (MODULE_DIALOGS). */}
              <DialogErrorScope key={modalState.id}>
                <Component {...modalState.props} />
              </DialogErrorScope>
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

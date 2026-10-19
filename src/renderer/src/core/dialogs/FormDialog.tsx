import { DialogErrorScope, useDialogError } from "@/core/dialogs/DialogError";
import React, { useCallback } from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export const FormDialogContext = React.createContext<{
  onSubmit: (e: any) => void;
  onError: (err: any) => void;
}>({
  onSubmit: (e) => {
    console.log("Discarded submit because not in context", e);
  },
  onError: (e) => {
    console.log("Discarded error because not in context", e);
  },
});

export const useFormDialog = () => {
  const context = React.useContext(FormDialogContext);
  return context;
};

export type MutationFunction = (
  x: any,
) => Promise<{ data?: any; errors?: any }>;

export const useGraphQlFormDialog = <T extends MutationFunction>(
  mutation: T,
): T => {
  const { onSubmit, onError } = useFormDialog();

  const onSubmitGraphQl = useCallback(
    (e: any) => {
      return mutation(e)
        .then((d) => {
          if (d.errors) {
            onError(d.errors);
          }
          if (d.data) {
            onSubmit(d.data);
          }
          return d;
        })
        .catch((d) => {
          // Shown in the dialog; settled here so it is not reported twice.
          onError(d);
          return { errors: d };
        });
    },
    [onSubmit, onError],
  );

  return onSubmitGraphQl as T;
};

/**
 * The form's context inside an open dialog or sheet: a submit closes it, a
 * failure stays in it — shown at its foot by the `DialogErrorScope` around
 * it — unless the caller handles errors itself (`onError`).
 */
const FormDialogBody = ({
  close,
  onSubmit: onSubmitProp,
  onError: onErrorProp,
  children,
}: {
  close: () => void;
  onSubmit?: (v: any) => void;
  onError?: (err: any) => void;
  children: React.ReactNode;
}) => {
  const { report } = useDialogError();

  const onSubmit = useCallback(
    (v: any) => {
      close();
      onSubmitProp?.(v);
    },
    [close, onSubmitProp],
  );

  const onError = useCallback(
    (e: any) => {
      if (onErrorProp) onErrorProp(e);
      else report(e);
    },
    [onErrorProp, report],
  );

  return <FormDialogContext.Provider value={{ onSubmit, onError }}>{children}</FormDialogContext.Provider>;
};

export const FormDialog = (props: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (v: any) => void;
  onError?: (err: any) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{props.trigger}</DialogTrigger>
      <DialogContent>
        <DialogErrorScope>
          <FormDialogBody close={close} onSubmit={props.onSubmit} onError={props.onError}>
            {props.children}
          </FormDialogBody>
        </DialogErrorScope>
      </DialogContent>
    </Dialog>
  );
};

export const FormSheet = (props: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (v: any) => void;
  onError?: (err: any) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>{props.trigger}</SheetTrigger>
      <SheetContent>
        <DialogErrorScope>
          <FormDialogBody close={close} onSubmit={props.onSubmit} onError={props.onError}>
            {props.children}
          </FormDialogBody>
        </DialogErrorScope>
      </SheetContent>
    </Sheet>
  );
};

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
      console.log("submit");
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
          onError(d);

          throw d;
        });
    },
    [onSubmit, onError],
  );

  return onSubmitGraphQl as T;
};

export const FormDialog = (props: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (v: any) => void;
  onError?: (err: any) => void;
}) => {
  const [open, setOpen] = React.useState(false);

  const onSubmit = useCallback(
    (v: any) => {
      console.log("submit");
      setOpen(false);
      props.onSubmit?.(v);
    },
    [setOpen, props.onSubmit],
  );

  const onError = useCallback(
    (e: any) => {
      console.log("error", e);
      setOpen(false);
      props.onError ? props.onError(e) : alert("Error: " + e);
    },
    [setOpen, props.onError],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{props.trigger}</DialogTrigger>
      <DialogContent>
        <FormDialogContext.Provider value={{ onSubmit, onError }}>
          {" "}
          {props.children}
        </FormDialogContext.Provider>
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

  const onSubmit = useCallback(
    (v: any) => {
      console.log("submit");
      setOpen(false);
      props.onSubmit?.(v);
    },
    [setOpen, props.onSubmit],
  );

  const onError = useCallback(
    (e: any) => {
      console.log("error", e);
      setOpen(false);
      props.onError?.(e);
    },
    [setOpen, props.onError],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>{props.trigger}</SheetTrigger>
      <SheetContent>
        <FormDialogContext.Provider value={{ onSubmit, onError }}>
          {" "}
          {props.children}
        </FormDialogContext.Provider>
      </SheetContent>
    </Sheet>
  );
};

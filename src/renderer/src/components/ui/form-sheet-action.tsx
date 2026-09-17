import React, { useCallback, useState } from "react";
import { FormDialogContext } from "../dialog/FormDialog";
import { Button, ButtonProps } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

export type FormDialogActionProps = {
  label?: React.ReactNode;
} & ButtonProps & {
    children: React.ReactNode;
    buttonChildren?: React.ReactNode;
    onSubmit?: (v: any) => void;
    onError?: (err: any) => void;
  };

/**
 *  A form dialog action component.
 *
 * @remarks
 * This component creates a button that will cause a dialog to open when clicked.
 * This dialog is wrapped in a form context provider, so that any form components
 * inside the dialog can be used to submit a form.
 *
 * @component
 */
export const FormSheetAction: React.FC<FormDialogActionProps> = ({
  onSubmit,
  onError,
  children,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  const bonSubmit = useCallback(
    (v: any) => {
      console.log("submit");
      setOpen(false);
      onSubmit?.(v);
    },
    [setOpen, onSubmit],
  );

  const bonError = useCallback(
    (e: any) => {
      console.log("error", e);
      setOpen(false);
      onError?.(e);
    },
    [setOpen, onError],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button {...props}>{props.buttonChildren || props.label}</Button>
      </SheetTrigger>
      <SheetContent className="border-border text-foreground">
        <FormDialogContext.Provider
          value={{ onSubmit: bonSubmit, onError: bonError }}
        >
          {children}
        </FormDialogContext.Provider>
      </SheetContent>
    </Sheet>
  );
};

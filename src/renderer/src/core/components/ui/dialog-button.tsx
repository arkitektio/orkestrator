import { registry, useDialog } from "@/core/app/dialog";
import { cn } from "@/core/lib/utils";
import React, { useCallback } from "react";
import { Button, ButtonProps } from "./button";

type DialogType = typeof registry;
type ExtractProps<T> =
  T extends React.ComponentType<infer P> ? Omit<P, "onClose"> : never;
type DialogPropsMap = {
  [K in keyof DialogType]: ExtractProps<DialogType[K]>;
};

export const DialogButton = <T extends keyof DialogType>({
  name,
  className,
  children,
  dialogProps,
  options,
  ...props
}: {
  name: T;
  className?: string;
  dialogProps: DialogPropsMap[T];
  options?: { className?: string; size?: "small" | "medium" | "large" };
} & ButtonProps) => {
  const { openDialog } = useDialog();

  const onClick = useCallback(() => {
    openDialog(name, dialogProps, options || {});
  }, [name, dialogProps, options]);

  return (
    <Button
      className={cn("flex flex-row items-center justify-center", className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
};

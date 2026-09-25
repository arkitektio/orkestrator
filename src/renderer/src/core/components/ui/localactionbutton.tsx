import { usePerformAction } from "@/core/app/hooks/useLocalAction";
import { registry, useAction } from "@/core/app/localactions";
import { ActionState } from "@/core/lib/localactions/LocalActionProvider";
import { cn } from "@/core/lib/utils";
import React from "react";
import { Button } from "./button";

export interface LocalActionButtonProps extends React.ComponentProps<typeof Button> {
  children?: React.ReactNode | string;
  name: keyof typeof registry; // Optional prop for action name
  className?: string;
  disabled?: boolean;
  state?: ActionState;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export const LocalActionButton = ({
  name,
  className,
  children,
  state,
  ...props
}: LocalActionButtonProps) => {
  const action = useAction(name);
  const { assign, confirmationDialog } = usePerformAction({
    action,
    actionId: name,
    state: state || { left: [], isCommand: false },
  });

  return (
    <>
      <Button
        className={cn("flex flex-row items-center justify-center", className)}
        onClick={() => {
          void assign();
        }}
        {...props}
      >
        {children ? children : action.title}
      </Button>
      {confirmationDialog}
    </>
  );
};

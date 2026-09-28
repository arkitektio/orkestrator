import { cn } from "@/core/util/utils";
import React, { useCallback, useState } from "react";
import { Button, ButtonProps } from "./button";

export interface ActionButtonProps extends ButtonProps {
  run: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  className,
  run,
  children,
  ...props
}) => {
  const [doing, setDoing] = useState(false);

  const onClick = useCallback(async () => {
    try {
      setDoing(true);
      await run();
      setDoing(false);
    } catch (e) {
      setDoing(false);
      throw e;
    }
  }, []);

  return (
    <Button
      className={cn("flex flex-row items-center justify-center", className)}
      disabled={doing || props.disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
};

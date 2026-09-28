import { Button, ButtonProps } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { markButtonLike } from "./trigger-child";

export const TooltipButton = ({
  children,
  tooltip,
  ...props
}: ButtonProps & { tooltip: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button {...props}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);

markButtonLike(TooltipButton);

import { Toggle } from "@/core/components/ui/toggle";
import { cn } from "@/core/lib/utils";
import { BsPinAngle, BsPinFill } from "react-icons/bs";

export const PinToggle = ({
  className,
  pinned,
  value,
  onPin,
  ...props
}: React.ComponentProps<typeof Toggle> & {
  pinned: boolean;
  onPin: (pin: boolean) => void;
}) => {
  return (
    <Toggle
      {...props}
      className={cn("", className)}
      pressed={pinned}
      onPressedChange={onPin}
    >
      {pinned ? <BsPinFill /> : <BsPinAngle />}
    </Toggle>
  );
};

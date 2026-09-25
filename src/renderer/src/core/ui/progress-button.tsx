import { cn } from "@/core/util/utils";
import "./RadialProgressButton.css";
import { Button, ButtonProps } from "./button";

const ProgressButton = ({
  progress,
  className,
  children,
  ...props
}: {
  progress?: number | null;
} & ButtonProps) => {
  return (
    <Button
      {...props}
      className={cn(progress || 0 > 0 ? "animate-pulse" : "", className)}
      style={{
        backgroundSize: `${progress || 0}% 100%`,
        backgroundImage: `linear-gradient(to right, #4ade80 ${progress}%, #10b981 ${progress}%)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
      }}
    >
      {children}
    </Button>
  );
};

export default ProgressButton;

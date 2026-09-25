"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";


export const SliderTooltip = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(
  ({ className, onValueChange, ...props }, ref) => {
    const [value, setValue] = React.useState<number[]>(
      (props.defaultValue as number[]) ?? [0],
    );
    const [showTooltipState, setShowTooltipState] = React.useState(false);

    const handlePointerDown = () => {
      setShowTooltipState(true);
    };

    const handlePointerUp = () => {
      setShowTooltipState(false);
    };

    const poppingValueChange = (value: number[]) => {
      setValue(value);
      if (onValueChange) {
        onValueChange(value);
      }
    }


    React.useEffect(() => {
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, []);

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className,
        )}
        onValueChange={poppingValueChange}
        onPointerDown={handlePointerDown}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted/20">
          <SliderPrimitive.Range className="absolute h-full bg-muted-foreground/40" />
        </SliderPrimitive.Track>
        <TooltipProvider>
          <Tooltip open={showTooltipState}>
            <TooltipTrigger asChild>
              <SliderPrimitive.Thumb
                className="block h-5 w-5 rounded-full border-2 ring-border border-border bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                onMouseEnter={() => setShowTooltipState(true)}
                onMouseLeave={() => setShowTooltipState(false)}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>{value[0]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SliderPrimitive.Root>
    );

  },
);

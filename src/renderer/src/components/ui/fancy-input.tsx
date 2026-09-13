// Input component extends from shadcnui - https://ui.shadcn.com/docs/components/input
"use client";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const FancyInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const radius = 100; // change this to increase the rdaius of the hover effect
    const [visible, setVisible] = React.useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    // Cache the element rect for the duration of a hover so mousemove doesn't
    // force a layout on every event. Refreshed on each mouseenter.
    const rectRef = React.useRef<DOMRect | null>(null);

    function handleMouseMove({
      currentTarget,
      clientX,
      clientY,
    }: React.MouseEvent<HTMLDivElement>) {
      const rect = (rectRef.current ??= currentTarget.getBoundingClientRect());

      mouseX.set(clientX - rect.left);
      mouseY.set(clientY - rect.top);
    }
    return (
      <motion.div
        style={{
          background: useMotionTemplate`
        radial-gradient(
          ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
          var(--primary),
          transparent 50%
        )
      `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={(event) => {
          rectRef.current = event.currentTarget.getBoundingClientRect();
          setVisible(true);
        }}
        onMouseLeave={() => {
          rectRef.current = null;
          setVisible(false);
        }}
        className="p-[2px] rounded-lg transition duration-300 group/input w-full h-full relative"
      >
        <input
          type={type}
          className={cn(
            `flex h-10 w-full border-none text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm  placeholder:text-muted-foreground dark:placeholder-text-muted-foreground
          focus-visible:outline-none focus-visible:ring-[2px]  focus-visible:ring-primary dark:focus-visible:ring-primary
           disabled:cursor-not-allowed disabled:opacity-50
           dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]
           group-hover/input:shadow-none transition duration-400 bg-sidebar/20 dark:bg-background
           `,
            className,
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  },
);
FancyInput.displayName = "Input";

export { FancyInput };

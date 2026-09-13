import { cn } from "@/lib/utils";
import { SmartContext } from "@/providers/smart/extensions/context";
import { Portal } from "@radix-ui/react-portal";
import React from "react";
import { motion } from "framer-motion";
import { SmartModelProps } from "./types";
import { useSmartModel } from "./useSmartModel";

/**
 * The card wrapper: selection, drag source, drop target, and the floating
 * "combine with partner" panel.
 *
 * The right-click menu and the hover card are NOT here. They are delegated to
 * the single `SmartSurface` mounted at the app root, which resolves the card
 * from the `data-*` attributes below and the node registry — a per-card Radix
 * root for each was ~15 component instances and a document listener per card.
 * `data-hover` opts a card into the hover card; `data-partners` and
 * `data-dragging` tell the surface when to stay closed.
 */
export const SmartModel = ({ ...props }: SmartModelProps) => {
  const {
    ref,
    floatingRef,
    floatingStyles,
    self,
    isOver,
    partners,
    clearPartners,
    handleClick,
    handleDragStart,
    getCurrentSelection,
  } = useSmartModel({ identifier: props.identifier, object: props.object });

  const className = React.useMemo(
    () =>
      cn(
        props.className,
        "group @container relative z-10 cursor-pointer",
        "selected:ring selected:ring-1 selected:ring-offset-2 selected:ring-offset-transparent selected:ring-primary/80 selected:rounded",
        "b-selected:ring b-selected:ring-2 b-selected:rounded b-selected:ring-red-500",
        "dragging:animate-pulse dragging:ring-2 dragging:ring-gray-600 dragging:rounded dragging:rounded-md",
        "over:ring over:ring-offset-4 over:border-gray-200 over:ring-primary/80 over:rounded over:ring-offset-transparent",
        "selected:after:absolute selected:after:top-0 selected:after:right-0 selected:after:z-[9998] selected:after:flex selected:after:h-6 selected:after:w-6 selected:after:translate-x-1/2 selected:after:-translate-y-1/2 selected:after:items-center selected:after:justify-center selected:after:rounded-full selected:after:bg-primary selected:after:text-xs selected:after:font-semibold selected:after:text-white selected:after:content-[attr(data-selected-index)]",
        "b-selected:before:absolute b-selected:before:top-0 b-selected:before:right-0 b-selected:before:z-[9999] b-selected:before:flex b-selected:before:h-6 b-selected:before:w-6 b-selected:before:translate-x-1/2 b-selected:before:-translate-y-1/2 b-selected:before:items-center b-selected:before:justify-center b-selected:before:rounded-full b-selected:before:bg-red-500 b-selected:before:text-xs b-selected:before:font-semibold b-selected:before:text-white b-selected:before:content-[attr(data-bselected-index)]",
      ),
    [props.className],
  );

  return (
    <div
      key={`${props.identifier}:${props.object.id}`}
      ref={ref}
      onClick={handleClick}
      className={cn("relative", props.containerClassName, className)}
      onDragStart={handleDragStart}
      draggable={false}
      data-hover={props.hover ? "true" : undefined}
      data-partners={partners.length > 0 ? "true" : undefined}
    >
      {props.children}
      {isOver && <CombineButton />}

      {partners.length > 0 && (
        <Portal>
          <motion.div
            ref={floatingRef}
            style={floatingStyles}
            className="z-[10050] w-[320px] max-w-[min(90vw,320px)] shadow-2xl max-w-md rounded bg-popover border  rounded-lg p-1 shadow-xl"
            data-nonbreaker
            onClick={(e) => e.stopPropagation()}
            initial={{ filter: "blur(2px)" }}
            animate={{ filter: "none" }}
          >
            <SmartContext
              objects={
                getCurrentSelection().length > 1
                  ? getCurrentSelection()
                  : [self]
              }
              partners={partners}
              onDone={() => clearPartners()}
            />
          </motion.div>
        </Portal>
      )}
    </div>
  );
};

export const CombineButton = () => {
  return (
    <div className="absolute bottom-0 w-full h-full flex justify-center items-center z-10 bg-black bg-opacity-20 inset-0 rounded rounded-lg">
      <div className="font-light text-xs p-2 rounded-full bg-black bg-opacity-20">
        Drop to Combine
      </div>
    </div>
  );
};

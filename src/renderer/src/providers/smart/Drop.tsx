import { cn } from "@/lib/utils";
import { SmartContext } from "@/providers/smart/extensions/context";
import { Portal } from "@radix-ui/react-portal";
import { SmartModelProps } from "./types";
import { useSmartDropZone } from "./useSmartDropZone";

export const SmartDropZone = ({
  hover: _hover = false,
  className,
  ...props
}: SmartModelProps) => {
  const {
    ref,
    self,
    isOver,
    partners,
    floatingRef,
    floatingStyles,
  } = useSmartDropZone({ identifier: props.identifier, object: props.object });

  return (
    <div
      key={props.object.id}
      ref={ref}
      className={cn(
        "group relative over:shadow-xl over:ring-2 over:ring-gray-300 over:rounded-md can-drop:border-gray-200",
        className,
      )}
    >
      {props.children}
      {isOver && <CombineButton />}

      {partners.length > 0 && (
        <Portal>
          <div
            ref={floatingRef}
            className={cn(
              "bg-background border border-gray-500 rounded-lg shadow-lg p-2 z-[9999] w-[300px] aspect-square",
            )}
            style={floatingStyles}
          >
            <SmartContext objects={[self]} partners={partners} />
          </div>
        </Portal>
      )}
    </div>
  );
};

export const CombineButton = () => {
  return (
    <div className="absolute bottom-0 w-full h-full flex justify-center items-center z-10 bg-black bg-opacity-75">
      <div className="font-light text-xs p-2 rounded-full bg-black bg-opacity-100">
        Drop to Combine
      </div>
    </div>
  );
};

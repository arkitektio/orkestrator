import { useDrop } from "react-dnd";
import { Accept } from "../../rekuest/providers/mater/mater-context";
import { DropObject } from "../../rekuest/selection/SmartModel";

export type DropZoneProps = {
  accepts: Accept[];
  className?: string;
  overLabel: React.ReactNode;
  canDropLabel: React.ReactNode;
  onDrop: (items: DropObject[]) => Promise<void>;
};

export const DropZone = ({
  className,
  accepts,
  onDrop,
  overLabel,
  canDropLabel,
}: DropZoneProps) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => {
    return {
      accept: accepts,
      drop: async (item, monitor) => {
        return await onDrop(item as DropObject[]);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    };
  }, []);

  return (
    <div className={`${!canDrop && "hidden"} ${className}`} ref={drop}>
      {isOver ? overLabel : canDropLabel}
    </div>
  );
};

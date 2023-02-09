import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { Experiment, Position, Representation } from "../../../linker";
import {
  ListPositionFragment,
  ListRepresentationFragment,
  useDeleteRepresentationMutation,
} from "../../api/graphql";
import { useMikro, withMikro } from "../../MikroContext";

interface PositionCardProps {
  position: ListPositionFragment;
}

export const PositionCard = ({ position }: PositionCardProps) => {
  const { s3resolve } = useMikro();
  const [deletePosition] = withMikro(useDeleteRepresentationMutation)();
  const { confirm } = useConfirm();

  return (
    <Position.Smart
      showSelfMates={true}
      placement="bottom"
      object={position.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white  h-[4rem] bg-center bg-cover bg-black ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      additionalMates={(accept, self) => {
        if (!self) return [];

        return [
          {
            accepts: [accept],
            action: async (self, drops) => {
              await confirm({
                message: "Do you really want to delete?",
                subtitle: "Deletion is irreversible!",
                confirmLabel: "Yes delete!",
              });

              await deletePosition({
                variables: { id: position.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <div className="px-6 py-4 truncate relative">
        <Position.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={position.id}
        >
          <span className="truncate">{position?.name}</span>
        </Position.DetailLink>
      </div>
    </Position.Smart>
  );
};

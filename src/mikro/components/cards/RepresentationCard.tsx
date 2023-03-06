import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { OptimizedImage } from "../../../layout/OptimizedImage";
import { Experiment, Representation } from "../../../linker";
import {
  LinkableModels,
  ListRepresentationFragment,
  useDeleteRepresentationMutation,
  useLinkMutation,
  useUpdateRepresentationMutation,
} from "../../api/graphql";
import { useMikro, withMikro } from "../../MikroContext";
import { AskRelationModal } from "../dialogs/AskRelationModal";

interface RepresentationCardProps {
  rep: ListRepresentationFragment;
}

export const RepresentationCard = ({ rep }: RepresentationCardProps) => {
  const { s3resolve } = useMikro();

  const { confirm } = useConfirm();
  const { ask } = useDialog();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();
  const [updateRepresentation] = withMikro(useUpdateRepresentationMutation)();
  const [link] = withMikro(useLinkMutation)();

  return (
    <Representation.Smart
      object={rep?.id}
      dropClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded group text-white bg-center bg-black shadow-lg h-20  hover:scale-110 transition-all ease-in-out duration-200 group ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-2 ring-secondary-500 "
        }`
      }
      additionalMates={(accept, self) => {
        if (!self)
          return [
            {
              action: async (self, drops) => {
                await updateRepresentation({
                  variables: {
                    id: rep.id,
                    origins: drops.map((d) => d.object),
                  },
                });
              },
              label: "Set as derived",
              description: "Set as child",
            },
            {
              action: async (self, drops) => {
                let x = await ask(AskRelationModal, {
                  leftIdentifier: self.identifier,
                  leftObject: rep.id,
                  rightIdentifier: drops[0].identifier,
                  rightObject: drops[0].object,
                });

                await link({
                  variables: {
                    xType: LinkableModels.GrunnlagRepresentation,
                    yType: LinkableModels.GrunnlagRepresentation,
                    xId: self.object,
                    yId: drops[0].object,
                    ...x,
                  },
                });
              },
              label: "Relate",
              description: "Relate to other",
            },
          ];

        if (accept == "item:@mikro/representation") {
          return [
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deleteRepresentation({
                  variables: { id: rep.id },
                });
              },
              label: <BsTrash />,
              description: "Delete Image",
            },
          ];
        }

        if (accept == "list:@mikro/representation") {
          return [
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want all this samples delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                for (const drop of drops) {
                  await deleteRepresentation({
                    variables: { id: drop.object },
                  });
                }
              },
              label: (
                <div className="flex flex-row">
                  <BsTrash className="my-auto" />{" "}
                  <span className="my-auto">Delete all</span>
                </div>
              ),
              description: "Delete All Images",
            },
          ];
        }

        return [];
      }}
    >
      {rep.latestThumbnail && (
        <OptimizedImage
          src={s3resolve(rep?.latestThumbnail.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-[4rem] w-full absolute top-0 left-0 rounded"
          blurhash={rep?.latestThumbnail.blurhash}
        />
      )}
      <div className="px-6 py-4">
        <Representation.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={rep.id}
        >
          {rep?.name}
        </Representation.DetailLink>
      </div>
    </Representation.Smart>
  );
};

import React, { useState } from "react";
import { BsCaretLeft, BsCaretRight, BsTrash } from "react-icons/bs";
import { notEmpty } from "../floating/utils";
import { Representation } from "../linker";
import {
  ListRepresentationFragment,
  useDeleteRepresentationMutation,
  usePinnedRepresentationsQuery,
  useUpdateRepresentationMutation,
} from "../mikro/api/graphql";
import { useMikro, withMikro } from "../mikro/MikroContext";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";

export type IMyRepresentationsProps = {};

const limit = 20;

export const RepresentationCard: React.FC<{
  rep: ListRepresentationFragment;
}> = ({ rep }) => {
  const { s3resolve } = useMikro();

  const { confirm } = useConfirm();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();
  const [updateRepresentation] = withMikro(useUpdateRepresentationMutation)();

  if (!rep?.id) {
    return <>NO ID FAILURE</>;
  }

  return (
    <Representation.Smart
      object={rep?.id}
      // dropClassName={`shadow-lg shadow-[${
      //   rep.latestThumbnail?.majorColor || "#00ff00"
      // }]`}
      dropClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded group text-white bg-center bg-cover shadow-lg ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-2 ring-secondary-500 "
        }`
      }
      dropStyle={({ isDragging }) =>
        rep?.latestThumbnail
          ? {
              backgroundImage: `url(${
                s3resolve && s3resolve(rep?.latestThumbnail.image)
              }), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
              backgroundRepeat: "no-repeat",
              backgroundBlendMode: "multiply",
              boxShadow: `0px 10px  15px -3px ${
                rep.latestThumbnail.majorColor || "#FFFF00"
              }30`,
            }
          : {
              background: "black",
              boxShadow: `0px 10px  15px -3px ${"#000000"}50`,
            }
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
              label: "Set as child",
              description: "Set as child",
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
              description: "Delete Sample",
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
              description: "Delete All Samples",
            },
          ];
        }

        return [];
      }}
    >
      <div className="mx-6 py-4 text-ellipsis truncate">
        <div className="flex truncate">
          <span className="flex-grow cursor-pointer font-semibold text-xs truncate ">
            {rep?.sample?.name || "No Sample"}
          </span>
        </div>
        <Representation.DetailLink
          className={`font-bold text-xl mb-2 cursor-pointer truncate`}
          object={rep?.id}
        >
          {rep?.name}
        </Representation.DetailLink>
        <p className="text-white-700 text-base flex ">
          {rep?.origins?.map((i) => i.name).join() || ""}
        </p>
      </div>
    </Representation.Smart>
  );
};

const MyPinnedRepresentations: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const { data: pinned_reps } = withMikro(usePinnedRepresentationsQuery)();

  return (
    <div>
      {pinned_reps &&
        pinned_reps.representations &&
        pinned_reps.representations.length > 0 && (
          <>
            <div className="font-light text-xl flex mr-2 dark:text-white">
              <div className="flex-0">Latest Images</div>
              <div className="flex-grow"></div>
              <div className="flex-0">
                {offset != 0 && (
                  <button
                    type="button"
                    className="p-1 text-gray-600 rounded"
                    onClick={() => setOffset(offset - limit)}
                  >
                    {" "}
                    <BsCaretLeft />{" "}
                  </button>
                )}
                {pinned_reps?.representations &&
                  pinned_reps?.representations.length == limit && (
                    <button
                      type="button"
                      className="p-1 text-gray-600 rounded"
                      onClick={() => setOffset(offset + limit)}
                    >
                      {" "}
                      <BsCaretRight />{" "}
                    </button>
                  )}
              </div>
            </div>
            <div className="flex">
              <div className="mt-4">Pinned Reps </div>
              <ResponsiveGrid>
                {pinned_reps?.representations
                  ?.slice(0, limit)
                  .filter(notEmpty)
                  .map((rep, index) => (
                    <RepresentationCard rep={rep} key={rep?.id} />
                  ))}
              </ResponsiveGrid>
            </div>
          </>
        )}
    </div>
  );
};

export { MyPinnedRepresentations };

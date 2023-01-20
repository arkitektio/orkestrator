import React, { useEffect, useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { ResponsiveGrid } from "../components/layout/ResponsiveGrid";
import { notEmpty } from "../floating/utils";
import { useDialog } from "../layout/dialog/DialogProvider";
import { OptimizedImage } from "../layout/OptimizedImage";
import { Representation } from "../linker";
import {
  LinkableModels,
  ListRepresentationFragment,
  MyRepresentationsEventDocument,
  MyRepresentationsEventSubscriptionResult,
  MyRepresentationsQuery,
  useDeleteRepresentationMutation,
  useLinkMutation,
  useMyRepresentationsQuery,
  usePinnedRepresentationsQuery,
  useUpdateRepresentationMutation,
} from "../mikro/api/graphql";
import { AskRelationModal } from "../mikro/components/dialogs/AskRelationModal";
import { useMikro, withMikro } from "../mikro/MikroContext";
import { useConfirm } from "./confirmer/confirmer-context";

export type IMyRepresentationsProps = {};

const limit = 20;

export const RepresentationCard: React.FC<{
  rep: ListRepresentationFragment;
}> = ({ rep }) => {
  const { s3resolve } = useMikro();

  const { confirm } = useConfirm();
  const { ask } = useDialog();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();
  const [updateRepresentation] = withMikro(useUpdateRepresentationMutation)();

  const [link] = withMikro(useLinkMutation)();

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
        `rounded group text-white bg-center bg-black shadow-lg h-20 ${
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
              label: "Set as child",
              description: "Set as child",
            },
            {
              action: async (self, drops) => {
                let x = await ask(AskRelationModal, {});

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
              label: "Set as GT",
              description: "Set the dropped representation as GT",
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
      {rep.latestThumbnail && (
        <OptimizedImage
          src={s3resolve(rep?.latestThumbnail.image)}
          style={{ filter: "brightness(0.7)" }}
          className="object-cover h-20 w-full absolute top-0 left-0 rounded"
          blurhash={rep?.latestThumbnail.blurhash}
        />
      )}
      <div className="mx-6 py-4 text-ellipsis truncate relative">
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

const MyRepresentations: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const {
    data: reps,
    loading: all_loading,
    subscribeToMore,
    refetch,
  } = withMikro(useMyRepresentationsQuery)({
    variables: { limit: limit, offset: 0, order: ["-created_at"] },
    //pollInterval: 1000,
  });

  useEffect(() => {
    console.log("Subscribing to My Representations");
    const unsubscribe = subscribeToMore({
      document: MyRepresentationsEventDocument,
      variables: {},
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received Representation", subscriptionData);
        var data = subscriptionData as MyRepresentationsEventSubscriptionResult;
        let action = data.data?.myRepresentations;
        let newelements;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          newelements = prev.myrepresentations?.map((item: any) =>
            item.id === updated_res?.id
              ? { ...item, data: { ...item.data, ...updated_res } }
              : item
          );
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          newelements = prev.myrepresentations
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          if (prev.myrepresentations) {
            newelements = [updated_res, ...prev.myrepresentations];
          } else {
            newelements = [updated_res];
          }
        }

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          myrepresentations: newelements,
        } as MyRepresentationsQuery;
      },
    });
    return () => unsubscribe();
  }, [subscribeToMore]);

  useEffect(() => {
    refetch({ limit: 20, offset: offset });
  }, [offset, limit]);

  return (
    <div>
      {reps && reps.myrepresentations && reps.myrepresentations.length > 0 && (
        <>
          <div className="font-light text-xl flex mr-2 dark:text-white">
            <div className="flex-0">Latest Images</div>
            <div className="flex-grow"></div>
            <div className="flex-0">
              {offset != 0 && (
                <button
                  className="p-1 text-gray-600 rounded"
                  onClick={() => setOffset(offset - limit)}
                >
                  {" "}
                  <BsCaretLeft />{" "}
                </button>
              )}
              {reps?.myrepresentations &&
                reps?.myrepresentations.length == limit && (
                  <button
                    className="p-1 text-gray-600 rounded"
                    onClick={() => setOffset(offset + limit)}
                  >
                    {" "}
                    <BsCaretRight />{" "}
                  </button>
                )}
            </div>
          </div>
          <ResponsiveGrid>
            {reps?.myrepresentations
              ?.slice(0, limit)
              .filter(notEmpty)
              .map((rep, index) => (
                <RepresentationCard rep={rep} key={rep?.id} />
              ))}
          </ResponsiveGrid>
        </>
      )}
    </div>
  );
};

export { MyRepresentations };

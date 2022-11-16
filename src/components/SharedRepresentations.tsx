import React, { useState } from "react";
import {
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { Representation } from "../linker";
import { UserEmblem } from "../lok/components/UserEmblem";
import {
  useDeleteRepresentationMutation,
  useSharedRepresentationsQuery,
} from "../mikro/api/graphql";
import { useMikro, withMikro } from "../mikro/MikroContext";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
export type IMyRepresentationsProps = {};

const limit = 20;

const SharedRepresentations: React.FC<IMyRepresentationsProps> = () => {
  const [offset, setOffset] = useState(0);

  const { s3resolve } = useMikro();
  const {
    data: reps,
    subscribeToMore,
    refetch,
  } = withMikro(useSharedRepresentationsQuery)();

  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();

  return (
    <div>
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
          {reps?.sharedrepresentations &&
            reps?.sharedrepresentations.length == limit && (
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
        {reps?.sharedrepresentations?.filter(notEmpty).map((rep, index) => (
          <div
            key={index}
            className="rounded shadow-xl group text-white bg-center bg-cover relative"
            style={
              rep?.latestThumbnail
                ? {
                    backgroundImage: `url(${
                      s3resolve && s3resolve(rep?.latestThumbnail.image)
                    }), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                    backgroundRepeat: "no-repeat",
                    backgroundBlendMode: "multiply",
                  }
                : {
                    background:
                      "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
                  }
            }
          >
            <div className="px-6 py-4">
              <div className="flex">
                <span className="flex-grow cursor-pointer font-semibold text-xs">
                  {rep?.sample?.name || "No Sample"}
                </span>
                <span
                  className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
                  onClick={() => {
                    if (rep?.id) {
                      confirm({
                        message: "Do you really want to delete this Image?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      })
                        .then(() => {
                          deleteRepresentation({
                            variables: { id: rep?.id },
                          });
                        })
                        .catch(console.log);
                    }
                  }}
                >
                  <BsTrash />
                </span>
              </div>
              <Representation.DetailLink
                className="font-bold text-xl mb-2 cursor-pointer"
                object={rep?.id}
              >
                {rep?.name}
              </Representation.DetailLink>
              <p className="text-white-700 text-base flex ">
                {rep?.origins?.map((i) => i.name).join() || ""}
                {rep?.variety}
              </p>
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { SharedRepresentations };

import React from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { MikroRepresentation, MikroRoi } from "../../linker";
import { useDeleteRepresentationMate } from "../../mates/representation/useDeleteRepresentationMate";
import { withMikro } from "../MikroContext";
import { useDetailRoiQuery, usePinRoiMutation } from "../api/graphql";
import { TwoDOffcanvas } from "./canvases/TwoDOffcanvas";
import { PositionCard } from "./cards/PositionCard";
import { RepresentationCard } from "./cards/RepresentationCard";

export type ISampleProps = {
  id: string;
};

const Roi: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withMikro(useDetailRoiQuery)({
    variables: { id: id },
  });

  const [pinRoi] = withMikro(usePinRoiMutation)();

  const mate = useDeleteRepresentationMate();

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/roi"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: <MikroRoi.Komments object={id} />,
          key: "comments",
        },
      ]}
    >
      <div className="p-3 @container">
        <div className="text-xl font-semibold text-white flex flex-row">
          {data?.roi?.label || data?.roi?.id}
          <div className="flex-grow"></div>
          <div className="flex">
            {data?.roi?.id && (
              <button
                type="button"
                onClick={() =>
                  pinRoi({
                    variables: {
                      id: data?.roi?.id || "",
                      pin: !data?.roi?.pinned || false,
                    },
                  })
                }
              >
                {data?.roi?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
          </div>
        </div>
        <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="flex-1 max-w-2xl mt-2  relative">
            {data?.roi?.representation && (
              <TwoDOffcanvas
                representation={data?.roi?.representation}
                withRois={true}
                highlightRois={[id]}
              />
            )}
          </div>
          <div className="@container p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="flex flex-col">
              <div className="">Type </div>
              <div className="text-md mt-2 font-bold">{data?.roi?.type}</div>
              <div className="">Marked on on </div>
              {data?.roi?.representation?.id && (
                <MikroRepresentation.DetailLink
                  className="text-md mt-2 font-bold"
                  object={data?.roi?.representation?.id}
                >
                  {data?.roi?.representation?.name}
                </MikroRepresentation.DetailLink>
              )}
              <div className="mt-2">Derived images </div>
              <ResponsiveContainerGrid>
                {data?.roi?.derivedRepresentations
                  ?.filter(notEmpty)
                  .map((rep, index) => (
                    <RepresentationCard
                      key={index}
                      rep={rep}
                      mates={[mate(rep)]}
                    />
                  ))}
              </ResponsiveContainerGrid>

              <div className="mt-2">Derived Positions </div>
              <ResponsiveContainerGrid>
                {data?.roi?.derivedPositions
                  ?.filter(notEmpty)
                  .map((rep, index) => (
                    <PositionCard key={index} position={rep} mates={[]} />
                  ))}
              </ResponsiveContainerGrid>
            </div>
          </div>
        </div>
      </div>
      <div className="@container "></div>
    </PageLayout>
  );
};

export { Roi };

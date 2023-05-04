import React, { useState } from "react";
import Timestamp from "react-timestamp";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import {
  Channel,
  DimensionMap,
  Instrument,
  Objective,
  Position,
} from "../../linker";
import { useMikro, withMikro } from "../MikroContext";
import {
  CommentableModels,
  DetailRepresentationFragment,
  useDetailMetaQuery,
} from "../api/graphql";

export type ISampleProps = {
  id: string;
};

const Meta: React.FC<ISampleProps> = ({ id }) => {
  const { data, subscribeToMore } = withMikro(useDetailMetaQuery)({
    variables: { id: id },
    fetchPolicy: "cache-and-network",
  });

  const { s3resolve } = useMikro();

  const [show, setshow] = useState(false);

  const rep_to_input = (rep: DetailRepresentationFragment) => {
    return {
      id: rep.id,
      name: rep.name,
      sample: rep?.sample?.id,
      tags: rep.tags,
    };
  };

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments
              id={id}
              model={CommentableModels.GrunnlagRepresentation}
            />
          ),
          key: "comments",
        },
      ]}
      actions={
        <>
          <SelfActions type="@mikro/representation" object={id} />
          <ActionButton
            label="Show (2D)"
            description="Shows this image in 2D"
            onAction={async () => setshow(true)}
          />
        </>
      }
    >
      <div className="p-3 @container">
        <div className="text-xl font-semibold text-white flex flex-row">
          {data?.meta?.representation?.name}
          <div className="flex-grow"></div>
        </div>
        <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="@container p-4 flex-1 bg-white border shadow mt-2 rounded">
            {data?.meta && (
              <>
                <div className="font-light text-xs mb-2">Mikro Context</div>
                {data?.meta && (
                  <div className="flex flex-col mb-2">
                    <div className="font-light mr-2">Acquired </div>
                    <div className="text-md text-black ">
                      <Timestamp date={data?.meta.acquisitionDate} />
                    </div>
                  </div>
                )}
                {data?.meta.affineTransformation &&
                  JSON.stringify(data?.meta?.affineTransformation)}

                {data?.meta?.positions.filter(notEmpty).map((pos) => (
                  <Position.DetailLink
                    object={pos.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">
                      Position on {pos.stage.name}
                    </div>
                    <div className="text-md text-black ">
                      {pos.x}
                      <p className="text-sm inline">x [µm] </p>
                      {pos.y}
                      <p className="text-sm inline">y [µm] </p>
                      {pos.z}
                      <p className="text-sm inline">z [µm] </p>
                    </div>
                  </Position.DetailLink>
                ))}
                <div className="font-light my-1">Channels</div>
                <ResponsiveContainerGrid>
                  {data?.meta?.dimensionMaps?.filter(notEmpty).map((map) => (
                    <DimensionMap.Smart
                      object={map.id}
                      className="flex flex-col "
                    >
                      <DimensionMap.DetailLink
                        object={map.id}
                        className="flex flex-col "
                      >
                        {map.channel && (
                          <Channel.DetailLink
                            className="px-2 py-2  rounded shadow-lg border border-gray-300 flex flex-col cursor-pointer"
                            object={map.channel.id}
                          >
                            <div className="flex flex-row">
                              <div>{map.channel?.name || "Channel "}</div>
                              <div
                                className="text-xs w-2 h-2 rounded-full ml-2 my-auto"
                                style={{
                                  background: `${
                                    map.channel?.color
                                      ? map.channel.color
                                      : "rbg(0,0,0)"
                                  }`,
                                }}
                              ></div>
                              {map.channel?.emissionWavelength && (
                                <div className="text-sm">
                                  {map.channel.emissionWavelength.toPrecision(
                                    5
                                  )}{" "}
                                  nm
                                </div>
                              )}
                            </div>
                          </Channel.DetailLink>
                        )}
                      </DimensionMap.DetailLink>
                    </DimensionMap.Smart>
                  ))}
                </ResponsiveContainerGrid>
                <div className="font-light my-1">Views</div>
                <ResponsiveContainerGrid>
                  {data?.meta?.views?.filter(notEmpty).map((map) => (
                    <DimensionMap.Smart
                      object={map.id}
                      className="flex flex-col "
                    >
                      <DimensionMap.DetailLink
                        object={map.id}
                        className="flex flex-col "
                      >
                        {map.channel && (
                          <Channel.DetailLink
                            className="px-2 py-2  rounded shadow-lg border border-gray-300 flex flex-col cursor-pointer"
                            object={map.channel.id}
                          >
                            <div className="flex flex-row">
                              <div>{map.channel?.name || "Channel "}</div>
                              <div
                                className="text-xs w-2 h-2 rounded-full ml-2 my-auto"
                                style={{
                                  background: `${
                                    map.channel?.color
                                      ? map.channel.color
                                      : "rbg(0,0,0)"
                                  }`,
                                }}
                              ></div>
                            </div>
                          </Channel.DetailLink>
                        )}
                      </DimensionMap.DetailLink>
                    </DimensionMap.Smart>
                  ))}
                </ResponsiveContainerGrid>
                {data?.meta?.objective && (
                  <Objective.DetailLink
                    object={data?.meta?.objective.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">Objective </div>
                    <div className="text-md text-black ">
                      <div className="flex flex-row">
                        <div className="mr-2 bg-primary-400 p-1 rounded-md">
                          {data?.meta?.objective.magnification}x
                        </div>
                        <div className="my-auto">
                          {data?.meta?.objective?.name}
                        </div>
                      </div>
                    </div>
                  </Objective.DetailLink>
                )}
                {data?.meta?.instrument && (
                  <Instrument.DetailLink
                    object={data?.meta?.instrument.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">Instrument </div>
                    <div className="text-md text-black ">
                      {data?.meta?.instrument?.name}
                    </div>
                  </Instrument.DetailLink>
                )}
                <div className="text-light">
                  {data?.meta?.physicalSize && (
                    <>
                      <div className="font-light mr-2">Physical Size </div>
                      <div className="flex flex-col @2xl:+flex-row">
                        {Object.entries(data?.meta?.physicalSize)
                          .filter(
                            ([key, value]) =>
                              key != "__typename" && value != null
                          )

                          .map(([key, value]) => (
                            <div className="flex flex-row">
                              <span className="font-light">{key}</span>
                              <span className="text-md font-semibold mr-1 ml-1 my-auto">
                                {value?.toPrecision(2)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
                {data?.meta?.scale && (
                  <>
                    <div className="font-light">Scale</div>
                    <div className="text-light flex flex-col">
                      {data?.meta?.scale?.map((val, index) => (
                        <>
                          <span className="font-semibold">{val}</span>{" "}
                          <span className="text-xs font-light mr-1 ml-1 my-auto"></span>
                        </>
                      ))}
                    </div>
                  </>
                )}
                <div className="font-light my-1">Planes</div>
                <ResponsiveContainerGrid>
                  {data?.meta?.planes?.map((pl, index) => (
                    <div className="px-2 py-2  rounded shadow-lg border border-gray-300 flex flex-col cursor-pointer">
                      <div className="flex flex-row">
                        <div>{pl?.z || "Plane " + index}</div>
                      </div>
                    </div>
                  ))}
                </ResponsiveContainerGrid>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Meta as Meta };

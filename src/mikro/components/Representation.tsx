import { Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import Timestamp from "react-timestamp";
import {
  CreateableListSearchInput,
  GraphQLCreatableListSearchInput,
  GraphQLListSearchInput,
  GraphQLSearchInput,
} from "../../components/forms/fields/SearchInput";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { SelfActions } from "../../components/SelfActions";
import { ThumbnailCanvas } from "../../components/ThumbnailCanvas";
import { TwoDOffcanvas } from "../../experimental/render/TwoDOffcanvas";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { SaveParentSize } from "../../layout/SaveParentSize";
import {
  Assignation,
  Dataset,
  Instrument,
  Metric,
  MikroFile,
  Objective,
  Position,
  Representation,
  Roi,
  Sample,
  Table,
} from "../../linker";
import { UserEmblem } from "../../lok/components/UserEmblem";
import { ExperimentalFeature } from "../../providers/experimental/Experimental";
import {
  CommentableModels,
  DetailRepresentationFragment,
  DetailRepresentationQuery,
  MyRepresentationsOriginDocument,
  MyRepresentationsOriginSubscription,
  MyRepresentationsOriginSubscriptionVariables,
  UpdateRepresentationMutationVariables,
  useDeleteRepresentationMutation,
  useDeleteRoiMutation,
  useDetailRepresentationQuery,
  usePinRepresentationMutation,
  useSearchSampleLazyQuery,
  useTagSearchLazyQuery,
  useUpdateRepresentationMutation,
  WatchRoisDocument,
  WatchRoisSubscriptionResult,
} from "../api/graphql";
import { useMikro, withMikro } from "../MikroContext";

export type ISampleProps = {
  id: string;
};

const RepresentationScreen: React.FC<ISampleProps> = ({ id }) => {
  const [searchSample, _s] = withMikro(useSearchSampleLazyQuery)();
  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();

  const { data, subscribeToMore } = withMikro(useDetailRepresentationQuery)({
    variables: { id: id },
    fetchPolicy: "cache-and-network",
  });

  const [pinRepresentation, pindata] = withMikro(
    usePinRepresentationMutation
  )();

  const [showRois, setShowRois] = useState(true);

  const [updateRepresentation, _] = withMikro(
    useUpdateRepresentationMutation
  )();

  const [deleteRepresentation] = withMikro(useDeleteRepresentationMutation)();

  const [deleteRoi] = withMikro(useDeleteRoiMutation)();

  const aspectRatio =
    data?.representation?.shape &&
    data?.representation?.shape[3] / data?.representation?.shape[4];

  useEffect(() => {
    console.log("Subscribing to MyRois");
    const unsubscribe = subscribeToMore({
      document: WatchRoisDocument,
      variables: {
        representation: id,
      },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyReservationsEvent", subscriptionData);
        var data = subscriptionData as WatchRoisSubscriptionResult;
        let action = data.data?.rois;
        let rois;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          rois = prev.representation?.rois?.map((item: any) =>
            item.id === updated_res?.id ? { ...item, ...updated_res } : item
          );
        }

        if (action?.delete) {
          let ended_res = action.delete;
          rois = prev.representation?.rois
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          rois = prev.representation?.rois?.concat(updated_res);
        }

        if (!rois) return prev;

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          representation: {
            ...prev.representation,
            rois: rois,
          },
        } as DetailRepresentationQuery;
      },
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("Subscribing to Representations");
    const unsubscribe = subscribeToMore<
      MyRepresentationsOriginSubscription,
      MyRepresentationsOriginSubscriptionVariables
    >({
      document: MyRepresentationsOriginDocument,
      variables: {
        origin: id,
      },
      updateQuery: (prev, { subscriptionData }) => {
        console.log("Received MyRepresentationsOrigin", subscriptionData);
        let action = subscriptionData.data?.myRepresentations;
        let derived;
        // Try to update
        if (action?.update) {
          let updated_res = action.update;
          if (
            prev.representation?.derived?.find(
              (item) => item?.id === updated_res.id
            )
          ) {
            derived = prev.representation?.derived?.map((item: any) =>
              item.id === updated_res?.id ? { ...item, ...updated_res } : item
            );
          } else {
            derived = prev.representation?.derived?.concat(updated_res);
          }
        }

        if (action?.deleted) {
          let ended_res = action.deleted;
          derived = prev.representation?.derived
            ?.map((item: any) => (item.id === ended_res ? null : item))
            .filter((item) => item != null);
        }

        if (action?.create) {
          let updated_res = action.create;
          derived = prev.representation?.derived?.concat(updated_res);
        }

        if (!derived) return prev;

        console.log("Received ", subscriptionData);
        return {
          ...prev,
          representation: {
            ...prev.representation,
            derived: derived,
          },
        } as DetailRepresentationQuery;
      },
    });
    return () => unsubscribe();
  }, []);

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
          {data?.representation?.name}
          <div className="flex-grow"></div>
          <div className="flex">
            {data?.representation?.id && (
              <button
                type="button"
                onClick={() =>
                  pinRepresentation({
                    variables: {
                      id: data?.representation?.id || "",
                      pin: !data?.representation?.pinned || false,
                    },
                  })
                }
              >
                {data?.representation?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
          </div>
        </div>
        <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="flex-1 max-w-2xl mt-2 rounded rounded-lg overflow-hidden relative">
            {data?.representation && (
              <TwoDOffcanvas
                representation={data?.representation}
                withRois={showRois}
              />
            )}
          </div>
          <div className="@container p-4 flex-1 bg-white border shadow mt-2 rounded">
            {data?.representation?.sample && (
              <>
                <div className="font-light">Sample</div>
                <Sample.DetailLink
                  className="text-xl mb-2 cursor-pointer"
                  object={data?.representation?.sample?.id}
                >
                  {data?.representation?.sample?.name}
                </Sample.DetailLink>
              </>
            )}

            {data?.representation?.datasets && (
              <>
                <div className="font-light">In Datasets</div>
                <div className="flex flex-row mb-2">
                  {data?.representation?.datasets?.map((dataset) => (
                    <Dataset.DetailLink
                      className="text-xl cursor-pointer p-1 border rounded mr-2 border-gray-300"
                      object={dataset.id}
                    >
                      {dataset.name}
                    </Dataset.DetailLink>
                  ))}
                </div>
              </>
            )}
            <div className="font-light mt-2 ">Created At</div>
            <div className="text-md mt-2 ">
              <Timestamp date={data?.representation?.createdAt} />
            </div>
            {data?.representation?.createdWhile && (
              <div className="text-md mt-2 ">
                <Assignation.DetailLink
                  object={data?.representation?.createdWhile}
                >
                  Provenance
                </Assignation.DetailLink>
              </div>
            )}
            <div className="font-light mt-2 ">Created by</div>
            <div className="text-md mt-2 ">
              {data?.representation?.creator?.email}
            </div>
            <div className="font-light">Shape</div>
            <div className="text-xl flex mb-2">
              {data?.representation?.shape?.map((val, index) => (
                <>
                  <span className="font-semibold">{val}</span>{" "}
                  <span className="text-xs font-light mr-1 ml-1 my-auto">
                    {" "}
                    {data?.representation?.dims &&
                      data.representation.dims[index]}
                  </span>
                </>
              ))}
            </div>
            <div className="font-light">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.representation?.tags?.map((tag, index) => (
                <>
                  <span className="font-semibold mr-2">#{tag} </span>
                </>
              ))}
            </div>
            {data?.representation && show && (
              <Formik<UpdateRepresentationMutationVariables>
                initialValues={rep_to_input(data?.representation)}
                onSubmit={(values) => {
                  updateRepresentation({ variables: values }).then(console.log);
                }}
              >
                {() => (
                  <Form>
                    <div className="flex flex-col">
                      <div className="flex-grow">
                        <GraphQLCreatableListSearchInput
                          name="tags"
                          label="Tags"
                          searchFunction={searchTags}
                          createFunction={async (name) => ({
                            label: name,
                            value: name,
                          })}
                        />
                      </div>
                      <div className="flex-grow">
                        <GraphQLSearchInput
                          name="sample"
                          label="Samples"
                          searchFunction={searchSample}
                        />
                      </div>
                    </div>
                    <button type="submit">Change</button>
                  </Form>
                )}
              </Formik>
            )}
            {data?.representation?.omero && (
              <>
                <div className="font-light text-xs mb-2">Mikro Context</div>
                {data?.representation?.omero?.acquisitionDate && (
                  <div className="flex flex-col mb-2">
                    <div className="font-light mr-2">Acquired </div>
                    <div className="text-md text-black ">
                      <Timestamp
                        date={data?.representation?.omero?.acquisitionDate}
                        relative
                      />
                    </div>
                  </div>
                )}
                {JSON.stringify(
                  data?.representation?.omero?.affineTransformation
                )}

                {data?.representation?.omero?.position && (
                  <Position.DetailLink
                    object={data.representation.omero.position.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">Position on Stage </div>
                    <div className="text-md text-black ">
                      {data?.representation?.omero?.position?.x}
                      <p className="text-sm inline">x [µm] </p>
                      {data?.representation?.omero?.position?.y}
                      <p className="text-sm inline">y [µm] </p>
                      {data?.representation?.omero?.position?.z}
                      <p className="text-sm inline">z [µm] </p>
                    </div>
                  </Position.DetailLink>
                )}
                {data?.representation?.omero?.objective && (
                  <Objective.DetailLink
                    object={data?.representation?.omero?.objective.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">Objective </div>
                    <div className="text-md text-black ">
                      <div className="flex flex-row">
                        <div className="mr-2 bg-primary-400 p-1 rounded-md">
                          {data?.representation.omero.objective.magnification}x
                        </div>
                        <div className="my-auto">
                          {data?.representation?.omero?.objective?.name}
                        </div>
                      </div>
                    </div>
                  </Objective.DetailLink>
                )}
                {data?.representation?.omero?.instrument && (
                  <Instrument.DetailLink
                    object={data?.representation?.omero?.instrument.id}
                    className="flex flex-col "
                  >
                    <div className="font-semibold mr-2">Instrument </div>
                    <div className="text-md text-black ">
                      {data?.representation?.omero?.instrument?.name}
                    </div>
                  </Instrument.DetailLink>
                )}
                <div className="text-light">
                  {data?.representation?.omero?.physicalSize && (
                    <>
                      <div className="font-light mr-2">Physical Size </div>
                      <div className="flex flex-col @2xl:+flex-row">
                        {Object.entries(
                          data?.representation?.omero?.physicalSize
                        )
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
                {data?.representation?.omero.scale && (
                  <>
                    <div className="font-light">Scale</div>
                    <div className="text-light flex flex-col">
                      {data?.representation?.omero.scale?.map((val, index) => (
                        <>
                          <span className="font-semibold">{val}</span>{" "}
                          <span className="text-xs font-light mr-1 ml-1 my-auto">
                            {" "}
                            {data?.representation?.dims &&
                              data.representation.dims[index]}
                          </span>
                        </>
                      ))}
                    </div>
                  </>
                )}
                <div className="font-light my-1">Channels</div>
                <ResponsiveContainerGrid>
                  {data?.representation?.omero?.channels?.map((ch, index) => (
                    <div className="px-2 py-2  rounded shadow-lg border border-gray-300 flex flex-col cursor-pointer">
                      <div className="flex flex-row">
                        <div>{ch?.name || "Channel " + index}</div>
                        <div
                          className="text-xs w-2 h-2 rounded-full ml-2 my-auto"
                          style={{
                            background: `${
                              ch?.color ? ch.color : "rbg(0,0,0)"
                            }`,
                          }}
                        ></div>
                      </div>
                      {ch?.emmissionWavelength && (
                        <div className="text-sm">
                          {ch.emmissionWavelength.toPrecision(5)} nm
                        </div>
                      )}
                    </div>
                  ))}
                </ResponsiveContainerGrid>
                <div className="font-light my-1">Planes</div>
                <ResponsiveContainerGrid>
                  {data?.representation?.omero?.planes?.map((pl, index) => (
                    <div className="px-2 py-2  rounded shadow-lg border border-gray-300 flex flex-col cursor-pointer">
                      <div className="flex flex-row">
                        <div>{pl?.z || "Plane " + index}</div>
                      </div>
                    </div>
                  ))}
                </ResponsiveContainerGrid>
              </>
            )}

            {data?.representation?.metrics &&
              data?.representation?.metrics.length > 0 && (
                <>
                  <div className="font-light my-2">Metrics</div>
                  <div className="flex gap-2">
                    {data?.representation?.metrics
                      ?.filter(notEmpty)
                      .map((met) => (
                        <Metric.Smart
                          object={met.id}
                          className="border rounded border-gray-800 relative"
                        >
                          <div className="relative p-3 ">
                            <Metric.DetailLink
                              object={met.id}
                              className="font-light"
                            >
                              {met?.key}
                            </Metric.DetailLink>
                            <div className="font-xs">{met?.value}</div>
                            {met.comments?.at(0)?.user?.sub && (
                              <UserEmblem
                                sub={met.comments?.at(0)?.user?.sub}
                              />
                            )}
                          </div>
                        </Metric.Smart>
                      ))}
                  </div>
                </>
              )}
            {data?.representation?.fileOrigins &&
              data?.representation?.fileOrigins.length > 0 && (
                <>
                  <div className="font-light mb-2">Created from</div>
                  <ResponsiveContainerGrid>
                    {data?.representation?.fileOrigins
                      ?.filter(notEmpty)
                      .map((file) => (
                        <MikroFile.Smart
                          object={file.id}
                          dragClassName={(options) =>
                            "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow"
                          }
                        >
                          <MikroFile.DetailLink object={file.id}>
                            {file.name}
                          </MikroFile.DetailLink>
                        </MikroFile.Smart>
                      ))}
                  </ResponsiveContainerGrid>
                </>
              )}

            {data?.representation?.roiOrigins &&
              data?.representation?.roiOrigins.length > 0 && (
                <>
                  <div className="font-light mb-2">Created from these Rois</div>
                  <ResponsiveContainerGrid>
                    {data?.representation?.roiOrigins
                      ?.filter(notEmpty)
                      .map((roi) => (
                        <Roi.Smart
                          object={roi.id}
                          dragClassName={(options) =>
                            "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow text-white"
                          }
                        >
                          <Roi.DetailLink object={roi.id}>
                            {roi.label || roi.id}
                          </Roi.DetailLink>
                        </Roi.Smart>
                      ))}
                  </ResponsiveContainerGrid>
                </>
              )}

            {data?.representation?.origins &&
              data?.representation?.origins.length > 0 && (
                <>
                  <div className="font-light mb-2">Derived from</div>
                  <ResponsiveContainerGrid>
                    {data?.representation?.origins
                      ?.filter(notEmpty)
                      .map((rep) => (
                        <Representation.Smart
                          object={rep.id}
                          dragClassName={(options) =>
                            "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow truncate"
                          }
                          dragStyle={() =>
                            rep?.latestThumbnail
                              ? {
                                  backgroundImage: `url(${s3resolve(
                                    rep?.latestThumbnail.image
                                  )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                                  backgroundSize: "auto 100%",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right",
                                }
                              : {
                                  background:
                                    "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95))",
                                }
                          }
                          additionalMates={() => {
                            return [
                              {
                                label: "Delete Rep",
                                action: async () => {
                                  return deleteRepresentation({
                                    variables: {
                                      id: rep.id,
                                    },
                                  });
                                },
                              },
                            ];
                          }}
                        >
                          <div className="truncate">
                            <Representation.DetailLink object={rep.id}>
                              {rep.name}
                            </Representation.DetailLink>
                            <p className="text-xs">
                              {rep?.tags?.map((t) => "#" + t).join(" ")}
                            </p>
                          </div>
                        </Representation.Smart>
                      ))}
                  </ResponsiveContainerGrid>
                </>
              )}

            {data?.representation?.derived &&
              data?.representation?.derived.length > 0 && (
                <>
                  <div className="font-light my-2">Derived Images</div>
                  <ResponsiveContainerGrid>
                    {data?.representation?.derived
                      ?.filter(notEmpty)
                      .map((rep) => (
                        <Representation.Smart
                          object={rep.id}
                          dragClassName={(options) =>
                            "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow"
                          }
                          dragStyle={() =>
                            rep?.latestThumbnail
                              ? {
                                  backgroundImage: `url(${s3resolve(
                                    rep?.latestThumbnail.image
                                  )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                                  backgroundSize: "auto 100%",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right",
                                }
                              : {
                                  background:
                                    "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95))",
                                }
                          }
                          additionalMates={() => {
                            return [
                              {
                                label: "Delete Rep",
                                action: async () => {
                                  return deleteRepresentation({
                                    variables: {
                                      id: rep.id,
                                    },
                                  });
                                },
                              },
                            ];
                          }}
                        >
                          <Representation.DetailLink object={rep.id}>
                            {rep.name}
                          </Representation.DetailLink>
                          <p className="text-xs">
                            {rep?.tags?.map((t) => "#" + t).join(" ")}
                          </p>
                        </Representation.Smart>
                      ))}
                  </ResponsiveContainerGrid>
                </>
              )}

            {data?.representation?.tables &&
              data?.representation?.tables.length > 0 && (
                <>
                  <div className="font-light my-2">Derived Tables</div>
                  <ResponsiveContainerGrid>
                    {data?.representation?.tables
                      ?.filter(notEmpty)
                      .map((table) => (
                        <Table.Smart
                          object={table.id}
                          dragClassName={(options) =>
                            "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow"
                          }
                        >
                          <Table.DetailLink object={table.id}>
                            {table.name}
                          </Table.DetailLink>
                        </Table.Smart>
                      ))}
                  </ResponsiveContainerGrid>
                </>
              )}

            <div className="flex flex-col mt-2">
              <button
                type="button"
                className="border border-gray-600 rounded w-fit p-1"
                onClick={() => setshow(!show)}
              >
                {show ? "Hide" : "Edit"}
              </button>
            </div>
          </div>
        </div>

        {data?.representation?.rois &&
          data?.representation?.rois.length > 0 && (
            <>
              <div className="font-light my-2">Rois</div>
              <ResponsiveContainerGrid>
                {data?.representation?.rois?.filter(notEmpty).map((roi) => (
                  <Roi.Smart
                    object={roi.id}
                    dragClassName={(options) =>
                      "truncate border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow"
                    }
                    dragStyle={() => ({
                      background:
                        "linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95))",
                    })}
                    additionalMates={(partner, self) => {
                      if (
                        partner == "item:@mikro/roi" ||
                        partner == "list:@mikro/roi"
                      ) {
                        return [
                          {
                            label: "Delete Roi",
                            async action(self, drops) {
                              deleteRoi({
                                variables: {
                                  id: self.object,
                                },
                              });
                            },
                          },
                        ];
                      }

                      return [];
                    }}
                  >
                    <Roi.DetailLink object={roi.id}>
                      {roi?.label || roi?.type}
                    </Roi.DetailLink>
                    <p className="text-xs">
                      {roi?.tags?.map((t) => "#" + t).join(" ")}
                    </p>
                  </Roi.Smart>
                ))}
              </ResponsiveContainerGrid>
            </>
          )}
      </div>
    </PageLayout>
  );
};

export { RepresentationScreen as Representation };

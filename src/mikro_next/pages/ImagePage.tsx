import { Tab } from "@headlessui/react";
import React from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import { useParams } from "react-router";
import Timestamp from "react-timestamp";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { PageLayout } from "../../layout/PageLayout";
import { Refetcher } from "../../layout/page/Refetcher";
import { Dataset } from "../../linker";
import { withMikroNext } from "../MikroNextContext";
import { useGetImageQuery, usePinImageMutation } from "../api/graphql";
import ChannelViewCard from "../components/cards/ChannelViewCard";
import FileCard from "../components/cards/FileCard";
import HistoryCard from "../components/cards/HistoryCard";
import ImageMetricCard from "../components/cards/ImageMetricCard";
import LabelViewCard from "../components/cards/LabelViewCard";
import OpticsViewCard from "../components/cards/OpticsViewCard";
import TransformationViewCard from "../components/cards/TransformationViewCard";
import SnapshotPanel from "../components/panels/SnapshotPanel";
import VideoPanel from "../components/panels/VideoPanel";

export type IRepresentationScreenProps = {};

const ImagePage: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data, refetch } = withMikroNext(useGetImageQuery)({
    variables: {
      id: id,
    },
  });

  const [pinImage] = withMikroNext(usePinImageMutation)();

  return (
    <PageLayout actions={<SelfActions type="@mikronext/image" object={id} />}>
      <div className="p-3 @container">
        <div className="text-xl font-semibold text-white flex flex-row">
          {data?.image?.name}
          <div className="flex-grow"></div>
          <div className="flex">
            {data?.image?.id && (
              <button
                type="button"
                onClick={() =>
                  pinImage({
                    variables: {
                      id: data?.image?.id,
                      pin: !data?.image?.pinned || false,
                    },
                  })
                }
              >
                {data?.image?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
            <Refetcher refetch={() => refetch()} />
          </div>
        </div>
        <div className="flex @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="flex-1 max-w-2xl mt-2  relative">
            <Tab.Group>
              <Tab.Panels className={""}>
                <Tab.Panel className={"border border-slate-200  "}>
                  <div className="flex flex-row gap-2">nosidnfosidnf</div>
                </Tab.Panel>
                {data?.image?.renders?.map((render, index) => (
                  <Tab.Panel key={index} className="border border-slate-200  ">
                    {render.__typename == "Snapshot" && (
                      <SnapshotPanel image={render} />
                    )}
                    {render.__typename == "Video" && (
                      <VideoPanel video={render} />
                    )}
                  </Tab.Panel>
                ))}
                <Tab.List className="text-slate-300 flex flex-row gap-2">
                  <Tab
                    className={({ selected }) =>
                      selected
                        ? " bg-slate-200   text-slate-800 px-2 rounded-b-lg"
                        : " px-2"
                    }
                  >
                    Raw
                  </Tab>
                  {data?.image?.renders?.map((x) => (
                    <Tab
                      className={({ selected }) =>
                        selected
                          ? " bg-slate-200 text-slate-800 px-2 rounded-b-lg "
                          : "px-2"
                      }
                    >
                      {x.__typename}
                    </Tab>
                  ))}
                </Tab.List>
              </Tab.Panels>
            </Tab.Group>
          </div>
          <div className="@container p-4 flex-1 bg-white border shadow mt-2 rounded">
            {data?.image?.dataset && (
              <>
                <div className="font-light">In Dataset</div>
                <div className="flex flex-row mb-2">
                  <Dataset.DetailLink
                    className="text-xl cursor-pointer p-1 border rounded mr-2 border-gray-300"
                    object={data?.image?.dataset?.id}
                  >
                    {data?.image?.dataset.name}
                  </Dataset.DetailLink>
                </div>
              </>
            )}
            <div className="font-light mt-2 ">Created At</div>
            <div className="text-md mt-2 ">
              <Timestamp date={data?.image?.createdAt} />
            </div>
            <div className="font-light mt-2 ">Provenance</div>
            <div className="text-md mt-2 ">
              {data?.image?.history?.map((history, index) => (
                <HistoryCard key={index} history={history} />
              ))}
            </div>
            <div className="font-light mt-2 ">Created by</div>
            <div className="text-md mt-2 ">{data?.image?.creator?.sub}</div>
            <div className="font-light">Shape</div>
            <div className="text-xl flex mb-2">
              {data?.image?.store?.shape?.map((val, index) => (
                <div key={index}>
                  <span className="font-semibold">{val}</span>{" "}
                  <span className="text-xs font-light mr-1 ml-1 my-auto">
                    {" "}
                    x
                  </span>
                </div>
              ))}
            </div>
            <div className="font-light">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.image?.tags?.map((tag, index) => (
                <>
                  <span className="font-semibold mr-2">#{tag} </span>
                </>
              ))}
            </div>
            <div className="font-light">Views</div>
            <ResponsiveContainerGrid>
              {data?.image.views?.map((view, index) => (
                <>
                  {view.__typename == "TransformationView" && (
                    <TransformationViewCard view={view} key={index} />
                  )}
                  {view.__typename == "LabelView" && (
                    <LabelViewCard view={view} key={index} />
                  )}
                  {view.__typename == "OpticsView" && (
                    <OpticsViewCard view={view} key={index} />
                  )}
                  {view.__typename == "ChannelView" && (
                    <ChannelViewCard view={view} key={index} />
                  )}
                </>
              ))}
            </ResponsiveContainerGrid>

            {data?.image?.metrics && data?.image?.metrics.length > 0 && (
              <>
                <div className="font-light my-2">Metrics</div>
                <div className="flex gap-2">
                  <ResponsiveContainerGrid>
                    {data?.image?.metrics.map((met, index) => (
                      <ImageMetricCard metric={met} key={index} />
                    ))}
                  </ResponsiveContainerGrid>
                </div>
              </>
            )}

            {data?.image?.fileOrigins &&
              data?.image?.fileOrigins?.length > 0 && (
                <>
                  <div className="font-light mb-2">Created from</div>
                  <ResponsiveContainerGrid>
                    {data?.image?.fileOrigins?.map((file, index) => (
                      <FileCard file={file} key={index} />
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

export default ImagePage;

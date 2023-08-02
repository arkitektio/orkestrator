import React from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import { useParams } from "react-router";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { PageLayout } from "../../layout/PageLayout";
import { Refetcher } from "../../layout/page/Refetcher";
import { withMikroNext } from "../MikroNextContext";
import { useGetStageQuery, usePinStageMutation } from "../api/graphql";
import TransformationViewCard from "../components/cards/TransformationViewCard";

export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;

  const { data, refetch } = withMikroNext(useGetStageQuery)({
    variables: {
      id: id,
    },
  });

  const [pinStage] = withMikroNext(usePinStageMutation)();

  return (
    <PageLayout actions={<SelfActions type="@mikronext/image" object={id} />}>
      <div className="p-3 @container">
        <div className="text-xl font-semibold text-white flex flex-row">
          {data?.stage?.id}
          <div className="flex-grow"></div>
          <div className="flex">
            {data?.stage?.id && (
              <button
                type="button"
                onClick={() =>
                  pinStage({
                    variables: {
                      id: data?.stage?.id,
                      pin: !data?.stage?.pinned || false,
                    },
                  })
                }
              >
                {data?.stage?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
            <Refetcher refetch={() => refetch()} />
          </div>
        </div>

        <ResponsiveContainerGrid>
          {data?.stage.views?.map((view, index) => (
            <>
              {view.__typename == "TransformationView" && (
                <TransformationViewCard view={view} key={index} />
              )}
            </>
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};

export default Page;

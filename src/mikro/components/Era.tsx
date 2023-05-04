import React, { useState } from "react";
import { BsPinAngle, BsPinFill } from "react-icons/bs";
import Timestamp from "react-timestamp";
import { SelfActions } from "../../components/SelfActions";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withMikro } from "../MikroContext";
import {
  CommentableModels,
  DetailStageDocument,
  useDeletePositionMutation,
  useDetailEraQuery,
  usePinStageMutation,
  useTagSearchLazyQuery,
  useUpdateStageMutation,
} from "../api/graphql";
import { TimepointCard } from "./cards/TimepointCard";

export type IExperimentProps = {
  id: string;
};

export const Era: React.FC<IExperimentProps> = ({ id }) => {
  const { data, error } = withMikro(useDetailEraQuery)({
    variables: { id: id },
  });

  const [searchTags, _t] = withMikro(useTagSearchLazyQuery)();
  const [show, setshow] = useState(false);

  const [pinStage] = withMikro(usePinStageMutation)();

  const [updateStage] = withMikro(useUpdateStageMutation)();
  const { confirm } = useConfirm();

  const [deletePosition] = withMikro(useDeletePositionMutation)({
    update(cache, result) {
      const existing: any = cache.readQuery({
        query: DetailStageDocument,
        variables: { id: id },
      });
      cache.writeQuery({
        query: DetailStageDocument,
        data: {
          acquisition: {
            ...existing.acquisition,
            positions: existing.acquisition.positions.filter(
              (t: any) => t.id !== result.data?.deletePosition?.id
            ),
          },
        },
      });
    },
  });

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagStage} />
          ),
          key: "comments",
        },
      ]}
      actions={<SelfActions type={"@mikro/stage"} object={id} />}
    >
      <div className="p-3 flex-grow flex flex-col">
        <div className="flex flex-row">
          <div className="flex">
            <SectionTitle>{data?.era?.name}</SectionTitle>
          </div>
          <div className="flex-grow" />
          <div className="flex text-white">
            {data?.era?.id && (
              <button
                type="button"
                onClick={() =>
                  pinStage({
                    variables: {
                      id: data?.era?.id || "",
                      pin: !data?.era?.pinned || false,
                    },
                  })
                }
              >
                {data?.era?.pinned ? <BsPinFill /> : <BsPinAngle />}
              </button>
            )}
          </div>
        </div>
        <div className="flex  @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="p-3 flex-1 bg-white border shadow mt-2 rounded">
            <div className="font-light mt-2 ">Starts At</div>
            <div className="text-md mt-2 ">
              {data?.era?.start && <Timestamp date={data?.era?.start} />}
            </div>
            <div className="font-light mt-2 ">Ends at</div>
            <div className="text-md mt-2 ">
              {data?.era?.start && <Timestamp date={data?.era?.start} />}
            </div>

            <div className="font-light mt-2 ">Tags</div>
            <div className="text-xl flex mb-2">
              {data?.era?.tags?.map((tag, index) => (
                <>
                  <span className="font-semibold mr-2">#{tag} </span>
                </>
              ))}
            </div>
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

        <SectionTitle> Timepoints </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.era?.timepoints?.filter(notEmpty).map((t, index) => (
            <TimepointCard timepoint={t} key={index} mates={[]} />
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};

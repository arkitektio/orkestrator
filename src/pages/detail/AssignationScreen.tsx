import { Maybe } from "graphql/jsutils/Maybe";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AssignationLogLevel,
  AssignationStatus,
  CommentableModels,
  DetailAssignationFragment,
  SharableModels,
  useDetailAssignationQuery,
} from "../../rekuest/api/graphql";
import {
  AssignWidgetsContainer,
  ReturnWidgetsContainer,
  WidgetsContainer,
} from "../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { TrackRiver } from "../../floating/track/TrackRiver";
import { FlussAssignation } from "../../fluss/components/FlussAssignation";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withRekuest } from "../../rekuest";
import { notEmpty } from "../../floating/utils";
import { AssignationPuls } from "../../rekuest/components/generic/StatusPulse";
import { UserEmblem } from "../../lok/components/UserEmblem";
import { UserImage } from "../../rekuest/components/ReserveForm";
import { RekuestShare } from "../../components/social/RekuestShare";
import { RekuestKomments } from "../../komment/RekuestKomments";

export type AssignationToolbarProps = {
  assignation: Maybe<DetailAssignationFragment>;
};

const AssignationToolbar: React.FC<AssignationToolbarProps> = ({
  assignation,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const navigate = useNavigate();

  return (
    <div className="flex flex-row w-100 mb-2">
      <div className="flex-initial">
        <div className="flex flex-row">
          <div className="font-light text-2xl">
            <SectionTitle>{assignation?.reservation?.node?.name}</SectionTitle>
          </div>
          <div className="font-light mt-auto ml-4 "></div>
        </div>
      </div>
      <div className="flex-grow"></div>
    </div>
  );
};

export type IAssignationProps = {
  id: string;
};

export const AssignationDetail: React.FC<IAssignationProps> = ({
  id,
}: IAssignationProps) => {
  const { data, subscribeToMore } = withRekuest(useDetailAssignationQuery)({
    variables: { id: id },
  });

  if (data?.assignation?.reservation?.node?.interfaces?.includes("workflow"))
    return <FlussAssignation assignation={data?.assignation} />;

  return (
    <PageLayout
      sidebar={
        <div className="p-2 flex h-full">
          {data?.assignation?.id && (
            <div className="flex flex-grow flex-col">
              <div className="flex-1">
                <RekuestKomments
                  model={CommentableModels.FacadeAssignation}
                  id={data?.assignation?.id}
                />
              </div>
              <div className="flex-1">
                <RekuestShare
                  type={SharableModels.FacadeAssignation}
                  object={data?.assignation?.id}
                />
              </div>
            </div>
          )}
        </div>
      }
    >
      <div className="flex-initial">
        <AssignationToolbar assignation={data?.assignation} />
      </div>
      <div className="flex-1 flex flex-col bg-slate-200 rounded rounded-md p-3">
        <div className="flex-1">
          <div className="flex flex-row">
            <div className="flex-initial my-auto mr-2">Run by</div>
            <div className="flex-initial relative  my-auto">
              {data?.assignation?.creator?.sub && (
                <UserImage sub={data?.assignation?.creator?.sub} />
              )}
            </div>
          </div>

          <div className="flex flex-row">
            <div className="flex-initial">
              {data?.assignation?.status}{" "}
              <AssignationPuls status={data?.assignation?.status} />
              {data?.assignation?.statusmessage}
            </div>
          </div>
        </div>
        {data?.assignation?.log && data.assignation.log.length > 0 && (
          <div className="flex-1  grid grid-cols-1 bg-gray-700 rounded p-5 overflow-scroll">
            {data?.assignation?.log?.map((log) => (
              <div className="cols-span-1 text-white">
                {log?.level === AssignationLogLevel.Info && (
                  <span className="text-gray-300 font-semibold">
                    INFO : {log?.message}{" "}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Debug && (
                  <span className="text-yellow-300 font-semibold">
                    DEBUG : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Warn && (
                  <span className="text-yellow-200 font-semibold">
                    WARN : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Error && (
                  <span className="text-red-800 font-semibold">
                    CRITICAL : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Yield && (
                  <span className="text-yellow-200 font-semibold">
                    YIELD : {log?.message}
                  </span>
                )}
                {log?.level === AssignationLogLevel.Return && (
                  <span className="text-green-200 font-semibold">
                    RETURN : {log?.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="@lg:flex-row flex-shrink flex flex-col gap-2 mt-2">
        <div className="flex-1 flex-col flex gap-2">
          <div className="flex-initial">
            <SectionTitle>Ins</SectionTitle>
          </div>
          <div className="flex-grow">
            {data?.assignation?.reservation?.node?.args && (
              <WidgetsContainer
                ports={data?.assignation?.reservation?.node?.args.filter(
                  notEmpty
                )}
                values={data?.assignation?.args || []}
              />
            )}
          </div>
        </div>

        <div className="flex-1 flex-col flex gap-2">
          <div className="flex-initial">
            <SectionTitle>Outs</SectionTitle>
          </div>
          {data?.assignation?.reservation?.node?.returns && (
            <WidgetsContainer
              ports={data?.assignation?.reservation?.node?.returns.filter(
                notEmpty
              )}
              values={data?.assignation?.returns || []}
            />
          )}
        </div>
      </div>

      <div className="flex-grow"></div>
    </PageLayout>
  );
};

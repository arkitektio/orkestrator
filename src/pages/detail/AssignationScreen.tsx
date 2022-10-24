import { Maybe } from "graphql/jsutils/Maybe";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AssignationLogLevel,
  AssignationStatus,
  DetailAssignationFragment,
  useDetailAssignationQuery,
} from "../../rekuest/api/graphql";
import { ReturnWidgetsContainer } from "../../rekuest/widgets/containers/ReturnWidgetsContainer";
import { TrackRiver } from "../../floating/track/TrackRiver";
import { FlussAssignation } from "../../fluss/components/FlussAssignation";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { withRekuest } from "../../rekuest";

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
    <div className="flex flex-row w-100">
      <div className="flex-initial">
        <div className="flex flex-row">
          <div className="font-light text-2xl">
            <SectionTitle>{assignation?.reservation?.node?.name}</SectionTitle>
          </div>
          <div className="font-light mt-auto ml-4 ">
            <SectionTitle>
              {assignation?.reservation?.node?.package}/
              {assignation?.reservation?.node?.interface}:
              {assignation?.provision?.template?.version ||
                "No Provision Yet Assigned"}{" "}
              run on{" "}
              {assignation?.provision?.agent?.name ||
                "No Provision Yet Assigned"}
            </SectionTitle>
          </div>
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
    <PageLayout>
      <div className="flex-initial">
        <AssignationToolbar assignation={data?.assignation} />
      </div>
      <div className="flex-grow">
        <div className="grid grid-cols-1 bg-gray-700 rounded p-5 mt-2 overflow-scroll">
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
      </div>
    </PageLayout>
  );
};

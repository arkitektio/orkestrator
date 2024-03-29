import React from "react";
import { ListRender } from "../layout/SectionTitle";
import { RekuestAssignation } from "../linker";
import { useAssignationMate } from "../mates/assignation/useAssignationMates";
import { withRekuest } from "../rekuest";
import { AssignationStatus, useRequestsQuery } from "../rekuest/api/graphql";
import { useSettings } from "../settings/settings-context";
export type IMyReservationsProps = {};

const colorFromStatus = (status: AssignationStatus | undefined) => {
  switch (status) {
    case AssignationStatus.Done:
      return "border-green-300 text-green-300 shadow-green-200/20";
    case AssignationStatus.Cancelled:
      return "border-yellow-100 text-yellow-100";
    case AssignationStatus.Yield:
      return "border-cyan-400";
    case AssignationStatus.Returned:
      return "border-green-300";
    case AssignationStatus.Error:
      return "border-green-100";
    case AssignationStatus.Canceling:
      return "border-yellow-100 text-yellow-100 animate-pulse";
    case AssignationStatus.Assigned:
      return "border-orange-300";
    case AssignationStatus.Critical:
      return "border--300";
    default:
      return "border-white";
  }
};

const MyAssignations: React.FC<IMyReservationsProps> = () => {
  const { settings } = useSettings();
  const { data, error } = withRekuest(useRequestsQuery)({
    variables: {
      instanceId: settings.instanceId,
    },
  });

  const assignationMate = useAssignationMate();

  return (
    <>
      <ListRender
        array={data?.requests?.filter(
          (ass) =>
            ![
              AssignationStatus.Returned,
              AssignationStatus.Cancelled,
              AssignationStatus.Acknowledged,
              AssignationStatus.Done,
            ].includes(ass?.status || AssignationStatus.Cancelled)
        )}
        title="On Going Tasks"
      >
        {(ass, index) => (
          <RekuestAssignation.Smart
            object={ass.id}
            dropClassName={() =>
              `relative rounded shadow-xl border  shadow-md bg-center bg-cover group text-white ${colorFromStatus(
                ass?.status
              )}`
            }
            key={index}
            mates={[assignationMate(ass)]}
            dropStyle={() => ({
              background: `center bottom linear-gradient(to right, var(--color-primary-300) ${
                ass.progress ? Math.floor(ass.progress) : 0
              }%, rgba(0,0,0,0.95) ${
                ass.progress ? Math.floor(ass.progress) : 0
              }% ${ass.progress ? Math.floor(100 - ass.progress) : 100}%)`,
            })}
          >
            <div
              className={`absolute top-0 left-0 h-full bg-orange-300 border-orange-300 rounded transition-width duration-100 ease-in-out`}
              style={{
                zIndex: -100,
                width: `${ass.progress ? Math.floor(ass.progress) : 0}%`,
              }}
            ></div>
            <div className="p-2">
              <RekuestAssignation.DetailLink
                object={ass.id}
                className="text-xl font-light mb-2 cursor-pointer"
              >
                {ass?.reservation?.title || ass?.reservation?.node?.name}{" "}
              </RekuestAssignation.DetailLink>
            </div>
            <div className="ml-2 pb-2 text-sm"></div>
          </RekuestAssignation.Smart>
        )}
      </ListRender>
      <ListRender
        array={data?.requests?.filter((ass) =>
          [
            AssignationStatus.Returned,
            AssignationStatus.Cancelled,
            AssignationStatus.Done,
          ].includes(ass?.status || AssignationStatus.Cancelled)
        )}
        title="Done Tasks"
      >
        {(ass, index) => (
          <RekuestAssignation.Smart
            object={ass.id}
            key={index}
            dropClassName={() =>
              `rounded shadow-md border text-white ${colorFromStatus(
                ass?.status
              )}`
            }
            mates={[assignationMate(ass)]}
          >
            <div className="p-2 z-100">
              <RekuestAssignation.DetailLink
                className="text-xl font-light mb-2 cursor-pointer"
                object={ass.id}
              >
                {ass?.reservation?.title || ass?.reservation?.node?.name}{" "}
              </RekuestAssignation.DetailLink>
              {ass.statusmessage}
            </div>
            <div className="ml-2 pb-2 text-sm"></div>
          </RekuestAssignation.Smart>
        )}
      </ListRender>
    </>
  );
};

export { MyAssignations };

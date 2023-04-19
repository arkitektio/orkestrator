import React from "react";
import { useNavigate } from "react-router";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { Assignation } from "../linker";
import { useAssignationMate } from "../mates/assignation/useAssignationMates";
import { AssignationStatus } from "../rekuest/api/graphql";
import { usePostman } from "../rekuest/postman/graphql/postman-context";
import { ResponsiveContainerGrid } from "./layout/ResponsiveContainerGrid";
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
  const { requests, unassign, ack } = usePostman();

  const navigate = useNavigate();
  const assignationMate = useAssignationMate();

  return (
    <>
      <SectionTitle>Ongoing Tasks</SectionTitle>
      <div className="mt-2 mb-4">
        <ResponsiveContainerGrid>
          {!requests && (
            <div
              key={1}
              className={`max-w-sm rounded overflow-hidden p-2 font-light shadow-md blink animate-pulse bg-gray-400`}
            >
              Loading...
            </div>
          )}
          {requests?.requests
            ?.filter(
              (ass) =>
                ![
                  AssignationStatus.Returned,
                  AssignationStatus.Cancelled,
                  AssignationStatus.Acknowledged,
                  AssignationStatus.Done,
                ].includes(ass?.status || AssignationStatus.Cancelled)
            )
            .filter(notEmpty)
            .map((ass, index) => (
              <Assignation.Smart
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
                  <Assignation.DetailLink
                    object={ass.id}
                    className="text-xl font-light mb-2 cursor-pointer"
                  >
                    {ass?.reservation?.title || ass?.reservation?.node?.name}{" "}
                  </Assignation.DetailLink>
                </div>
                <div className="ml-2 pb-2 text-sm"></div>
              </Assignation.Smart>
            ))}
        </ResponsiveContainerGrid>
      </div>
      <SectionTitle>Done Tasks</SectionTitle>
      <div className="mt-2 mb-4">
        <ResponsiveContainerGrid>
          {!requests && (
            <div
              key={1}
              className={`relative rounded overflow-hidden p-2 font-light shadow-md blink animate-pulse bg-gray-400`}
            >
              Loading...
            </div>
          )}
          {requests?.requests
            ?.filter((ass) =>
              [
                AssignationStatus.Returned,
                AssignationStatus.Cancelled,
                AssignationStatus.Done,
              ].includes(ass?.status || AssignationStatus.Cancelled)
            )
            .filter(notEmpty)
            .map((ass, index) => (
              <Assignation.Smart
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
                  <Assignation.DetailLink
                    className="text-xl font-light mb-2 cursor-pointer"
                    object={ass.id}
                  >
                    {ass?.reservation?.title || ass?.reservation?.node?.name}{" "}
                  </Assignation.DetailLink>
                  {ass.statusmessage}
                </div>
                <div className="ml-2 pb-2 text-sm"></div>
              </Assignation.Smart>
            ))}
        </ResponsiveContainerGrid>
      </div>
    </>
  );
};

export { MyAssignations };

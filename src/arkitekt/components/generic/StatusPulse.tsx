import { Maybe } from "graphql/jsutils/Maybe";
import {
  AgentStatus,
  AssignationStatus,
  ProvisionStatus,
  ReservationStatus,
} from "../../api/graphql";

export const StatusPulse: React.FC<{
  status: Maybe<ReservationStatus>;
}> = ({ status }) => {
  switch (status) {
    case ReservationStatus.Active:
      return (
        <div className="flex flex-row ">
          {" "}
          Active{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      );
    case ReservationStatus.Critical:
      return (
        <div className="flex flex-row ">
          {" "}
          Critical{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      );
    case ReservationStatus.Waiting:
      return (
        <div className="flex flex-row ">
          {" "}
          Waiting{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
        </div>
      );
    case ReservationStatus.Error:
      return (
        <div className="flex flex-row ">
          {" "}
          Error{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      );
    case ReservationStatus.Ended:
      return (
        <div className="flex flex-row ">
          {" "}
          Ended{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
          </span>
        </div>
      );
    case ReservationStatus.Cancelled:
      return (
        <div className="flex flex-row ">
          {" "}
          Done{" "}
          <span className="my-auto ml-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-800"></span>
          </span>
        </div>
      );

    default:
      return <></>;
  }
};

export const AssignationPuls: React.FC<{
  status: Maybe<AssignationStatus>;
}> = ({ status }) => {
  switch (status) {
    case AssignationStatus.Received:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full opacity-75 bg-purple-300"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
        </span>
      );
    case AssignationStatus.Assigned:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-gray-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
        </span>
      );
    case AssignationStatus.Critical:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );
    case AssignationStatus.Yield:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      );
    case AssignationStatus.Returned:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case AssignationStatus.Done:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case AssignationStatus.Cancelled:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );

    default:
      return <></>;
  }
};

export const ProvisionPulse: React.FC<{
  status: Maybe<ProvisionStatus>;
}> = ({ status }) => {
  switch (status) {
    case ProvisionStatus.Active:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case ProvisionStatus.Lost:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );
    case ProvisionStatus.Critical:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );
    case ProvisionStatus.Pending:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );
    case ProvisionStatus.Ended:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
        </span>
      );
    case ProvisionStatus.Cancelled:
      return (
        <span className="flex">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );
    case ProvisionStatus.Providing:
      return (
        <span className="flex">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );

    default:
      return <></>;
  }
};

export const ReservationPulse: React.FC<{
  status: Maybe<ReservationStatus>;
}> = ({ status }) => {
  switch (status) {
    case ReservationStatus.Active:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case ReservationStatus.Critical:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );
    case ReservationStatus.Ended:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span
            className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"
            aria-label={status}
          ></span>
        </span>
      );
    case ReservationStatus.Routing:
      return (
        <span className="flex">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );
    case ReservationStatus.Cancelled:
      return (
        <span className="flex">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );
    case ReservationStatus.Providing:
      return (
        <span className="flex">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );
    case ReservationStatus.Disconnect:
      return (
        <span className="flex">
          <span
            className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"
            aria-label={status}
          ></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );

    default:
      return <>{status}</>;
  }
};

export const AgentPulse: React.FC<{
  status: Maybe<AgentStatus>;
}> = ({ status }) => {
  switch (status) {
    case AgentStatus.Active:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case AgentStatus.Disconnected:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      );
    case AgentStatus.Vanilla:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
        </span>
      );

    default:
      return <>{status}</>;
  }
};

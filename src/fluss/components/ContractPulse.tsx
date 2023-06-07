import { ContractStatus } from "../api/graphql";

export const ContractPulse: React.FC<{
  status: ContractStatus | null | undefined;
}> = ({ status }) => {
  switch (status) {
    case ContractStatus.Active:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      );
    case ContractStatus.Inactive:
      return (
        <span className="my-auto ml-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      );

    default:
      return <></>;
  }
};

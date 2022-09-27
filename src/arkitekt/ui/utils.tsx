import { ProvisionStatus } from "../api/graphql";

export const colorFromProvisionStatus = (
  status: ProvisionStatus | undefined
): string => {
  switch (status) {
    case ProvisionStatus.Active:
      return "text-md border-green-300 text-green-300 shadow-green-200/20";
    case ProvisionStatus.Inactive:
      return "bg-yellow-100 border-yellow-300";
    case ProvisionStatus.Ended:
      return "bg-gray-100";
    case ProvisionStatus.Lost:
      return "animate-pulse text-md border-red-300 text-red-300 shadow-red-200/20";
    case ProvisionStatus.Cancelled:
      return "bg-gray-100";
    case ProvisionStatus.Canceling:
      return "bg-yellow-100 animate-pulse border-yellow-300";
    case ProvisionStatus.Providing:
      return "bg-yellow-100 border-yellow-500";
    default:
      return "bg-white";
  }
};

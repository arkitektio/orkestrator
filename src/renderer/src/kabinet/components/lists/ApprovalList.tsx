import { createList } from "@/core/layout/createList";
import { KabinetApproval } from "@/core/linkers";
import { useListReleaseApprovalsQuery } from "../../api/graphql";
import ApprovalCard from "../cards/ApprovalCard";

const ApprovalList = createList({
  useHook: useListReleaseApprovalsQuery,
  dataKey: "releaseApprovals",
  ItemComponent: ApprovalCard,
  title: "Approvals",
  smart: KabinetApproval,
  // Unlike the other lists, an empty one says how to get the first.
  autoHide: false,
  emptyTitle: "No approval",
  emptyDescription: "No release is approved to run yet. Installing an app from the App Store approves it.",
  minItemWidth: 272,
});

export default ApprovalList;

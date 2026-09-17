import { createList } from "@/components/layout/createList";
import { RekuestAction } from "@/linkers";
import { useBrowseActionsQuery } from "@/rekuest/api/graphql";
import ActionCard from "../cards/ActionCard";

// The catalog on the Actions page. Unlike `ActionList` it never hides itself:
// on a filtered page "nothing matches" is an answer the reader needs to see.
const ActionBrowseList = createList({
  useHook: useBrowseActionsQuery,
  dataKey: "actions",
  ItemComponent: ActionCard,
  title: "Actions",
  smart: RekuestAction,
  autoHide: false,
  minItemWidth: 240,
  emptyTitle: "No actions found",
  emptyDescription: "No action matches these filters.",
});

export default ActionBrowseList;

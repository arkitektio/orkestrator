import { createList } from "@/core/components/layout/createList";
import { RekuestAction } from "@/core/linkers";
import {
  useAllActionsQuery
} from "@/rekuest/api/graphql";
import ActionCard from "../cards/ActionCard";


const ActionList = createList(
  {
    useHook: useAllActionsQuery,
    dataKey: "actions",
    ItemComponent: ActionCard,
    title: "Actions",
    smart: RekuestAction,
    // The card carries badges and an availability row; the default column
    // ladder squeezes it too narrow for those.
    minItemWidth: 220,
  }
)

export default ActionList

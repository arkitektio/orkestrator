import { createList } from "@/core/layout/createList";
import { RekuestMemoryShelve } from "@/core/linkers";
import { useMemoryShelvesQuery } from "@/rekuest/api/graphql";
import MemoryShelveCard from "../cards/MemoryShelveCard";

const TList = createList({
  useHook: useMemoryShelvesQuery,
  dataKey: "memoryShelves",
  ItemComponent: MemoryShelveCard,
  title: "Memory shelves",
  smart: RekuestMemoryShelve,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No memory shelves yet",
});

export default TList;

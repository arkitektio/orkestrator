import { createList } from "@/core/layout/createList";
import { KabinetBackend } from "@/core/linkers";
import { useListBackendsQuery } from "../../api/graphql";
import BackendCard from "../cards/BackendCard";

const BackendList = createList({
  useHook: useListBackendsQuery,
  dataKey: "backends",
  ItemComponent: BackendCard,
  title: "Backends",
  smart: KabinetBackend,
  emptyTitle: "No backend",
  emptyDescription: "A backend appears once a deployer connects to Kabinet.",
  minItemWidth: 272,
});

export default BackendList;

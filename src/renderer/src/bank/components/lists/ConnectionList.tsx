import { createList } from "@/core/layout/createList";
import { BankConnection } from "@/bank/linkers";
import { useListBankConnectionsQuery } from "../../api/graphql";
import ConnectionCard from "../cards/ConnectionCard";

const ConnectionList = createList({
  useHook: useListBankConnectionsQuery,
  dataKey: "bankConnections",
  ItemComponent: ConnectionCard,
  title: "Connections",
  emptyTitle: "No banks linked",
  smart: BankConnection,
  minItemWidth: 240,
});

export default ConnectionList;

import { createList } from "@/core/layout/createList";
import { useListOutboxQuery } from "../../api/graphql";
import { OutgoingMail } from "../../linkers";
import OutgoingCard from "../cards/OutgoingCard";

const OutboxList = createList({
  useHook: useListOutboxQuery,
  dataKey: "outbox",
  ItemComponent: OutgoingCard,
  title: "Sent mail",
  emptyTitle: "Nothing sent yet",
  smart: OutgoingMail,
  minItemWidth: 720,
  defaultLimit: 50,
});

export default OutboxList;

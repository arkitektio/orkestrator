import { createList } from "@/core/layout/createList";
import { KraphTerm } from "@/core/linkers";
import { useListTermsQuery } from "../../api/graphql";
import TermCard from "../cards/TermCard";

const TermList = createList({
  useHook: useListTermsQuery,
  dataKey: "terms",
  ItemComponent: TermCard,
  title: "Terms",
  emptyTitle: "No terms",
  emptyDescription: "Words appear here when you declare them, or when a graph or a claim first uses one.",
  smart: KraphTerm,
  minItemWidth: 240,
  autoHide: false,
});

export default TermList;

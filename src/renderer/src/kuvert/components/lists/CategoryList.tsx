import { createList } from "@/core/layout/createList";
import { MailCategory } from "@/core/linkers";
import { useListCategoriesQuery } from "@/kuvert/api/graphql";
import CategoryCard from "../cards/CategoryCard";

const TList = createList({
  useHook: useListCategoriesQuery,
  dataKey: "categories",
  ItemComponent: CategoryCard,
  title: "Categories",
  smart: MailCategory,
  // A page of its own says so when there is nothing, instead of going blank.
  autoHide: false,
  emptyTitle: "No categories yet",
});

export default TList;

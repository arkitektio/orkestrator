import { createList } from "@/core/layout/createList";
import { BankCategory } from "@/bank/linkers";
import { useListCategoriesQuery } from "../../api/graphql";
import CategoryCard from "../cards/CategoryCard";

const CategoryList = createList({
  useHook: useListCategoriesQuery,
  dataKey: "categories",
  ItemComponent: CategoryCard,
  title: "Categories",
  emptyTitle: "No categories",
  smart: BankCategory,
  minItemWidth: 200,
});

export default CategoryList;

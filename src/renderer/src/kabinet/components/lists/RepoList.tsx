import { createList } from "@/core/layout/createList";
import { KabinetRepo } from "@/core/linkers";
import { useListReposQuery } from "../../api/graphql";
import RepoCard from "../cards/RepoCard";

const RepoList = createList({
  useHook: useListReposQuery,
  dataKey: "repos",
  ItemComponent: RepoCard,
  title: "Repos",
  smart: KabinetRepo,
  emptyTitle: "No repository",
  emptyDescription: "Add a GitHub repository or import one from a registry to list the apps it declares.",
  minItemWidth: 272,
});

export default RepoList;

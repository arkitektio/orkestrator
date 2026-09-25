import { createList } from "@/core/layout/createList";
import { MikroFolder } from "@/core/linkers";
import {
  FolderFilter,
  OffsetPaginationInput,
  useGetFoldersQuery,
} from "../../api/graphql";
import FolderCard from "../cards/FolderCard";

export type Props = {
  filters?: FolderFilter;
  pagination?: OffsetPaginationInput;
};


const TList = createList({
  useHook: useGetFoldersQuery,
  dataKey: "folders",
  ItemComponent: FolderCard,
  title: "Latest Folders",
  smart: MikroFolder,
});
export default TList;

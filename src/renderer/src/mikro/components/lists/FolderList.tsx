import { createList } from "@/components/layout/createList";
import { MikroFolder } from "@/linkers";
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

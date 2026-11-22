import { ListRender } from "@/core/layout/ListRender";
import { DokumentsFile } from "@/core/linkers";

import { Button } from "@/core/ui/button";
import { FileFilter, useListFilesQuery } from "@/dokuments/api/graphql";
import type { OffsetPaginationInput } from "@/core/layout/pagination";
import FileCard from "../cards/FileCard";

export type Props = {
  filters?: FileFilter;
  pagination?: OffsetPaginationInput;
};

/** One page of files; without a page asked for, the first 20 (never every file). */
const DEFAULT_LIMIT = 20;

const TList = ({ filters, pagination = { limit: DEFAULT_LIMIT } }: Props) => {
  const { data, refetch } = useListFilesQuery({
    variables: {
      filter: filters,
      pagination: pagination,
    },
  });

  return (
    <ListRender
      array={data?.files}
      title={
        <DokumentsFile.ListLink className="flex-0">Files</DokumentsFile.ListLink>
      }
      refetch={refetch}
      limit={pagination.limit ?? DEFAULT_LIMIT}
      actions={
        <DokumentsFile.NewButton
          className="flex-1"
        ><Button>x</Button></DokumentsFile.NewButton>
      }
    >
      {(ex) => <FileCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default TList;

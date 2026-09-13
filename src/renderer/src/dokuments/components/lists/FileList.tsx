import { ListRender } from "@/components/layout/ListRender";
import { DokumentsFile } from "@/linkers";

import { Button } from "@/components/ui/button";
import { FileFilter, useListFilesQuery } from "@/dokuments/api/graphql";
import { OffsetPaginationInput } from "@/lok-next/api/graphql";
import FileCard from "../cards/FileCard";

export type Props = {
  filters?: FileFilter;
  pagination?: OffsetPaginationInput;
};

const TList = ({ filters, pagination }: Props) => {
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
